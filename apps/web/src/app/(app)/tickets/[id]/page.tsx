"use client";

import { useEffect, useMemo, useState } from "react";
import Timeline from "../../components/Timeline";
import Composer from "../../components/Composer";
import ContractorPanel from "../../components/ContractorPanel";
import { detectUrgency } from "../../../../../../../src/server/ai/urgency";

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
  tenantName?: string;
  unitName?: string;
  latestMessageSnippet?: string;
  messages?: TicketMessage[];
};

type TicketResponse = {
  ticket: Ticket;
};

interface TicketDetailPageProps {
  params: { id: string };
}

export default function TicketDetailPage({ params }: TicketDetailPageProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const response = await fetch(`/api/tickets/${params.id}`);
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
        title: "Ticket created",
        timestamp: ticket.openedAt,
        description: ticket.subject,
        badge: ticket.status,
      },
      ...(ticket.messages ?? []).map((msg) => ({
        id: msg.id,
        title:
          msg.direction === "OUTBOUND"
            ? "Agent replied"
            : msg.direction === "INBOUND"
              ? "Customer message"
              : "Activity",
        timestamp: msg.sentAt,
        description: msg.bodyText ?? msg.bodyHtml ?? msg.subject ?? "",
        badge: msg.channel,
        attachments: msg.attachments,
      })),
    ];
    return items;
  }, [ticket]);

  const urgency = useMemo(() => {
    if (!ticket) return { isUrgent: false, matched: [] as string[] };
    const text = [
      ticket.subject,
      ticket.latestMessageSnippet ?? "",
      ...(ticket.messages ?? []).map(
        (msg) => `${msg.subject ?? ""} ${msg.bodyText ?? ""}`,
      ),
    ].join("\n");
    return detectUrgency(text);
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
      <div className="flex flex-1 items-center justify-center text-slate-500">
        Ticket not found.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row">
      {urgency.isUrgent ? (
        <div className="w-full rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          ⚠ Urgent cues detected: {urgency.matched.join(", ")} — auto-send should be suppressed.
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-500">
            Ticket
          </p>
          <h1 className="text-xl font-semibold text-slate-900">
            {ticket.subject}
          </h1>
          <p className="text-sm text-slate-500">
            {ticket.tenantName ?? "Unknown tenant"} • {ticket.channel} •{" "}
            {ticket.priority}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Timeline</h2>
          <div className="mt-3">
            <Timeline items={timelineItems} />
          </div>
        </div>

        <Composer ticketId={ticket.id} draft={ticket.latestMessageSnippet} />
      </div>

      <div className="w-full max-w-md space-y-4">
        <ContractorPanel category={ticket.category} />
      </div>
    </div>
  );
}
