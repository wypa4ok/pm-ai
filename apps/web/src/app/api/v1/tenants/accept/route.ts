import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../../../../src/server/db";
import { errorResponse } from "../../../../../../../../src/server/api/errors";
import { invalidateUserRoleCache } from "../../../../../../../../src/server/services/user-roles";

const schema = z.object({
  tenantId: z.string().uuid(),
  token: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      console.error("Validation failed:", parsed.error.flatten());
      return errorResponse(
        "invalid_request",
        parsed.error.flatten().formErrors.join(", "),
        400,
      );
    }

    const { tenantId, token, userId } = parsed.data;
    console.log("Accept invite request:", { tenantId, token, userId });

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
    console.error("Invite not found:", { tenantId, token });
    return errorResponse(
      "not_found",
      "Invite not found or already claimed",
      404,
    );
  }

  console.log("Found invite:", {
    inviteId: invite.id,
    tenantEmail: invite.tenant.email,
    expiresAt: invite.expiresAt,
    currentUserId: invite.tenant.userId,
  });

  if (new Date() > invite.expiresAt) {
    console.error("Invite expired:", { expiresAt: invite.expiresAt });
    return errorResponse("invalid_request", "Invite has expired", 400);
  }

  if (invite.tenant.userId && invite.tenant.userId !== userId) {
    console.error("Tenant already linked:", {
      currentUserId: invite.tenant.userId,
      requestUserId: userId,
    });
    return errorResponse(
      "conflict",
      "This tenant is already linked to a different user",
      409,
    );
  }

  // Validate that the authenticated user's email matches the tenant's email
  // This prevents someone from claiming an invite meant for a different email
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseServiceKey) {
    try {
      console.log("Validating email match for user:", userId);
      const userResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        const authenticatedEmail = userData.email?.toLowerCase();
        const inviteEmail = invite.tenant.email?.toLowerCase();

        console.log("Email validation:", {
          authenticatedEmail,
          inviteEmail,
          match: authenticatedEmail === inviteEmail,
        });

        if (authenticatedEmail !== inviteEmail) {
          console.error("Email mismatch:", { authenticatedEmail, inviteEmail });
          return errorResponse(
            "email_mismatch",
            `This invite is for ${invite.tenant.email}. Please sign up or log in with that email address.`,
            403,
          );
        }
      } else {
        console.warn("Failed to fetch user from Supabase:", userResponse.status);
      }
    } catch (error) {
      console.warn("Could not verify email match:", error);
      // Continue without validation if Supabase call fails
    }
  } else {
    console.warn("Skipping email validation - Supabase credentials not configured");
  }

  console.log("Accepting invite - starting transaction");

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

  // Invalidate role cache - user is now a TENANT
  invalidateUserRoleCache(userId);

  // Update Supabase user metadata to include TENANT role
  if (supabaseUrl && supabaseServiceKey) {
    try {
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          app_metadata: {
            roles: ["TENANT"],
          },
        }),
      });
      console.log("✅ Updated user metadata with TENANT role");
    } catch (error) {
      console.warn("Failed to update user metadata:", error);
    }
  }

  console.log("✅ Invite accepted successfully:", {
    tenantId,
    userId,
    tenantEmail: invite.tenant.email,
  });

  return NextResponse.json({
    success: true,
    tenant: {
      id: invite.tenant.id,
      firstName: invite.tenant.firstName,
      lastName: invite.tenant.lastName,
      email: invite.tenant.email,
    },
  });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return errorResponse(
      "internal_error",
      error instanceof Error ? error.message : "Failed to accept invite",
      500,
    );
  }
}
