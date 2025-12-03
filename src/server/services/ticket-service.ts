import { prisma } from "../db";
import type { TicketCategory, TicketPriority, MessageChannel } from "@prisma/client";
import { searchTickets } from "../search/tickets";

export type CreateTicketInput = {
  subject: string;
  description?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  channel?: MessageChannel;
  tenantId?: string;
  unitId?: string;
  ownerUserId: string;
};

export type SearchTicketsInput = {
  status?: string;
  category?: string;
  channel?: string;
  search?: string;
  limit?: number;
  ownerUserId: string;
  tenantId?: string;
  tenancyId?: string;
  tenantEmail?: string;
  tenantUserId?: string;
};

/**
 * Search and filter tickets
 */
export async function listTickets(input: SearchTicketsInput) {
  const tickets = await searchTickets({
    status: input.status,
    category: input.category,
    channel: input.channel,
    search: input.search,
    limit: input.limit ?? 50,
    ownerUserId: input.ownerUserId,
    tenantId: input.tenantId,
    tenancyId: input.tenancyId,
    tenantEmail: input.tenantEmail,
    tenantUserId: input.tenantUserId,
  });

  return tickets;
}

/**
 * Get a single ticket by ID
 */
export async function getTicketById(id: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      tenant: true,
      unit: true,
      messages: {
        orderBy: { sentAt: "desc" },
        take: 20,
      },
    },
  });

  return ticket;
}

/**
 * Create a new ticket
 */
export async function createTicket(input: CreateTicketInput) {
  const ticket = await prisma.ticket.create({
    data: {
      subject: input.subject,
      description: input.description ?? null,
      category: input.category,
      priority: input.priority,
      channel: input.channel,
      ownerUserId: input.ownerUserId,
      tenant: input.tenantId ? { connect: { id: input.tenantId } } : undefined,
      unit: input.unitId ? { connect: { id: input.unitId } } : undefined,
    },
  });

  return ticket;
}

/**
 * Update a ticket
 */
export async function updateTicket(
  id: string,
  data: {
    subject?: string;
    description?: string;
    category?: TicketCategory;
    priority?: TicketPriority;
    status?: string;
  }
) {
  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });

  return ticket;
}

/**
 * Delete a ticket
 */
export async function deleteTicket(id: string) {
  await prisma.ticket.delete({
    where: { id },
  });
}
