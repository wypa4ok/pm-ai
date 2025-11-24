import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { errorResponse } from "../../../../../../../../src/server/api/errors";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

/**
 * POST /api/v1/auth/signup
 * Creates a new user account with Supabase and sets session cookies
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "invalid_request",
        "Invalid signup data. Email and password (min 6 characters) are required.",
        400,
      );
    }

    const { email, password, name } = parsed.data;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse(
        "configuration_error",
        "Authentication service not configured",
        500,
      );
    }

    // Sign up with Supabase
    const signUpResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        email,
        password,
        data: name ? { name } : {},
      }),
    });

    const signUpData = await signUpResponse.json();

    console.log("Supabase signup response:", {
      ok: signUpResponse.ok,
      status: signUpResponse.status,
      hasUser: !!signUpData.user,
      hasSession: !!signUpData.session,
      error: signUpData.error,
      errorDescription: signUpData.error_description,
    });

    if (!signUpResponse.ok) {
      return errorResponse(
        "signup_failed",
        signUpData.error_description ||
          signUpData.msg ||
          signUpData.error ||
          "Failed to create account",
        400,
      );
    }

    // Validate that we got user data back
    if (!signUpData.user) {
      console.error("Supabase signup succeeded but no user returned:", signUpData);
      return errorResponse(
        "signup_failed",
        "Account creation failed - no user data returned",
        500,
      );
    }

    // Check if email confirmation is required
    if (!signUpData.session) {
      return NextResponse.json({
        success: true,
        requiresEmailConfirmation: true,
        message: "Please check your email to confirm your account.",
        user: {
          id: signUpData.user.id,
          email: signUpData.user.email,
        },
      });
    }

    // Set session cookies if session is available
    const cookieStore = await cookies();

    if (signUpData.session.access_token) {
      cookieStore.set("sb-access-token", signUpData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: signUpData.session.expires_in || 3600,
        path: "/",
      });
    }

    if (signUpData.session.refresh_token) {
      cookieStore.set("sb-refresh-token", signUpData.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
    }

    return NextResponse.json({
      success: true,
      requiresEmailConfirmation: false,
      user: {
        id: signUpData.user.id,
        email: signUpData.user.email,
        name: signUpData.user.user_metadata?.name,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return errorResponse("internal_error", "Signup failed", 500);
  }
}
