export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/v1/auth/logout
 * Clears all authentication cookies and logs the user out
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Clear all session cookies
    cookieStore.delete("sb-access-token");
    cookieStore.delete("sb-refresh-token");
    cookieStore.delete("active_role");

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Logout failed",
      },
      { status: 500 },
    );
  }
}
