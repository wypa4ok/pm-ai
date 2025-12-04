import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "../../../../../../../../src/server/api/errors";
import { withAuth } from "../../../../../../../../src/server/api/middleware/auth";
import { createTenantInvite } from "../../../../../../../../src/server/services/tenant-invite";
import { deriveRoles } from "../../../../../../server/session/role";

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  unitId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  const roles = deriveRoles(authed.auth.user as any);
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
