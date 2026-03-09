"use client";

import Link from "next/link";

type TicketRow = {
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

interface KanbanBoardProps {
  tickets: TicketRow[];
}

const STATUS_COLUMNS = [
  { key: "OPEN", label: "Open" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "ESCALATED", label: "Escalated" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "CLOSED", label: "Closed" },
];

function priorityColor(priority: string) {
  switch (priority) {
    case "URGENT":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "HIGH":
      return "bg-red-500/15 text-red-400 border-red-500/20";
    case "MEDIUM":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default:
      return "bg-surface-raised text-text-secondary border-border";
  }
}

function channelIcon(channel: string) {
  switch (channel) {
    case "EMAIL":
      return "@ ";
    case "WHATSAPP":
      return "W ";
    case "SMS":
      return "S ";
    default:
      return "";
  }
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

export default function KanbanBoard({ tickets }: KanbanBoardProps) {
  const grouped = STATUS_COLUMNS.map((col) => ({
    ...col,
    tickets: tickets.filter((t) => t.status === col.key),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {grouped.map((column) => (
        <div
          key={column.key}
          className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-surface-alt"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold text-text-primary">{column.label}</span>
            <span className="rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium text-text-secondary">
              {column.tickets.length}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
            {column.tickets.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">No tickets</div>
            ) : (
              column.tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="group rounded-lg border border-border bg-surface p-3 transition hover:border-accent/40 hover:bg-surface-raised"
                >
                  <p className="truncate text-sm font-medium text-text-primary group-hover:text-accent transition">
                    {ticket.subject}
                  </p>
                  {ticket.tenantName ? (
                    <p className="mt-1 truncate text-xs text-text-secondary">{ticket.tenantName}</p>
                  ) : null}
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityColor(ticket.priority)}`}
                    >
                      {ticket.priority}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {channelIcon(ticket.channel)}{ticket.category}
                    </span>
                    <span className="ml-auto text-[10px] text-text-muted">
                      {relativeTime(ticket.openedAt)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
