import { prisma } from "../db";

type ResponseCreateParamsTool = {
  type: "function";
  name: string;
  description?: string | null;
  strict: boolean | null;
  parameters: Record<string, unknown> | null;
};

export const CONVERSATION_TOOLS: ResponseCreateParamsTool[] = [
  {
    type: "function",
    name: "get_ticket_details",
    description:
      "Retrieve the current state of a ticket including its messages, tenant info, and unit info.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["ticketId"],
      properties: {
        ticketId: { type: "string", format: "uuid" },
      },
    },
  },
  {
    type: "function",
    name: "get_property_details",
    description:
      "Retrieve property/unit details including address and owner information.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["ticketId"],
      properties: {
        ticketId: { type: "string", format: "uuid" },
      },
    },
  },
  {
    type: "function",
    name: "get_tenant_history",
    description:
      "Retrieve other tickets from the same tenant to detect patterns or recurring issues.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["ticketId"],
      properties: {
        ticketId: { type: "string", format: "uuid" },
      },
    },
  },
];

export type ConversationToolName =
  | "get_ticket_details"
  | "get_property_details"
  | "get_tenant_history";

export async function executeConversationTool(
  name: ConversationToolName,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "get_ticket_details":
      return getTicketDetails(args.ticketId as string);
    case "get_property_details":
      return getPropertyDetails(args.ticketId as string);
    case "get_tenant_history":
      return getTenantHistory(args.ticketId as string);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function getTicketDetails(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      tenant: true,
      unit: true,
      assignee: { select: { id: true, fullName: true, email: true } },
      messages: {
        orderBy: { sentAt: "desc" },
        take: 10,
        select: {
          id: true,
          direction: true,
          channel: true,
          visibility: true,
          subject: true,
          bodyText: true,
          sentAt: true,
        },
      },
      agentEvents: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          type: true,
          note: true,
          createdAt: true,
        },
      },
    },
  });

  if (!ticket) return { error: "Ticket not found" };

  return {
    id: ticket.id,
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    status: ticket.status,
    priority: ticket.priority,
    channel: ticket.channel,
    openedAt: ticket.openedAt,
    tenant: ticket.tenant
      ? {
          name: `${ticket.tenant.firstName} ${ticket.tenant.lastName}`,
          email: ticket.tenant.email,
          phone: ticket.tenant.phone,
        }
      : null,
    unit: ticket.unit
      ? {
          name: ticket.unit.name,
          address: `${ticket.unit.address1}${ticket.unit.address2 ? `, ${ticket.unit.address2}` : ""}, ${ticket.unit.city}, ${ticket.unit.state} ${ticket.unit.postalCode}`,
        }
      : null,
    assignee: ticket.assignee,
    messages: ticket.messages,
    recentAgentEvents: ticket.agentEvents,
  };
}

async function getPropertyDetails(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      unitId: true,
      unit: {
        include: {
          owner: { select: { id: true, fullName: true, email: true, phone: true } },
          tenancies: {
            where: { endDate: null },
            take: 5,
            include: {
              members: {
                include: {
                  tenant: {
                    select: { firstName: true, lastName: true, email: true, phone: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!ticket?.unit) return { error: "No unit associated with this ticket" };

  const unit = ticket.unit;
  return {
    unitName: unit.name,
    address: `${unit.address1}${unit.address2 ? `, ${unit.address2}` : ""}, ${unit.city}, ${unit.state} ${unit.postalCode}`,
    postalCode: unit.postalCode,
    owner: unit.owner,
    activeTenancies: unit.tenancies.map((t) => ({
      startDate: t.startDate,
      members: t.members.map((m) => ({
        name: `${m.tenant.firstName} ${m.tenant.lastName}`,
        email: m.tenant.email,
        phone: m.tenant.phone,
        isPrimary: m.isPrimary,
      })),
    })),
    notes: unit.notes,
  };
}

async function getTenantHistory(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { tenantId: true, id: true },
  });

  if (!ticket?.tenantId) return { error: "No tenant associated with this ticket" };

  const otherTickets = await prisma.ticket.findMany({
    where: {
      tenantId: ticket.tenantId,
      id: { not: ticket.id },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      subject: true,
      category: true,
      status: true,
      priority: true,
      openedAt: true,
      resolvedAt: true,
    },
  });

  return {
    tenantId: ticket.tenantId,
    currentTicketId: ticket.id,
    otherTickets,
    totalCount: otherTickets.length,
    patterns: {
      categories: countBy(otherTickets, (t) => t.category),
      statuses: countBy(otherTickets, (t) => t.status),
    },
  };
}

function countBy<T>(items: T[], fn: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const key = fn(item);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}
