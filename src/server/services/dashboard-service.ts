import { prisma } from "../db";

export type DashboardStats = {
  openTickets: number;
  urgentTickets: number;
  overdueTickets: number;
  resolvedThisMonth: number;
  pendingApprovals: number;
};

export type AttentionItem = {
  id: string;
  type: "urgent_ticket" | "pending_proposal" | "overdue_ticket";
  subject: string;
  tenantName: string | null;
  priority: string;
  timeAgo: string;
  ticketId: string;
};

function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [openTickets, urgentTickets, overdueTickets, resolvedThisMonth, pendingApprovals] =
    await Promise.all([
      prisma.ticket.count({
        where: { status: { in: ["OPEN", "IN_PROGRESS", "ESCALATED", "SCHEDULED"] } },
      }),
      prisma.ticket.count({
        where: {
          priority: { in: ["URGENT", "HIGH"] },
          status: { in: ["OPEN", "IN_PROGRESS", "ESCALATED"] },
        },
      }),
      prisma.ticket.count({
        where: {
          slaDueAt: { lt: now },
          status: { in: ["OPEN", "IN_PROGRESS", "ESCALATED", "SCHEDULED"] },
        },
      }),
      prisma.ticket.count({
        where: {
          status: "RESOLVED",
          resolvedAt: { gte: startOfMonth },
        },
      }),
      prisma.actionProposal.count({
        where: { status: "PENDING" },
      }),
    ]);

  return { openTickets, urgentTickets, overdueTickets, resolvedThisMonth, pendingApprovals };
}

export async function getAttentionItems(): Promise<AttentionItem[]> {
  const now = new Date();

  const [urgentTickets, overdueTickets, pendingProposals] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        priority: { in: ["URGENT", "HIGH"] },
        status: { in: ["OPEN", "IN_PROGRESS", "ESCALATED"] },
      },
      include: { tenant: { select: { firstName: true, lastName: true } } },
      orderBy: { openedAt: "desc" },
      take: 3,
    }),
    prisma.ticket.findMany({
      where: {
        slaDueAt: { lt: now },
        status: { in: ["OPEN", "IN_PROGRESS", "ESCALATED", "SCHEDULED"] },
      },
      include: { tenant: { select: { firstName: true, lastName: true } } },
      orderBy: { slaDueAt: "asc" },
      take: 3,
    }),
    prisma.actionProposal.findMany({
      where: { status: "PENDING" },
      include: {
        conversation: {
          include: {
            ticket: {
              include: { tenant: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const items: AttentionItem[] = [];

  for (const t of urgentTickets) {
    items.push({
      id: `urgent-${t.id}`,
      type: "urgent_ticket",
      subject: t.subject,
      tenantName: t.tenant ? `${t.tenant.firstName} ${t.tenant.lastName}` : null,
      priority: t.priority,
      timeAgo: relativeTime(t.openedAt),
      ticketId: t.id,
    });
  }

  for (const t of overdueTickets) {
    if (items.some((i) => i.ticketId === t.id)) continue;
    items.push({
      id: `overdue-${t.id}`,
      type: "overdue_ticket",
      subject: t.subject,
      tenantName: t.tenant ? `${t.tenant.firstName} ${t.tenant.lastName}` : null,
      priority: t.priority,
      timeAgo: relativeTime(t.slaDueAt!),
      ticketId: t.id,
    });
  }

  for (const p of pendingProposals) {
    const ticket = p.conversation?.ticket;
    if (!ticket) continue;
    items.push({
      id: `proposal-${p.id}`,
      type: "pending_proposal",
      subject: `Pending: ${p.actionType} on "${ticket.subject}"`,
      tenantName: ticket.tenant ? `${ticket.tenant.firstName} ${ticket.tenant.lastName}` : null,
      priority: ticket.priority,
      timeAgo: relativeTime(p.createdAt),
      ticketId: ticket.id,
    });
  }

  return items.slice(0, 5);
}
