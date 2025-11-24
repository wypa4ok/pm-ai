import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../../../../src/server/db";
import { errorResponse } from "../../../../../../../../src/server/api/errors";

const schema = z.object({
  tenantId: z.string().uuid(),
  token: z.string().uuid(),
});

/**
 * GET /api/v1/tenants/invite-info
 * Returns basic invite information (email, name) without accepting the invite
 * This allows the invite accept page to pre-fill the signup form
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = schema.safeParse({
      tenantId: searchParams.get("tenantId"),
      token: searchParams.get("token"),
    });

    if (!parsed.success) {
      return errorResponse("invalid_request", "Invalid invite parameters", 400);
    }

    const { tenantId, token } = parsed.data;

    const invite = await prisma.tenantInvite.findFirst({
      where: {
        tenantId,
        token,
        claimedAt: null,
      },
      include: {
        tenant: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!invite) {
      return errorResponse("not_found", "Invite not found or already claimed", 404);
    }

    if (new Date() > invite.expiresAt) {
      return errorResponse("invalid_request", "Invite has expired", 400);
    }

    return NextResponse.json({
      success: true,
      email: invite.tenant.email,
      name: `${invite.tenant.firstName} ${invite.tenant.lastName}`.trim(),
    });
  } catch (error) {
    console.error("Error fetching invite info:", error);
    return errorResponse("internal_error", "Failed to fetch invite information", 500);
  }
}
