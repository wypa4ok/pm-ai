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
      <div className="flex flex-1 items-center justify-center text-text-secondary">
        Loading ticket...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-text-secondary">
        <p>Ticket not found or you don&apos;t have access to it.</p>
        <a
          href="/tenant/tickets"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface-deep hover:bg-accent-hover"
        >
          Back to Tickets
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-text-muted">
                Request #{ticket.id.slice(0, 8)}
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-text-primary">
                {ticket.subject}
              </h1>
              <div className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
                {ticket.unitName && (
                  <span className="rounded bg-surface-raised px-2 py-1 text-xs font-medium text-text-secondary">
                    {ticket.unitName}
                  </span>
                )}
                <span className="rounded bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
                  {ticket.category}
                </span>
                <span className={`rounded px-2 py-1 text-xs font-medium ${statusBadgeColor(ticket.status)}`}>
                  {ticket.status}
                </span>
                <span className={`rounded px-2 py-1 text-xs font-medium ${priorityBadgeColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </div>
            </div>
            <a
              href="/tenant/tickets"
              className="text-sm text-text-muted hover:text-text-primary hover:underline"
            >
              ← Back to Tickets
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Activity</h2>
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

function priorityBadgeColor(priority: string) {
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
