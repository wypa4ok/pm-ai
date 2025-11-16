"use client";

import { useEffect, useMemo, useState } from "react";
import TicketTable from "../components/TicketTable";

type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  channel: string;
  openedAt: string;
  tenantName?: string;
  unitName?: string;
  latestMessageSnippet?: string;
};

type TicketsResponse = {
  tickets: Ticket[];
};

const statusOptions = ["OPEN", "IN_PROGRESS", "ESCALATED", "SCHEDULED", "RESOLVED", "CLOSED"];
const categoryOptions = ["MAINTENANCE", "BILLING", "COMMUNICATION", "OPERATIONS", "OTHER"];
const channelOptions = ["EMAIL", "WHATSAPP", "SMS", "INTERNAL"];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "",
    category: "",
    channel: "",
    search: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadTickets() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.status) params.set("status", filters.status);
        if (filters.category) params.set("category", filters.category);
        if (filters.channel) params.set("channel", filters.channel);
        if (filters.search) params.set("search", filters.search);

        const response = await fetch(`/api/tickets?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to load tickets");
        }
        const data = (await response.json()) as TicketsResponse;
        if (isMounted) {
          setTickets(data.tickets ?? []);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("Failed to load tickets. Please try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTickets();
    return () => {
      isMounted = false;
    };
  }, [filters]);

  const filteredTickets = useMemo(() => tickets, [tickets]);

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
        <form className="grid gap-4 md:grid-cols-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Status
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring"
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value }))
              }
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
              value={filters.category}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, category: event.target.value }))
              }
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
              value={filters.channel}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, channel: event.target.value }))
              }
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
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
              placeholder="Subject, tenant, keywords"
            />
          </label>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Loading tickets...</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : filteredTickets.length === 0 ? (
          <p className="text-sm text-slate-500">
            No tickets match the current filters.
          </p>
        ) : (
          <TicketTable tickets={filteredTickets} />
        )}
      </section>
    </div>
  );
}
