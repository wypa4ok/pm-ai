import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "~/server/api/errors";
import { withAuth } from "~/server/api/middleware/auth";
import { applyCors } from "~/server/api/middleware/cors";
import { rateLimit } from "~/server/api/middleware/rate-limit";
import { prisma } from "~/server/db";
import { createTenantInvite } from "~/server/services/tenant-invite";

const addMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  isPrimary: z.boolean().optional().default(false),
  sendInvite: z.boolean().optional().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cors = applyCors(request, allowedOrigins());
  if (cors) return cors;

  const limited = rateLimit(request);
  if (limited) return limited;

  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  // Enforce OWNER role
  if (!authed.auth.roles.includes("OWNER")) {
    return errorResponse(
      "forbidden",
      "Only property owners can add tenancy members",
      403
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = addMemberSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      parsed.error.flatten().formErrors.join(", "),
      400
    );
  }

  const data = parsed.data;

  // Verify tenancy exists
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: {
          tenant: true,
        },
      },
      unit: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!tenancy) {
    return errorResponse("not_found", "Tenancy not found", 404);
  }

  const email = data.email.trim().toLowerCase();

  // Check if tenant with this email already exists in this tenancy
  const existingMember = tenancy.members.find(
    (m) => m.tenant.email?.toLowerCase() === email
  );

  if (existingMember) {
    return errorResponse(
      "invalid_request",
      "This tenant is already a member of this tenancy",
      400
    );
  }

  // If setting as primary, ensure no other primary exists
  if (data.isPrimary) {
    const currentPrimary = tenancy.members.find((m) => m.isPrimary);
    if (currentPrimary) {
      // Unset current primary
      await prisma.tenancyMember.update({
        where: { id: currentPrimary.id },
        data: { isPrimary: false },
      });
    }
  }

  // Find or create tenant
  let tenant = await prisma.tenant.findFirst({
    where: { email },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email,
        unitId: tenancy.unitId,
      },
    });
  } else {
    // Update tenant info if exists
    tenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email,
      },
    });
  }

  // Add tenant to tenancy
  const member = await prisma.tenancyMember.create({
    data: {
      tenancyId: tenancy.id,
      tenantId: tenant.id,
      isPrimary: data.isPrimary,
    },
    include: {
      tenant: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          userId: true,
        },
      },
    },
  });

  // Send invite if requested and tenant doesn't have portal access yet
  let inviteLink: string | undefined;
  let inviteExpiresAt: Date | undefined;

  if (data.sendInvite && !tenant.userId) {
    try {
      const result = await createTenantInvite({
        ownerUserId: authed.auth.userId,
        ownerEmail: authed.auth.email,
        firstName: data.firstName,
        lastName: data.lastName,
        email,
        unitId: tenancy.unitId,
      });
      inviteLink = result.inviteLink;
      inviteExpiresAt = result.expiresAt;
    } catch (error) {
      console.error("Failed to send invite:", error);
      // Don't fail the request if invite fails
    }
  }

  return NextResponse.json(
    {
      member: {
        id: member.id,
        tenantId: member.tenantId,
        isPrimary: member.isPrimary,
        tenant: member.tenant,
        createdAt: member.createdAt,
      },
      inviteLink,
      inviteExpiresAt,
    },
    { status: 201 }
  );
}

function allowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
