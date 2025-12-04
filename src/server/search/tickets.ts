import { prisma } from "../db";

type TicketFilters = {
  status?: string;
  category?: string;
  channel?: string;
  search?: string;
  limit?: number;
  ownerUserId?: string;
  tenantUserId?: string;
  tenantId?: string;
  tenancyId?: string;
  tenantEmail?: string;
};

export async function searchTickets(filters: TicketFilters) {
  const { status, category, channel, ownerUserId, tenantUserId, tenantId, tenancyId, tenantEmail } = filters;
  const limit = filters.limit ?? 50;
  const searchTerm = normalizeSearch(filters.search);

  // Build WHERE clause with OR logic for tenant filtering
  const baseWhere: any = {};

  // Only add fields if they have values
  if (status) baseWhere.status = status;
  if (category) baseWhere.category = category;
  if (channel) baseWhere.channel = channel;
  if (ownerUserId) baseWhere.ownerUserId = ownerUserId;
  if (tenancyId) baseWhere.tenancyId = tenancyId;

  // If both tenantUserId and tenantId are provided, match either
  if (tenantUserId && tenantId) {
    baseWhere.OR = [
      { tenantUserId },
      { tenantId },
    ];
  } else if (tenantUserId) {
    baseWhere.tenantUserId = tenantUserId;
  } else if (tenantId) {
    baseWhere.tenantId = tenantId;
  }

  // If filtering by tenant email, need to join through tenant table
  if (tenantEmail) {
    baseWhere.tenant = {
      email: tenantEmail,
    };
  }

  console.log("searchTickets WHERE clause:", JSON.stringify(baseWhere, null, 2));

  if (!searchTerm) {
    const results = await prisma.ticket.findMany({
      where: baseWhere,
      orderBy: { openedAt: "desc" },
      include: {
        tenant: true,
        unit: true,
        messages: {
          orderBy: { sentAt: "desc" },
          take: 1,
        },
      },
      take: limit,
    });
    console.log(`searchTickets found ${results.length} tickets`);
    console.log("Ticket details:", results.map(t => ({
      id: t.id,
      subject: t.subject,
      tenantId: t.tenantId,
      tenantUserId: t.tenantUserId
    })));
    return results;
  }

  const rankedIds = await prisma.$queryRaw<Array<{ id: string; rank: number }>>`
    SELECT t.id,
           ts_rank_cd(t.search_vector, websearch_to_tsquery('english', ${searchTerm})) AS rank
    FROM tickets t
    WHERE t.search_vector @@ websearch_to_tsquery('english', ${searchTerm})
    UNION ALL
    SELECT m.ticket_id AS id,
           ts_rank_cd(
             to_tsvector('english', coalesce(m.subject, '') || ' ' || coalesce(m.body_text, '')),
             websearch_to_tsquery('english', ${searchTerm})
           ) AS rank
    FROM messages m
    WHERE to_tsvector('english', coalesce(m.subject, '') || ' ' || coalesce(m.body_text, ''))
          @@ websearch_to_tsquery('english', ${searchTerm})
    ORDER BY rank DESC
    LIMIT ${limit}
  `;

  const orderedIds = Array.from(new Set(rankedIds.map((row) => row.id))).slice(0, limit);

  if (orderedIds.length === 0) {
    return [];
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      ...baseWhere,
      id: { in: orderedIds },
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

  const rankIndex = new Map<string, number>();
  orderedIds.forEach((id, index) => rankIndex.set(id, index));

  return tickets.sort((a, b) => {
    const aRank = rankIndex.get(a.id) ?? 0;
    const bRank = rankIndex.get(b.id) ?? 0;
    return aRank - bRank;
  });
}

function normalizeSearch(raw?: string | null) {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[':]/g, " ").trim();
  return cleaned.length ? cleaned : undefined;
}
