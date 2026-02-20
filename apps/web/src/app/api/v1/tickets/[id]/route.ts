export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "../../../../../../../../src/server/api/errors";
import { withAuth } from "../../../../../../../../src/server/api/middleware/auth";
import { applyCors } from "../../../../../../../../src/server/api/middleware/cors";
import { rateLimit } from "../../../../../../../../src/server/api/middleware/rate-limit";
import { prisma } from "../../../../../../../../src/server/db";
import { getUserRoles } from "../../../../../../../../src/server/services/user-roles";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const cors = applyCors(request, allowedOrigins());
  if (cors) return cors;

  const limited = rateLimit(request);
  if (limited) return limited;

  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  // Get user roles to determine access permissions
  const roles = await getUserRoles(authed.auth.user.id);
  const isTenant = roles.includes("TENANT") && !roles.includes("OWNER");

  // Build where clause based on user role
  const whereClause: any = { id: params.id };

  if (isTenant) {
    // Tenants can only see tickets where they are the tenant user
    whereClause.tenantUserId = authed.auth.user.id;
  } else {
    // Owners can only see tickets they own
    whereClause.ownerUserId = authed.auth.user.id;
  }

  const ticket = await prisma.ticket.findFirst({
    where: whereClause,
    include: {
      tenant: true,
      unit: true,
      messages: {
        orderBy: { sentAt: "desc" },
        take: 20,
      },
    },
  });

  if (!ticket) {
    return errorResponse("not_found", "Ticket not found or you don't have access to it", 404);
  }

  return NextResponse.json({
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
      tenantName: ticket.tenant
        ? `${ticket.tenant.firstName} ${ticket.tenant.lastName}`
        : undefined,
      unitName: ticket.unit?.name ?? undefined,
      messages: ticket.messages.map((msg) => ({
        id: msg.id,
        direction: msg.direction,
        channel: msg.channel,
        subject: msg.subject,
        bodyText: msg.bodyText,
        bodyHtml: msg.bodyHtml,
        sentAt: msg.sentAt,
        attachments: msg.attachments,
      })),
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
