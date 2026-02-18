import { NextResponse } from "next/server";
import { searchTickets } from "../../../../../../src/server/search/tickets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const channel = searchParams.get("channel") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const tickets = await searchTickets({
    status: status ?? undefined,
    category: category ?? undefined,
    channel: channel ?? undefined,
    search: search ?? undefined,
    limit: 50,
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
      latestMessageSnippet: ticket.messages[0]?.bodyText ?? undefined,
    })),
  });
}
