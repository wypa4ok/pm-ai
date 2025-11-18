import { NextResponse } from "next/server";
import { prisma } from "../../../../../../src/server/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const channel = searchParams.get("channel") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const tickets = await prisma.ticket.findMany({
    where: {
      status,
      category,
      channel,
      ...(search
        ? {
            OR: [
              { subject: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              {
                messages: {
                  some: {
                    bodyText: { contains: search, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { openedAt: "desc" },
    include: {
      tenant: true,
      unit: true,
      messages: {
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
    take: 50,
  });

  return NextResponse.json({
    tickets: tickets.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      channel: ticket.channel,
      openedAt: ticket.openedAt,
      tenantName: ticket.tenant
        ? `${ticket.tenant.firstName} ${ticket.tenant.lastName}`
        : undefined,
      unitName: ticket.unit?.name ?? undefined,
      latestMessageSnippet: ticket.messages[0]?.snippet ?? ticket.messages[0]?.bodyText ?? undefined,
    })),
  });
}
