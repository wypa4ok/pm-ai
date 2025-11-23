"use client";

import { useEffect, useMemo, useState } from "react";
import Timeline from "../../../../(app)/components/Timeline";
import TenantReplyBox from "../components/TenantReplyBox";

type TicketMessage = {
  id: string;
  direction: string;
  channel: string;
  subject?: string | null;
  bodyText?: string | null;
  bodyHtml?: string | null;
  sentAt: string;
  attachments?: Array<{
    id?: string;
    filename: string;
    mimeType?: string;
    sizeInBytes?: number;
    url?: string;
  }>;
};

type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  channel: string;
  openedAt: string;
  unitName?: string;
  messages?: TicketMessage[];
};

type TicketResponse = {
  ticket: Ticket;
};

interface TenantTicketDetailPageProps {
  params: { id: string };
}

export default function TenantTicketDetailPage({ params }: TenantTicketDetailPageProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const response = await fetch(`/api/v1/tickets/${params.id}`);
      if (!response.ok) {
        setTicket(null);
        setLoading(false);
        return;
      }
      const data = (await response.json()) as TicketResponse;
      if (mounted) {
        setTicket(data.ticket);
        setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [params.id]);

  const timelineItems = useMemo(() => {
    if (!ticket) return [];
    const items = [
      {
        id: "created",
        title: "Request created",
        timestamp: ticket.openedAt,
        description: ticket.subject,
        badge: ticket.status,
      },
      ...(ticket.messages ?? []).map((msg) => ({
        id: msg.id,
        title:
          msg.direction === "OUTBOUND"
            ? "Management replied"
            : msg.direction === "INBOUND"
              ? "You sent"
              : "Update",
        timestamp: msg.sentAt,
        description: msg.bodyText ?? msg.bodyHtml ?? msg.subject ?? "",
        badge: msg.channel,
        attachments: msg.attachments,
      })),
    ];
    return items;
  }, [ticket]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">
        Loading ticket...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-slate-500">
        <p>Ticket not found or you don't have access to it.</p>
        <a
          href="/tenant/tickets"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Back to Tickets
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">
                Request #{ticket.id.slice(0, 8)}
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                {ticket.subject}
              </h1>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                {ticket.unitName && (
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium">
                    {ticket.unitName}
                  </span>
                )}
                <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                  {ticket.category}
                </span>
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${statusBadgeColor(
                    ticket.status,
                  )}`}
                >
                  {ticket.status}
                </span>
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${priorityBadgeColor(
                    ticket.priority,
                  )}`}
                >
                  {ticket.priority}
                </span>
              </div>
            </div>
            <a
              href="/tenant/tickets"
              className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
            >
              ← Back to Tickets
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Activity</h2>
          <Timeline items={timelineItems} />
        </div>

        <TenantReplyBox ticketId={ticket.id} />
      </div>
    </div>
  );
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

function priorityBadgeColor(priority: string) {
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
