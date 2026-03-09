export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  getDashboardStats,
  getAttentionItems,
  type DashboardStats,
  type AttentionItem,
} from "~/server/services/dashboard-service";

export default async function LandlordHomePage() {
  const [stats, attentionItems] = await Promise.all([
    getDashboardStats(),
    getAttentionItems(),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-8 p-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Here&apos;s what&apos;s happening across your properties.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open Tickets"
          value={stats.openTickets}
          alert={stats.urgentTickets > 0}
          alertLabel={`${stats.urgentTickets} urgent`}
          href="/tickets?status=OPEN"
        />
        <StatCard
          label="Overdue"
          value={stats.overdueTickets}
          alert={stats.overdueTickets > 0}
          variant="danger"
          href="/tickets"
        />
        <StatCard
          label="Awaiting Action"
          value={stats.pendingApprovals}
          href="/tickets"
        />
        <StatCard
          label="Resolved This Month"
          value={stats.resolvedThisMonth}
          variant="success"
          href="/tickets?status=RESOLVED"
        />
      </div>

      {/* Needs Attention */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Needs Attention</h2>
          <Link href="/tickets" className="text-sm text-accent hover:text-accent-hover transition">
            View all tickets
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-surface shadow-sm">
          {attentionItems.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-text-secondary">
              All clear — no items need your attention right now.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {attentionItems.map((item) => (
                <AttentionRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Quick Navigation */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Quick Access</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { href: "/tickets", label: "Tickets", desc: "Manage requests" },
            { href: "/tenancies", label: "Tenancies", desc: "Lease management" },
            { href: "/tenants", label: "Tenants", desc: "Tenant directory" },
            { href: "/contractors", label: "Contractors", desc: "Vendor network" },
            { href: "/settings", label: "Settings", desc: "Preferences" },
          ].map((nav) => (
            <Link
              key={nav.href}
              href={nav.href}
              className="group flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 transition hover:border-accent/50 hover:bg-surface-raised"
            >
              <span className="text-sm font-medium text-text-primary group-hover:text-accent transition">
                {nav.label}
              </span>
              <span className="text-xs text-text-secondary">{nav.desc}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  alert,
  alertLabel,
  variant,
  href,
}: {
  label: string;
  value: number;
  alert?: boolean;
  alertLabel?: string;
  variant?: "danger" | "success";
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-surface p-5 transition hover:border-accent/50 hover:bg-surface-raised"
    >
      <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
        {label}
      </span>
      <div className="flex items-end gap-2">
        <span
          className={`text-3xl font-bold ${
            variant === "danger" && value > 0
              ? "text-red-400"
              : variant === "success"
                ? "text-emerald-400"
                : "text-text-primary"
          }`}
        >
          {value}
        </span>
        {alert && alertLabel ? (
          <span className="mb-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
            {alertLabel}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const priorityColor =
    item.priority === "URGENT" || item.priority === "HIGH"
      ? "bg-red-500"
      : item.priority === "MEDIUM"
        ? "bg-amber-500"
        : "bg-text-muted";

  const typeLabel =
    item.type === "urgent_ticket"
      ? "Urgent"
      : item.type === "overdue_ticket"
        ? "Overdue"
        : "Pending";

  const typeBadgeColor =
    item.type === "urgent_ticket"
      ? "bg-red-500/20 text-red-400"
      : item.type === "overdue_ticket"
        ? "bg-amber-500/20 text-amber-400"
        : "bg-accent/20 text-accent";

  return (
    <li>
      <Link
        href={`/tickets/${item.ticketId}`}
        className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-surface-raised"
      >
        <div className={`h-8 w-1 shrink-0 rounded-full ${priorityColor}`} />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-text-primary">{item.subject}</p>
          <p className="text-xs text-text-secondary">
            {item.tenantName ?? "Unknown tenant"} &middot; {item.timeAgo}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeColor}`}>
          {typeLabel}
        </span>
      </Link>
    </li>
  );
}
