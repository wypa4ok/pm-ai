import TicketTable from "../components/TicketTable";
import { prisma } from "../../../../../../src/server/db";

const statusOptions = ["OPEN", "IN_PROGRESS", "ESCALATED", "SCHEDULED", "RESOLVED", "CLOSED"];
const categoryOptions = ["MAINTENANCE", "BILLING", "COMMUNICATION", "OPERATIONS", "OTHER"];
const channelOptions = ["EMAIL", "WHATSAPP", "SMS", "INTERNAL"];

function serializeTickets(tickets: any[]) {
  return tickets.map((ticket) => ({
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
    latestMessageSnippet:
      ticket.messages[0]?.snippet ??
      ticket.messages[0]?.bodyText ??
      ticket.messages[0]?.bodyHtml ??
      undefined,
  }));
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[]>;
}) {
  const status = typeof searchParams?.status === "string" ? searchParams.status : "";
  const category = typeof searchParams?.category === "string" ? searchParams.category : "";
  const channel = typeof searchParams?.channel === "string" ? searchParams.channel : "";
  const search = typeof searchParams?.search === "string" ? searchParams.search : "";

  const tickets = await prisma.ticket.findMany({
    where: {
      status: status || undefined,
      category: category || undefined,
      channel: channel || undefined,
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

  const serialized = serializeTickets(tickets);

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-500">Inbox</p>
        <h1 className="text-2xl font-semibold text-slate-900">Tickets</h1>
        <p className="text-sm text-slate-500">
          Filter tickets by status, category, channel, or keyword.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="grid gap-4 md:grid-cols-4" method="get">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Status
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring"
              name="status"
              defaultValue={status}
            >
              <option value="">All</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Category
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring"
              name="category"
              defaultValue={category}
            >
              <option value="">All</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Channel
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring"
              name="channel"
              defaultValue={channel}
            >
              <option value="">All</option>
              {channelOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Search
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring"
              name="search"
              defaultValue={search}
              placeholder="Subject, tenant, keywords"
            />
          </label>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {serialized.length === 0 ? (
          <p className="text-sm text-slate-500">No tickets match the current filters.</p>
        ) : (
          <TicketTable tickets={serialized} />
        )}
      </section>
    </div>
  );
}
