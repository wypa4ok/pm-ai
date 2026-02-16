import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "~/server/api/errors";
import { withAuth } from "~/server/api/middleware/auth";
import { createTenantInvite } from "~/server/services/tenant-invite";
import { authorizeUnitOwnership } from "~/server/services/authorization";
import { getUserRoles } from "~/server/services/user-roles";

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  unitId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  // Get user roles from database
  const roles = await getUserRoles(authed.auth.user.id);
  if (!roles.includes("OWNER")) {
    return errorResponse("forbidden", "Owner role required", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      parsed.error.flatten().formErrors.join(", "),
      400,
    );
  }

  // Verify user owns the unit if unitId is provided
  if (parsed.data.unitId) {
    try {
      await authorizeUnitOwnership(authed.auth.user.id, parsed.data.unitId);
    } catch (error) {
      return errorResponse(
        "forbidden",
        error instanceof Error ? error.message : "You do not own this unit",
        403,
      );
    }
  }

  const invite = await createTenantInvite({
    ownerUserId: authed.auth.user.id,
    ownerEmail: authed.auth.user.email ?? undefined,
    ...parsed.data,
  });

  return NextResponse.json({
    tenantId: invite.tenant.id,
    inviteLink: invite.inviteLink,
    expiresAt: invite.expiresAt,
  });
}
