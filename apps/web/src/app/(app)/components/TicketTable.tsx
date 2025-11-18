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
          <tr className="text-xs uppercase text-slate-500">
            <th className="py-3 pr-3 font-medium">Ticket</th>
            <th className="py-3 pr-3 font-medium">Tenant</th>
            <th className="py-3 pr-3 font-medium">Category</th>
            <th className="py-3 pr-3 font-medium">Channel</th>
            <th className="py-3 pr-3 font-medium">Priority</th>
            <th className="py-3 pr-3 font-medium">Status</th>
            <th className="py-3 pr-3 font-medium">Opened</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-slate-50">
              <td className="py-3 pr-3 align-top">
                <Link href={`/tickets/${ticket.id}`}>
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold text-slate-900 hover:underline">
                      {ticket.subject}
                    </div>
                    <p className="text-xs text-slate-500">
                      {ticket.latestMessageSnippet ?? "Awaiting first message"}
                    </p>
                  </div>
                </Link>
              </td>
              <td className="py-3 pr-3 align-top">
                <div className="text-sm text-slate-900">
                  {ticket.tenantName ?? "—"}
                </div>
                <div className="text-xs text-slate-500">
                  {ticket.unitName ?? ""}
                </div>
              </td>
              <td className="py-3 pr-3 align-top">{ticket.category}</td>
              <td className="py-3 pr-3 align-top">{ticket.channel}</td>
              <td className="py-3 pr-3 align-top">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${badgeColor(
                    ticket.priority,
                  )}`}
                >
                  {ticket.priority}
                </span>
              </td>
              <td className="py-3 pr-3 align-top">{ticket.status}</td>
              <td className="py-3 pr-3 align-top text-xs text-slate-500">
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
      return "bg-red-100 text-red-700";
    case "MEDIUM":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
