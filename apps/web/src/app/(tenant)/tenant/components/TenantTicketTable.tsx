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
          <tr className="text-xs uppercase text-slate-500">
            <th className="py-3 pr-3 font-medium">Request</th>
            <th className="py-3 pr-3 font-medium">Category</th>
            <th className="py-3 pr-3 font-medium">Priority</th>
            <th className="py-3 pr-3 font-medium">Status</th>
            <th className="py-3 pr-3 font-medium">Opened</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-slate-50">
              <td className="py-3 pr-3 align-top">
                <Link href={`/tenant/tickets/${ticket.id}`}>
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold text-slate-900 hover:underline">
                      {ticket.subject}
                    </div>
                    {ticket.latestMessageSnippet && (
                      <p className="text-xs text-slate-500">
                        {ticket.latestMessageSnippet}...
                      </p>
                    )}
                    {ticket.unitName && (
                      <p className="text-xs text-slate-400">
                        {ticket.unitName}
                      </p>
                    )}
                  </div>
                </Link>
              </td>
              <td className="py-3 pr-3 align-top">
                <span className="text-sm text-slate-700">{ticket.category}</span>
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
              <td className="py-3 pr-3 align-top text-xs text-slate-500">
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
      return "bg-red-100 text-red-700";
    case "MEDIUM":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function statusBadgeColor(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-blue-100 text-blue-700";
    case "IN_PROGRESS":
      return "bg-purple-100 text-purple-700";
    case "SCHEDULED":
      return "bg-cyan-100 text-cyan-700";
    case "RESOLVED":
      return "bg-green-100 text-green-700";
    case "CLOSED":
      return "bg-slate-100 text-slate-700";
    case "ESCALATED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
