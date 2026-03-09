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

interface TicketTableProps {
  tickets: TicketRow[];
}

export default function TicketTable({ tickets }: TicketTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="text-xs uppercase text-text-muted">
            <th className="px-4 py-3 font-medium">Ticket</th>
            <th className="px-4 py-3 font-medium">Tenant</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Channel</th>
            <th className="px-4 py-3 font-medium">Priority</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Opened</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="transition hover:bg-surface-raised">
              <td className="px-4 py-3 align-top">
                <Link href={`/tickets/${ticket.id}`}>
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-medium text-text-primary hover:text-accent transition">
                      {ticket.subject}
                    </div>
                    <p className="text-xs text-text-muted">
                      {ticket.latestMessageSnippet ?? "Awaiting first message"}
                    </p>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3 align-top">
                <div className="text-sm text-text-primary">{ticket.tenantName ?? "\u2014"}</div>
                <div className="text-xs text-text-muted">{ticket.unitName ?? ""}</div>
              </td>
              <td className="px-4 py-3 align-top text-sm text-text-secondary">{ticket.category}</td>
              <td className="px-4 py-3 align-top text-sm text-text-secondary">{ticket.channel}</td>
              <td className="px-4 py-3 align-top">
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badgeColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </td>
              <td className="px-4 py-3 align-top">
                <span className="text-sm text-text-secondary">{ticket.status.replace("_", " ")}</span>
              </td>
              <td className="px-4 py-3 align-top text-xs text-text-muted">
                {new Date(ticket.openedAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function badgeColor(priority: string) {
  switch (priority) {
    case "URGENT":
    case "HIGH":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "MEDIUM":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default:
      return "bg-surface-raised text-text-secondary border-border";
  }
}
