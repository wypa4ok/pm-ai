"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const categoryOptions = ["MAINTENANCE", "BILLING", "COMMUNICATION", "OPERATIONS", "OTHER"];
const priorityOptions = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function NewTicketPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("MAINTENANCE");
  const [priority, setPriority] = useState("MEDIUM");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      setError("Please enter a subject");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const attachmentKeys: string[] = [];

      for (const file of files) {
        const filename = file.name;
        const path = `tickets/${Date.now()}-${filename}`;

        const signResponse = await fetch("/api/v1/uploads/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, contentType: file.type }),
        });

        if (!signResponse.ok) {
          throw new Error("Failed to get upload URL");
        }

        const signData = await signResponse.json();

        const uploadResponse = await fetch(signData.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${filename}`);
        }

        attachmentKeys.push(path);
      }

      const ticketResponse = await fetch("/api/v1/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description, category, priority, attachments: attachmentKeys }),
      });

      if (!ticketResponse.ok) {
        const data = await ticketResponse.json();
        throw new Error(data.message || "Failed to create ticket");
      }

      const ticketData = await ticketResponse.json();
      router.push(`/tenant/tickets/${ticketData.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-text-muted">New Request</p>
        <h1 className="text-2xl font-semibold text-text-primary">Create Maintenance Ticket</h1>
        <p className="text-sm text-text-secondary">
          Submit a new maintenance request or inquiry to property management.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        {error && (
          <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-text-secondary">
              Subject *
            </label>
            <input
              id="subject"
              type="text"
              className="mt-2 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
              placeholder="Brief summary of your request"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-secondary">
              Description *
            </label>
            <textarea
              id="description"
              rows={6}
              className="mt-2 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
              placeholder="Provide detailed information about your request..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-text-secondary">
                Category *
              </label>
              <select
                id="category"
                className="mt-2 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-text-secondary">
                Priority *
              </label>
              <select
                id="priority"
                className="mt-2 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={submitting}
              >
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="files" className="block text-sm font-medium text-text-secondary">
              Attachments
            </label>
            <p className="mt-1 text-xs text-text-muted">
              Upload photos or documents (optional)
            </p>
            <input
              id="files"
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              className="mt-2 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              onChange={handleFileChange}
              disabled={submitting}
            />

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-md border border-border bg-surface-alt px-3 py-2"
                  >
                    <span className="text-sm text-text-primary">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-sm text-red-400 hover:text-red-300"
                      disabled={submitting}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-4">
            <a
              href="/tenant/tickets"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-raised"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface-deep hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
