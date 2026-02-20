export const dynamic = "force-dynamic";

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
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return errorResponse(
        "configuration_error",
        "Authentication service not configured",
        500,
      );
    }

    // Create user with Supabase Admin API
    const signUpResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true, // Auto-confirm email since we have confirmation disabled
        user_metadata: name ? { name } : {},
      }),
    });

    const signUpData = await signUpResponse.json();

    console.log("Supabase signup response:", {
      ok: signUpResponse.ok,
      status: signUpResponse.status,
      hasUser: !!signUpData.user,
      hasSession: !!signUpData.session,
      confirmedAt: signUpData.user?.confirmed_at,
      error: signUpData.error,
      errorDescription: signUpData.error_description,
      fullResponse: JSON.stringify(signUpData, null, 2),
    });

    if (!signUpResponse.ok) {
      // If user already exists, try to sign them in instead
      if (signUpData.error_code === "email_exists") {
        console.log("User already exists, attempting to sign in instead");
        const signInResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({ email, password }),
        });

        const signInData = await signInResponse.json();

        if (signInResponse.ok && signInData.access_token) {
          // Successfully signed in - set cookies and return
          const cookieStore = await cookies();

          cookieStore.set("sb-access-token", signInData.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: signInData.expires_in || 3600,
            path: "/",
          });

          if (signInData.refresh_token) {
            cookieStore.set("sb-refresh-token", signInData.refresh_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 60 * 60 * 24 * 30,
              path: "/",
            });
          }

          return NextResponse.json({
            success: true,
            requiresEmailConfirmation: false,
            user: {
              id: signInData.user.id,
              email: signInData.user.email,
              name: signInData.user.user_metadata?.name,
            },
          });
        } else {
          // Sign in failed - user exists but wrong password
          return errorResponse(
            "signup_failed",
            "An account with this email already exists. Please use the correct password or try logging in.",
            400,
          );
        }
      }

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
    // Only require email confirmation if user is not confirmed AND no session exists
    if (!signUpData.session && !signUpData.user.confirmed_at) {
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

    // If user is confirmed but no session, try to create a session by signing in
    if (!signUpData.session && signUpData.user.confirmed_at) {
      console.log("User confirmed but no session - attempting to sign in");
      const signInResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ email, password }),
      });

      const signInData = await signInResponse.json();
      if (signInData.session) {
        signUpData.session = signInData.session;
      }
    }

    // Set session cookies if session is available
    if (signUpData.session) {
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
    } else {
      // No session even after trying to sign in - this is unexpected
      console.error("No session available after signup and sign in attempt");
      return errorResponse(
        "signup_failed",
        "Failed to create session. Please try logging in.",
        500,
      );
    }
  } catch (error) {
    console.error("Signup error:", error);
    return errorResponse("internal_error", "Signup failed", 500);
  }
}
