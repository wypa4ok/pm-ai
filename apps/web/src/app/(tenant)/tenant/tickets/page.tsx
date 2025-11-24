import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { searchTickets } from "../../../../../../../src/server/search/tickets";
import { fetchSupabaseUser } from "../../../../server/session/role";
import TenantTicketTable from "../components/TenantTicketTable";

const statusOptions = ["OPEN", "IN_PROGRESS", "ESCALATED", "SCHEDULED", "RESOLVED", "CLOSED"];
const categoryOptions = ["MAINTENANCE", "BILLING", "COMMUNICATION", "OPERATIONS", "OTHER"];

function serializeTickets(tickets: any[]) {
  return tickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    status: ticket.status,
    priority: ticket.priority,
    channel: ticket.channel,
    openedAt: ticket.openedAt.toISOString(),
    unitName: ticket.unit?.name ?? undefined,
    latestMessageSnippet:
      ticket.messages[0]?.bodyText?.slice(0, 100) ??
      ticket.messages[0]?.bodyHtml?.slice(0, 100) ??
      undefined,
  }));
}

export default async function TenantTicketsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[]>;
}) {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const supabaseUser = await fetchSupabaseUser(accessToken);
  if (!supabaseUser) {
    redirect("/login");
  }

  const status = typeof searchParams?.status === "string" ? searchParams.status : "";
  const category = typeof searchParams?.category === "string" ? searchParams.category : "";
  const search = typeof searchParams?.search === "string" ? searchParams.search : "";

  const tickets = await searchTickets({
    tenantUserId: supabaseUser.id,
    status: status || undefined,
    category: category || undefined,
    search: search || undefined,
    limit: 50,
  });

  const serialized = serializeTickets(tickets);

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-500">My Requests</p>
        <h1 className="text-2xl font-semibold text-slate-900">Maintenance Tickets</h1>
        <p className="text-sm text-slate-500">
          View and track your maintenance requests and inquiries.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="grid gap-4 md:grid-cols-3" method="get">
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
            Search
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring"
              name="search"
              defaultValue={search}
              placeholder="Search keywords"
            />
          </label>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {serialized.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-500">No tickets found.</p>
            <a
              href="/tenant/tickets/new"
              className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Create New Request
            </a>
          </div>
        ) : (
          <TenantTicketTable tickets={serialized} />
        )}
      </section>
    </div>
  );
}
