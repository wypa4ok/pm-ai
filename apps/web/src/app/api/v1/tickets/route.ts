import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TicketCategory, TicketPriority, MessageChannel } from "@prisma/client";
import { errorResponse } from "../../../../../src/server/api/errors";
import { withAuth } from "../../../../../src/server/api/middleware/auth";
import { prisma } from "../../../../../src/server/db";
import { searchTickets } from "../../../../../src/server/search/tickets";
import { applyCors } from "../../../../../src/server/api/middleware/cors";
import { rateLimit } from "../../../../../src/server/api/middleware/rate-limit";

const createSchema = z.object({
  subject: z.string().min(2),
  description: z.string().optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  channel: z.nativeEnum(MessageChannel).optional(),
  tenantId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
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
  const limit = Number(searchParams.get("limit") ?? "50");

  const tickets = await searchTickets({
    status,
    category,
    channel,
    search,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 50,
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
        ticket.messages[0]?.snippet ??
        ticket.messages[0]?.bodyText ??
        ticket.messages[0]?.bodyHtml ??
        undefined,
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

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      parsed.error.flatten().formErrors.join(", "),
      400,
    );
  }

  const data = parsed.data;

  const ticket = await prisma.ticket.create({
    data: {
      subject: data.subject,
      description: data.description ?? null,
      category: data.category ?? undefined,
      priority: data.priority ?? undefined,
      channel: data.channel ?? undefined,
      ownerUserId: authed.auth.user.id,
      tenant: data.tenantId ? { connect: { id: data.tenantId } } : undefined,
      unit: data.unitId ? { connect: { id: data.unitId } } : undefined,
    },
    include: {
      tenant: true,
      unit: true,
      messages: {
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
  });

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
        latestMessageSnippet:
          ticket.messages[0]?.snippet ??
          ticket.messages[0]?.bodyText ??
          ticket.messages[0]?.bodyHtml ??
          undefined,
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
