"use client";

import { useState } from "react";

interface ComposerProps {
  ticketId: string;
  onSend?: (payload: ComposerPayload) => Promise<void> | void;
  draft?: string;
  to?: string;
}

export interface ComposerPayload {
  subject: string;
  body: string;
  channel: "EMAIL" | "WHATSAPP";
  to?: string;
}

export default function Composer({
  ticketId,
  onSend,
  draft,
  to,
}: ComposerProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(draft ?? "");
  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP">("EMAIL");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [approval, setApproval] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setStatus(null);

    const payload: ComposerPayload = {
      subject: subject.trim() || `(Ticket ${ticketId})`,
      body: body.trim(),
      channel,
    };

    try {
      if (onSend) {
        await onSend(payload);
      }
      setStatus(
        approval
          ? "Draft saved for approval. Wire onSend to deliver via email/WA."
          : "Draft sent/queued. Wire onSend to deliver via email/WA.",
      );
      setBody("");
    } catch (error) {
      console.error(error);
      setStatus("Failed to send. Check logs.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">Subject</label>
        <input
          className="rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Re: Ticket update"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">Message</label>
        <textarea
          className="min-h-[140px] rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Draft a reply..."
          required
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-text-secondary">Channel</label>
        <select
          className="rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          value={channel}
          onChange={(e) => setChannel(e.target.value as ComposerPayload["channel"])}
        >
            <option value="EMAIL">Email</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={approval}
              onChange={(e) => setApproval(e.target.checked)}
            />
            Require approval before send
          </label>
        <button
          type="submit"
          disabled={sending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface-deep shadow-sm transition hover:bg-accent-hover disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send"}
        </button>
        {status ? (
          <span className="text-sm text-text-secondary">{status}</span>
        ) : null}
      </div>
    </form>
  );
}
