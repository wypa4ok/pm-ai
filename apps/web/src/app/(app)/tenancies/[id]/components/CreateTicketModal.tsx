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
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
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
      // Upload files first if any
      const attachmentKeys: string[] = [];

      for (const file of files) {
        const filename = file.name;
        const path = `tickets/${Date.now()}-${filename}`;

        // Get signed URL
        const signResponse = await fetch("/api/v1/uploads/sign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path,
            contentType: file.type,
          }),
        });

        if (!signResponse.ok) {
          throw new Error("Failed to get upload URL");
        }

        const signData = await signResponse.json();

        // Upload file
        const uploadResponse = await fetch(signData.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${filename}`);
        }

        attachmentKeys.push(path);
      }

      // Create ticket with tenancy linkage
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
      console.log("Creating ticket with data:", requestBody);

      const ticketResponse = await fetch("/api/v1/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!ticketResponse.ok) {
        const data = await ticketResponse.json();
        console.error("Ticket creation failed:", data);
        throw new Error(data.message || JSON.stringify(data) || "Failed to create ticket");
      }

      const ticketData = await ticketResponse.json();

      // Redirect to the ticket detail page
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
    setFormData({
      subject: "",
      description: "",
      category: "MAINTENANCE",
      priority: "MEDIUM",
    });
    setFiles([]);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            Create Ticket for Tenancy
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700">
              Subject *
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Brief summary of the issue"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Description *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Detailed description of the issue..."
              disabled={isLoading}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                disabled={isLoading}
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Priority *
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                disabled={isLoading}
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
            <label className="text-sm font-medium text-slate-700">
              Attachments
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Upload photos or documents (optional)
            </p>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileChange}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              disabled={isLoading}
            />

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <span className="text-sm text-slate-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-sm text-red-600 hover:text-red-800"
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
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
