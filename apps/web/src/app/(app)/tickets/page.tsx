export const dynamic = "force-dynamic";

import TicketsView from "../components/TicketsView";
import { searchTickets } from "../../../../../../src/server/search/tickets";
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
  const tenantId = typeof searchParams?.tenantId === "string" ? searchParams.tenantId : "";

  const tenants = await prisma.tenant.findMany({
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  const tickets = await searchTickets({
    status: status || undefined,
    category: category || undefined,
    channel: channel || undefined,
    search: search || undefined,
    tenantId: tenantId || undefined,
    limit: 50,
  });

  const serialized = serializeTickets(tickets);

  const selectClasses =
    "rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30";
  const inputClasses =
    "rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30";

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary">Inbox</p>
          <h1 className="text-2xl font-semibold text-text-primary">Tickets</h1>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <form className="grid gap-4 md:grid-cols-5" method="get">
          <label className="grid gap-1.5 text-xs font-medium text-text-secondary">
            Status
            <select className={selectClasses} name="status" defaultValue={status}>
              <option value="">All</option>
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>{opt.replace("_", " ")}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-text-secondary">
            Category
            <select className={selectClasses} name="category" defaultValue={category}>
              <option value="">All</option>
              {categoryOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-text-secondary">
            Channel
            <select className={selectClasses} name="channel" defaultValue={channel}>
              <option value="">All</option>
              {channelOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-text-secondary">
            Tenant
            <select className={selectClasses} name="tenantId" defaultValue={tenantId}>
              <option value="">All tenants</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-text-secondary">
            Search
            <input
              className={inputClasses}
              name="search"
              defaultValue={search}
              placeholder="Subject, keywords..."
            />
          </label>
        </form>
      </section>

      <TicketsView tickets={serialized} />
    </div>
  );
}
