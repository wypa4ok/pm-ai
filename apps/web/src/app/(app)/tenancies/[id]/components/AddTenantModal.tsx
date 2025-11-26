"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTenantMember } from "../../actions";

interface AddTenantModalProps {
  tenancyId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddTenantModal({
  tenancyId,
  isOpen,
  onClose,
}: AddTenantModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    isPrimary: false,
    sendInvite: true,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setInviteLink(null);

    try {
      const result = await addTenantMember(tenancyId, formData);

      // Show invite link if generated
      if (result.inviteLink) {
        setInviteLink(result.inviteLink);
      } else {
        // Close modal and refresh if no invite to show
        router.refresh();
        handleClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add tenant");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      isPrimary: false,
      sendInvite: true,
    });
    setError(null);
    setInviteLink(null);
    onClose();
  };

  const handleCopyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      // Could add a toast notification here
    }
  };

  const handleDone = () => {
    router.refresh();
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        {inviteLink ? (
          // Success view with invite link
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Tenant Added Successfully
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              The tenant has been added to this tenancy. Share the invite link
              below to give them portal access.
            </p>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <label className="text-xs font-medium text-slate-700">
                Invite Link
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
                <button
                  onClick={handleCopyInviteLink}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                This link expires in 7 days
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleDone}
                className="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          // Form view
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                Add Tenant Member
              </h2>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600"
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
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="John"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="john.doe@example.com"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={formData.isPrimary}
                  onChange={(e) =>
                    setFormData({ ...formData, isPrimary: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isPrimary" className="text-sm text-slate-700">
                  Set as primary tenant
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendInvite"
                  checked={formData.sendInvite}
                  onChange={(e) =>
                    setFormData({ ...formData, sendInvite: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sendInvite" className="text-sm text-slate-700">
                  Send portal access invite
                </label>
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
                  {isLoading ? "Adding..." : "Add Tenant"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
