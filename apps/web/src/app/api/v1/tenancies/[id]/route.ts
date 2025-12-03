import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "~/server/api/errors";
import { withAuth } from "~/server/api/middleware/auth";
import { applyCors } from "~/server/api/middleware/cors";
import { rateLimit } from "~/server/api/middleware/rate-limit";
import { prisma } from "~/server/db";
import { getUserRoles } from "~/server/services/user-roles";

const updateSchema = z.object({
  endDate: z.string().datetime().or(z.date()).optional().nullable(),
  notes: z.string().optional().nullable(),
  members: z
    .array(
      z.object({
        tenantId: z.string().uuid(),
        isPrimary: z.boolean().optional().default(false),
      })
    )
    .optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cors = applyCors(request, allowedOrigins());
  if (cors) return cors;

  const limited = rateLimit(request);
  if (limited) return limited;

  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  // Get user roles from database
  const roles = await getUserRoles(authed.auth.user.id);

  // Enforce OWNER role
  if (!roles.includes("OWNER")) {
    return errorResponse(
      "forbidden",
      "Only property owners can access tenancies",
      403
    );
  }

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: params.id },
    include: {
      unit: {
        select: {
          id: true,
          name: true,
          address1: true,
          address2: true,
          city: true,
          state: true,
          postalCode: true,
        },
      },
      members: {
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
        orderBy: {
          isPrimary: "desc",
        },
      },
      tickets: {
        select: {
          id: true,
          subject: true,
          status: true,
          priority: true,
          category: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!tenancy) {
    return errorResponse("not_found", "Tenancy not found", 404);
  }

  return NextResponse.json({
    tenancy: {
      id: tenancy.id,
      unitId: tenancy.unitId,
      unit: tenancy.unit,
      startDate: tenancy.startDate,
      endDate: tenancy.endDate,
      notes: tenancy.notes,
      members: tenancy.members.map((member) => ({
        id: member.id,
        tenantId: member.tenantId,
        isPrimary: member.isPrimary,
        tenant: member.tenant,
        createdAt: member.createdAt,
      })),
      tickets: tenancy.tickets,
      isActive: !tenancy.endDate || tenancy.endDate > new Date(),
      createdAt: tenancy.createdAt,
      updatedAt: tenancy.updatedAt,
    },
  });
}

export async function PATCH(
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
      "Only property owners can update tenancies",
      403
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      parsed.error.flatten().formErrors.join(", "),
      400
    );
  }

  const data = parsed.data;

  // Verify tenancy exists
  const existing = await prisma.tenancy.findUnique({
    where: { id: params.id },
    include: {
      members: true,
    },
  });

  if (!existing) {
    return errorResponse("not_found", "Tenancy not found", 404);
  }

  // If updating members, validate them
  if (data.members) {
    // Verify all tenants exist
    const tenants = await prisma.tenant.findMany({
      where: {
        id: {
          in: data.members.map((m) => m.tenantId),
        },
      },
    });

    if (tenants.length !== data.members.length) {
      return errorResponse(
        "invalid_request",
        "One or more tenant IDs are invalid",
        400
      );
    }

    // Ensure only one primary tenant
    const primaryCount = data.members.filter((m) => m.isPrimary).length;
    if (primaryCount > 1) {
      return errorResponse(
        "invalid_request",
        "Only one primary tenant is allowed per tenancy",
        400
      );
    }

    // If no primary specified and we have members, make the first one primary
    if (primaryCount === 0 && data.members.length > 0) {
      data.members[0].isPrimary = true;
    }
  }

  // Update the tenancy
  const updated = await prisma.tenancy.update({
    where: { id: params.id },
    data: {
      endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
      notes: data.notes !== undefined ? data.notes : undefined,
      // If members provided, replace them
      ...(data.members && {
        members: {
          deleteMany: {},
          create: data.members.map((member) => ({
            tenantId: member.tenantId,
            isPrimary: member.isPrimary ?? false,
          })),
        },
      }),
    },
    include: {
      unit: {
        select: {
          id: true,
          name: true,
          address1: true,
          address2: true,
          city: true,
          state: true,
          postalCode: true,
        },
      },
      members: {
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
        orderBy: {
          isPrimary: "desc",
        },
      },
      tickets: {
        select: {
          id: true,
          subject: true,
          status: true,
          priority: true,
          category: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return NextResponse.json({
    tenancy: {
      id: updated.id,
      unitId: updated.unitId,
      unit: updated.unit,
      startDate: updated.startDate,
      endDate: updated.endDate,
      notes: updated.notes,
      members: updated.members.map((member) => ({
        id: member.id,
        tenantId: member.tenantId,
        isPrimary: member.isPrimary,
        tenant: member.tenant,
        createdAt: member.createdAt,
      })),
      tickets: updated.tickets,
      isActive: !updated.endDate || updated.endDate > new Date(),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  });
}

function allowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
