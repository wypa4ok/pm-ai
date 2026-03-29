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
  unitName?: string;
  latestMessageSnippet?: string;
};

interface TenantTicketTableProps {
  tickets: TicketRow[];
}

export default function TenantTicketTable({ tickets }: TenantTicketTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="text-xs uppercase text-text-muted">
            <th className="py-3 pr-3 font-medium">Request</th>
            <th className="py-3 pr-3 font-medium">Category</th>
            <th className="py-3 pr-3 font-medium">Priority</th>
            <th className="py-3 pr-3 font-medium">Status</th>
            <th className="py-3 pr-3 font-medium">Opened</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-surface-raised">
              <td className="py-3 pr-3 align-top">
                <Link href={`/tenant/tickets/${ticket.id}`}>
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold text-text-primary hover:underline">
                      {ticket.subject}
                    </div>
                    {ticket.latestMessageSnippet && (
                      <p className="text-xs text-text-secondary">
                        {ticket.latestMessageSnippet}...
                      </p>
                    )}
                    {ticket.unitName && (
                      <p className="text-xs text-text-muted">
                        {ticket.unitName}
                      </p>
                    )}
                  </div>
                </Link>
              </td>
              <td className="py-3 pr-3 align-top">
                <span className="text-sm text-text-secondary">{ticket.category}</span>
              </td>
              <td className="py-3 pr-3 align-top">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${badgeColor(
                    ticket.priority,
                  )}`}
                >
                  {ticket.priority}
                </span>
              </td>
              <td className="py-3 pr-3 align-top">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadgeColor(
                    ticket.status,
                  )}`}
                >
                  {ticket.status}
                </span>
              </td>
              <td className="py-3 pr-3 align-top text-xs text-text-muted">
                {new Date(ticket.openedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "numeric",
                  day: "numeric",
                })}
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
      return "bg-red-500/10 text-red-400";
    case "MEDIUM":
      return "bg-amber-500/10 text-amber-400";
    default:
      return "bg-surface-raised text-text-muted";
  }
}

function statusBadgeColor(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-blue-500/10 text-blue-400";
    case "IN_PROGRESS":
      return "bg-purple-500/10 text-purple-400";
    case "SCHEDULED":
      return "bg-cyan-500/10 text-cyan-400";
    case "RESOLVED":
      return "bg-green-500/10 text-green-400";
    case "CLOSED":
      return "bg-surface-raised text-text-muted";
    case "ESCALATED":
      return "bg-red-500/10 text-red-400";
    default:
      return "bg-surface-raised text-text-muted";
  }
}
