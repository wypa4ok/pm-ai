import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { errorResponse } from "../../../../../../../../src/server/api/errors";

/**
 * GET /api/v1/auth/me
 * Returns the current authenticated user's information
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sb-access-token")?.value;

    if (!accessToken) {
      return errorResponse("unauthorized", "Not authenticated", 401);
    }

    // Verify the token with Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse(
        "configuration_error",
        "Supabase configuration missing",
        500,
      );
    }

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      return errorResponse("unauthorized", "Invalid or expired session", 401);
    }

    const userData = await userResponse.json();

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.user_metadata?.name,
      },
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return errorResponse(
      "internal_error",
      "Failed to fetch user information",
      500,
    );
  }
}
