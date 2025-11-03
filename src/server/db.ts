import {
  PrismaClient,
  Prisma,
  type AgentEvent,
  type AgentEventType,
  type Contractor,
  type Message,
  type MessageChannel,
  type MessageDirection,
  type Tenant,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@prisma/client";

type GlobalPrisma = typeof globalThis & {
  __prisma?: PrismaClient;
};

const globalWithPrisma = globalThis as GlobalPrisma;

export const prisma =
  globalWithPrisma.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalWithPrisma.__prisma = prisma;
}

export interface UpsertTenantInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  unitId?: string | null;
  notes?: string | null;
}

export async function upsertTenant(
  input: UpsertTenantInput,
  tx: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<Tenant> {
  const normalizedEmail = input.email?.trim().toLowerCase() ?? null;
  const normalizedPhone = input.phone?.trim() ?? null;

  const identifiers = [
    normalizedEmail ? { email: normalizedEmail } : null,
    normalizedPhone ? { phone: normalizedPhone } : null,
  ].filter(Boolean) as Prisma.TenantWhereInput[];

  const existingTenant =
    identifiers.length > 0
      ? await tx.tenant.findFirst({
          where: { OR: identifiers },
        })
      : null;

  const data: Prisma.TenantCreateInput = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: normalizedEmail,
    phone: normalizedPhone,
    notes: input.notes ?? null,
    unit: input.unitId ? { connect: { id: input.unitId } } : undefined,
  };

  if (!existingTenant) {
    return tx.tenant.create({ data });
  }

  return tx.tenant.update({
    where: { id: existingTenant.id },
    data: {
      ...data,
      unit: input.unitId
        ? { connect: { id: input.unitId } }
        : input.unitId === null
          ? { disconnect: true }
          : undefined,
    },
  });
}

export interface AttachToTicketInput {
  tenantId?: string | null;
  unitId?: string | null;
  assigneeId?: string | null;
  ownerUserId?: string;
  tenantUserId?: string | null;
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  subject?: string;
  description?: string | null;
  channel?: MessageChannel;
  sourceId?: string | null;
}

export async function attachToTicket(
  ticketId: string,
  input: AttachToTicketInput,
  tx: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<Ticket> {
  const data: Prisma.TicketUpdateInput = {};

  if (input.tenantId !== undefined) {
    data.tenant = input.tenantId
      ? { connect: { id: input.tenantId } }
      : { disconnect: true };
  }

  if (input.unitId !== undefined) {
    data.unit = input.unitId
      ? { connect: { id: input.unitId } }
      : { disconnect: true };
  }

  if (input.assigneeId !== undefined) {
    data.assignee = input.assigneeId
      ? { connect: { id: input.assigneeId } }
      : { disconnect: true };
  }

  if (input.ownerUserId !== undefined) {
    data.owner = { connect: { id: input.ownerUserId } };
  }

  if (input.tenantUserId !== undefined) {
    data.tenantUserId = input.tenantUserId ?? null;
  }

  if (input.status) data.status = input.status;
  if (input.category) data.category = input.category;
  if (input.priority) data.priority = input.priority;
  if (input.subject !== undefined) data.subject = input.subject;
  if (input.description !== undefined)
    data.description = input.description ?? null;
  if (input.channel) data.channel = input.channel;
  if (input.sourceId !== undefined) data.sourceId = input.sourceId ?? null;

  return tx.ticket.update({
    where: { id: ticketId },
    data,
    include: {
      tenant: true,
      unit: true,
      assignee: true,
    },
  });
}

export interface LogMessageInput {
  ticketId: string;
  authorId?: string | null;
  ownerUserId: string;
  direction: MessageDirection;
  channel: MessageChannel;
  subject?: string | null;
  bodyText?: string | null;
  bodyHtml?: string | null;
  attachments?: Prisma.JsonValue | null;
  externalId?: string | null;
  metadata?: Prisma.JsonValue | null;
  sentAt?: Date;
  tenantUserId?: string | null;
}

export async function logMessage(
  input: LogMessageInput,
  tx: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<Message> {
  return tx.message.create({
    data: {
      ticket: { connect: { id: input.ticketId } },
      author: input.authorId
        ? { connect: { id: input.authorId } }
        : undefined,
      owner: { connect: { id: input.ownerUserId } },
      direction: input.direction,
      channel: input.channel,
      subject: input.subject ?? null,
      bodyText: input.bodyText ?? null,
      bodyHtml: input.bodyHtml ?? null,
      attachments:
        input.attachments === undefined
          ? Prisma.JsonNull
          : input.attachments ?? Prisma.JsonNull,
      externalId: input.externalId ?? null,
      metadata:
        input.metadata === undefined
          ? Prisma.JsonNull
          : input.metadata ?? Prisma.JsonNull,
      sentAt: input.sentAt ?? new Date(),
      tenantUserId: input.tenantUserId ?? null,
    },
  });
}

export interface SaveAgentEventInput {
  ticketId: string;
  actorId?: string | null;
  type: AgentEventType;
  note?: string | null;
  payload?: Prisma.JsonValue | null;
}

export async function saveAgentEvent(
  input: SaveAgentEventInput,
  tx: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<AgentEvent> {
  return tx.agentEvent.create({
    data: {
      ticket: { connect: { id: input.ticketId } },
      actor: input.actorId ? { connect: { id: input.actorId } } : undefined,
      type: input.type,
      note: input.note ?? null,
      payload:
        input.payload === undefined
          ? Prisma.JsonNull
          : input.payload ?? Prisma.JsonNull,
    },
  });
}

export interface FindContractorsFilters {
  search?: string;
  category?: string;
  limit?: number;
}

export async function findContractors(
  filters: FindContractorsFilters = {},
  tx: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<Contractor[]> {
  const where: Prisma.ContractorWhereInput = {};

  if (filters.category) {
    where.category = filters.category as Contractor["category"];
  }

  if (filters.search) {
    const term = filters.search.trim();
    where.OR = [
      { companyName: { contains: term, mode: "insensitive" } },
      { contactName: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      {
        serviceAreas: {
          has: term,
        },
      },
    ];
  }

  return tx.contractor.findMany({
    where,
    take: filters.limit ?? 25,
    orderBy: { createdAt: "desc" },
  });
}
