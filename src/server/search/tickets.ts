import { prisma } from "../db";

type TicketFilters = {
  status?: string;
  category?: string;
  channel?: string;
  search?: string;
  limit?: number;
};

export async function searchTickets(filters: TicketFilters) {
  const { status, category, channel } = filters;
  const limit = filters.limit ?? 50;
  const searchTerm = normalizeSearch(filters.search);

  const baseWhere = {
    status: status || undefined,
    category: category || undefined,
    channel: channel || undefined,
  };

  if (!searchTerm) {
    return prisma.ticket.findMany({
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
