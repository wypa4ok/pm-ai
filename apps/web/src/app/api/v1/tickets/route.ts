export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TicketCategory, TicketPriority, MessageChannel } from "@prisma/client";
import { errorResponse } from "../../../../../../../src/server/api/errors";
import { withAuth } from "../../../../../../../src/server/api/middleware/auth";
import { applyCors } from "../../../../../../../src/server/api/middleware/cors";
import { rateLimit } from "../../../../../../../src/server/api/middleware/rate-limit";
import * as ticketService from "../../../../../../../src/server/services/ticket-service";
import { getUserRoles } from "../../../../../../../src/server/services/user-roles";

const createSchema = z.object({
  subject: z.string().min(2),
  description: z.string().optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  channel: z.nativeEnum(MessageChannel).optional(),
  tenantId: z.string().uuid().optional(),
  tenancyId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  tenantUserId: z.string().uuid().optional(),
  attachments: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const cors = applyCors(request, allowedOrigins());
  if (cors) return cors;

  const limited = rateLimit(request);
  if (limited) return limited;

  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const channel = searchParams.get("channel") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const tenantId = searchParams.get("tenantId") ?? undefined;
  const tenancyId = searchParams.get("tenancyId") ?? undefined;
  const tenantEmail = searchParams.get("tenantEmail") ?? undefined;
  const tenantUserId = searchParams.get("tenantUserId") ?? undefined;

  // Parse pagination parameters
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const tickets = await ticketService.listTickets({
    status,
    category,
    channel,
    search,
    tenantId,
    tenancyId,
    tenantEmail,
    tenantUserId,
    limit,
    ownerUserId: authed.auth.user.id,
  });

  return NextResponse.json({
    tickets: tickets.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      channel: ticket.channel,
      openedAt: ticket.openedAt,
      tenantId: ticket.tenantId,
      unitId: ticket.unitId,
      latestMessageSnippet:
        ticket.messages[0]?.bodyText ??
        ticket.messages[0]?.bodyHtml ??
        undefined,
    })),
    pagination: {
      page,
      limit,
      hasMore: tickets.length === limit,
    },
  });
}

export async function POST(request: NextRequest) {
  const cors = applyCors(request, allowedOrigins());
  if (cors) return cors;

  const limited = rateLimit(request);
  if (limited) return limited;

  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    const fieldErrors = Object.entries(parsed.error.flatten().fieldErrors)
      .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
      .join("; ");
    const formErrors = parsed.error.flatten().formErrors.join(", ");
    const errorMessage = fieldErrors || formErrors || "Validation failed";
    console.error("Validation error:", errorMessage, "Input:", json);
    return errorResponse(
      "invalid_request",
      errorMessage,
      400,
    );
  }

  const data = parsed.data;

  // Get user roles from database
  const roles = await getUserRoles(authed.auth.user.id);

  // Determine if user is a tenant or owner
  const isTenant = roles.includes("TENANT") && !roles.includes("OWNER");

  let ownerUserId = authed.auth.user.id;
  let tenantId = data.tenantId;
  let unitId = data.unitId;
  let tenantUserId: string | undefined;

  if (isTenant) {
    // For tenant users, find their tenant record and associated info
    const { prisma } = await import("../../../../../../../src/server/db");
    const tenantRecord = await prisma.tenant.findFirst({
      where: { userId: authed.auth.user.id },
    });

    if (!tenantRecord) {
      return errorResponse(
        "forbidden",
        "Tenant account not properly linked",
        403,
      );
    }

    // Use tenant's info
    tenantId = tenantRecord.id;
    tenantUserId = authed.auth.user.id;

    // Get unit from tenant record if available
    if (!unitId && tenantRecord.unitId) {
      unitId = tenantRecord.unitId;
    }

    // For tenants, get the property owner from the unit
    if (unitId) {
      const { prisma: prismaClient } = await import("../../../../../../../src/server/db");
      const unit = await prismaClient.unit.findUnique({
        where: { id: unitId },
        select: { ownerUserId: true },
      });

      if (unit) {
        ownerUserId = unit.ownerUserId;
      } else {
        return errorResponse(
          "not_found",
          "Unit not found",
          404,
        );
      }
    } else {
      return errorResponse(
        "invalid_request",
        "Tenant must have an associated unit to create tickets",
        400,
      );
    }
  } else {
    // For owners creating tickets, use the tenantUserId from the request if provided
    if (data.tenantUserId) {
      tenantUserId = data.tenantUserId;
    }
  }

  const ticketInput = {
    subject: data.subject,
    description: data.description,
    category: data.category,
    priority: data.priority,
    channel: data.channel || "INTERNAL",
    ownerUserId,
    tenantId,
    tenancyId: data.tenancyId,
    unitId,
    tenantUserId,
  };
  console.log("Creating ticket with input:", ticketInput);

  const ticket = await ticketService.createTicket(ticketInput);

  return NextResponse.json(
    {
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
        channel: ticket.channel,
        openedAt: ticket.openedAt,
        tenantId: ticket.tenantId,
        unitId: ticket.unitId,
      },
    },
    { status: 201 },
  );
}

function allowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
