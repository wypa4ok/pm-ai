export const dynamic = "force-dynamic";

const cannedPhrases = [
  "Thanks for reaching out. We've got your request and will update you shortly.",
  "We're coordinating a contractor; please share your preferred time windows.",
  "If this is urgent (leak/safety), call us right away at the emergency line.",
];

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-10">
      <header className="space-y-1">
        <p className="text-sm font-medium text-text-secondary">Workspace</p>
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary">
          Channels, auto-send preferences, and canned phrases.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-text-primary">Channels</h2>
        <ul className="mt-4 space-y-3 text-sm text-text-secondary">
          <li>Gmail connected: {process.env.GOOGLE_CLIENT_ID ? "yes" : "no"}</li>
          <li>Gmail labels: {process.env.GMAIL_LABEL ?? "PM/Inbound"}</li>
          <li>Processed label: {process.env.GMAIL_PROCESSED_LABEL ?? "PM/Processed"}</li>
          <li>WhatsApp verify token: {process.env.WA_VERIFY_TOKEN ? "configured" : "missing"}</li>
          <li>Gmail poll interval (ms): {process.env.GMAIL_POLL_INTERVAL_MS ?? "120000"}</li>
        </ul>
        <p className="mt-3 text-xs text-text-muted">
          These values are read from environment variables. Update your deployment env to change them.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-text-primary">Auto-send</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Toggle auto-send for low-risk drafts (stub). Wire this to your outbound flow when ready.
        </p>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" disabled className="h-4 w-4" />
          <span className="text-text-secondary">Auto-send approved Gmail drafts (coming soon)</span>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-text-primary">Canned phrases</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Keep short template snippets handy for common replies.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-text-secondary">
          {cannedPhrases.map((phrase, idx) => (
            <li key={idx} className="rounded-md border border-border bg-surface-alt px-3 py-2">
              {phrase}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
