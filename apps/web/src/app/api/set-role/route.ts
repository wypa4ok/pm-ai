import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACTIVE_ROLE_COOKIE } from "../../../server/session/role";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role } = body;

    if (!role || (role !== "OWNER" && role !== "TENANT")) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    cookieStore.set({
      name: ACTIVE_ROLE_COOKIE,
      value: role,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to set role" },
      { status: 500 }
    );
  }
}
