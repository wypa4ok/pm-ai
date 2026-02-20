export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { errorResponse } from "../../../../../../../../src/server/api/errors";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/**
 * POST /api/v1/auth/login
 * Authenticates user with Supabase and sets session cookies
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "invalid_request",
        "Invalid email or password format",
        400,
      );
    }

    const { email, password } = parsed.data;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse(
        "configuration_error",
        "Authentication service not configured",
        500,
      );
    }

    // Sign in with Supabase
    const loginResponse = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ email, password }),
      },
    );

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      return errorResponse(
        "invalid_credentials",
        loginData.error_description || "Invalid email or password",
        401,
      );
    }

    // Set session cookies
    const cookieStore = await cookies();

    if (loginData.access_token) {
      cookieStore.set("sb-access-token", loginData.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: loginData.expires_in || 3600,
        path: "/",
      });
    }

    if (loginData.refresh_token) {
      cookieStore.set("sb-refresh-token", loginData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: loginData.user.id,
        email: loginData.user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("internal_error", "Login failed", 500);
  }
}
