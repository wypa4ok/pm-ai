import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "~/server/api/errors";
import { withAuth } from "~/server/api/middleware/auth";
import { prisma } from "~/server/db";
import { applyCors } from "~/server/api/middleware/cors";
import { rateLimit } from "~/server/api/middleware/rate-limit";
import * as tenancyService from "~/server/services/tenancy-service";
import { getUserRoles } from "~/server/services/user-roles";

const createSchema = z.object({
  unitId: z.string().uuid(),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()).optional().nullable(),
  notes: z.string().optional().nullable(),
  members: z.array(
    z.object({
      tenantId: z.string().uuid(),
      isPrimary: z.boolean().optional().default(false),
    })
  ).min(1, "At least one tenant member is required"),
});

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const unitId = searchParams.get("unitId") ?? undefined;
  const activeOnly = searchParams.get("active") === "true";
  const limit = Number(searchParams.get("limit") ?? "50");

  const where: any = {};

  // Filter by unit if specified
  if (unitId) {
    where.unitId = unitId;
  }

  // Filter for active tenancies (no end date or end date in future)
  if (activeOnly) {
    where.OR = [
      { endDate: null },
      { endDate: { gt: new Date() } },
    ];
  }

  const tenancies = await prisma.tenancy.findMany({
    where,
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
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
    },
    orderBy: {
      startDate: "desc",
    },
    take: Number.isFinite(limit) && limit > 0 ? limit : 50,
  });

  return NextResponse.json({
    tenancies: tenancies.map((tenancy) => ({
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
      })),
      tickets: tenancy.tickets,
      isActive: !tenancy.endDate || tenancy.endDate > new Date(),
      createdAt: tenancy.createdAt,
      updatedAt: tenancy.updatedAt,
    })),
  });
}

export async function POST(request: NextRequest) {
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
      "Only property owners can create tenancies",
      403
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      parsed.error.flatten().formErrors.join(", "),
      400
    );
  }

  const data = parsed.data;

  // Verify the unit exists
  const unit = await prisma.unit.findUnique({
    where: { id: data.unitId },
  });

  if (!unit) {
    return errorResponse("not_found", "Unit not found", 404);
  }

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

  // Create the tenancy with members using the service
  const tenancy = await tenancyService.createTenancy({
    unitId: data.unitId,
    startDate: data.startDate,
    endDate: data.endDate ?? null,
    notes: data.notes ?? null,
    members: data.members.map((m) => ({
      tenantId: m.tenantId,
      isPrimary: m.isPrimary ?? false,
    })),
  });

  // Fetch the created tenancy with includes for the response
  const tenancyWithDetails = await tenancyService.getTenancyWithDetails(tenancy.id);

  return NextResponse.json(
    {
      tenancy: {
        id: tenancyWithDetails!.id,
        unitId: tenancyWithDetails!.unitId,
        unit: tenancyWithDetails!.unit,
        startDate: tenancyWithDetails!.startDate,
        endDate: tenancyWithDetails!.endDate,
        notes: tenancyWithDetails!.notes,
        members: tenancyWithDetails!.members.map((member) => ({
          id: member.id,
          tenantId: member.tenantId,
          isPrimary: member.isPrimary,
          tenant: member.tenant,
        })),
        isActive: !tenancyWithDetails!.endDate || tenancyWithDetails!.endDate > new Date(),
        createdAt: tenancyWithDetails!.createdAt,
        updatedAt: tenancyWithDetails!.updatedAt,
      },
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
