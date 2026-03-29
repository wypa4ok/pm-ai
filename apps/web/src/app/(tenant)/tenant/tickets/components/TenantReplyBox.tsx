"use client";

import { useState } from "react";

interface TenantReplyBoxProps {
  ticketId: string;
}

export default function TenantReplyBox({ ticketId }: TenantReplyBoxProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          bodyText: message,
          direction: "INBOUND",
          channel: "INTERNAL",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to send message");
      }

      setSuccess(true);
      setMessage("");

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-text-primary">Add a Reply</h2>

      {success && (
        <div className="mb-4 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          Message sent successfully! Refreshing...
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-text-secondary">
            Your Message
          </label>
          <textarea
            id="message"
            rows={5}
            className="mt-2 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
            placeholder="Type your reply here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Your message will be sent to property management
          </p>
          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface-deep hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Sending..." : "Send Reply"}
          </button>
        </div>
      </form>
    </div>
  );
}
