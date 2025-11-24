import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../src/server/db";
import { fetchSupabaseUser } from "../../../../../server/session/role";

/**
 * GET /api/v1/auth/roles
 * Returns the user's roles based on database relationships
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sb-access-token")?.value;

    if (!accessToken) {
      return NextResponse.json({ roles: [] }, { status: 401 });
    }

    const user = await fetchSupabaseUser(accessToken);
    if (!user) {
      return NextResponse.json({ roles: [] }, { status: 401 });
    }

    const roles: string[] = [];

    // Check if user is a tenant
    const tenant = await prisma.tenant.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (tenant) {
      roles.push("TENANT");
    }

    // Check if user is a landlord
    const ownerTicket = await prisma.ticket.findFirst({
      where: { ownerUserId: user.id },
      select: { id: true },
    });

    if (ownerTicket) {
      roles.push("OWNER");
    }

    // Default to OWNER if no roles found
    if (roles.length === 0) {
      roles.push("OWNER");
    }

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ roles: ["OWNER"] }, { status: 500 });
  }
}
