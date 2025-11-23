import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../../src/server/db";
import { errorResponse } from "../../../../../../src/server/api/errors";

const schema = z.object({
  tenantId: z.string().uuid(),
  token: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      parsed.error.flatten().formErrors.join(", "),
      400,
    );
  }

  const { tenantId, token, userId } = parsed.data;

  const invite = await prisma.tenantInvite.findFirst({
    where: {
      tenantId,
      token,
      claimedAt: null,
    },
    include: {
      tenant: true,
    },
  });

  if (!invite) {
    return errorResponse(
      "not_found",
      "Invite not found or already claimed",
      404,
    );
  }

  if (new Date() > invite.expiresAt) {
    return errorResponse("invalid_request", "Invite has expired", 400);
  }

  if (invite.tenant.userId && invite.tenant.userId !== userId) {
    return errorResponse(
      "conflict",
      "This tenant is already linked to a different user",
      409,
    );
  }

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: tenantId },
      data: { userId },
    }),
    prisma.tenantInvite.update({
      where: { id: invite.id },
      data: { claimedAt: new Date() },
    }),
    prisma.ticket.updateMany({
      where: {
        tenantId,
        tenantUserId: null,
      },
      data: {
        tenantUserId: userId,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    tenant: {
      id: invite.tenant.id,
      firstName: invite.tenant.firstName,
      lastName: invite.tenant.lastName,
      email: invite.tenant.email,
    },
  });
}
