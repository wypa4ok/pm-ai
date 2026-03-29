"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CreateTicketModalProps {
  tenancyId: string;
  unitId: string;
  tenantId: string | undefined;
  tenantUserId: string | undefined;
  isOpen: boolean;
  onClose: () => void;
}

const categoryOptions = ["MAINTENANCE", "BILLING", "COMMUNICATION", "OPERATIONS", "OTHER"];
const priorityOptions = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function CreateTicketModal({
  tenancyId,
  unitId,
  tenantId,
  tenantUserId,
  isOpen,
  onClose,
}: CreateTicketModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    category: "MAINTENANCE",
    priority: "MEDIUM",
  });

  const [files, setFiles] = useState<File[]>([]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const attachmentKeys: string[] = [];

      for (const file of files) {
        const path = `tickets/${Date.now()}-${file.name}`;

        const signResponse = await fetch("/api/v1/uploads/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, contentType: file.type }),
        });

        if (!signResponse.ok) throw new Error("Failed to get upload URL");

        const { signedUrl } = await signResponse.json();
        const uploadResponse = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadResponse.ok) throw new Error(`Failed to upload ${file.name}`);
        attachmentKeys.push(path);
      }

      const requestBody = {
        subject: formData.subject,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        tenancyId,
        unitId,
        tenantId,
        tenantUserId,
        attachments: attachmentKeys,
      };

      const ticketResponse = await fetch("/api/v1/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!ticketResponse.ok) {
        const data = await ticketResponse.json();
        throw new Error(data.message || JSON.stringify(data) || "Failed to create ticket");
      }

      const ticketData = await ticketResponse.json();
      router.push(`/tickets/${ticketData.ticket.id}`);
      router.refresh();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ subject: "", description: "", category: "MAINTENANCE", priority: "MEDIUM" });
    setFiles([]);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">
            Create Ticket for Tenancy
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-text-muted hover:text-text-secondary disabled:opacity-50"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-text-secondary">Subject *</label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
              placeholder="Brief summary of the issue"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary">Description *</label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
              placeholder="Detailed description of the issue..."
              disabled={isLoading}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-text-secondary">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                disabled={isLoading}
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary">Priority *</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                disabled={isLoading}
              >
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary">Attachments</label>
            <p className="mt-1 text-xs text-text-muted">Upload photos or documents (optional)</p>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileChange}
              className="mt-2 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              disabled={isLoading}
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
                      disabled={isLoading}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-raised disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface-deep hover:bg-accent-hover disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
