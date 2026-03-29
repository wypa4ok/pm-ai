"use client";

import { useState } from "react";

type TenantData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  unit: {
    name: string;
    address1: string;
    address2: string | null;
    city: string;
    state: string;
    postalCode: string;
  } | null;
};

interface TenantProfileFormProps {
  tenant: TenantData;
}

export default function TenantProfileForm({ tenant }: TenantProfileFormProps) {
  const [phone, setPhone] = useState(tenant.phone || "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() || null }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update profile");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          Profile updated successfully!
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <p className="text-xs font-medium uppercase text-text-muted">Name</p>
        <p className="mt-1 text-sm text-text-primary">
          {tenant.firstName} {tenant.lastName}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase text-text-muted">Email</p>
        <p className="mt-1 text-sm text-text-primary">{tenant.email || "Not provided"}</p>
      </div>

      <div>
        <label htmlFor="phone" className="text-xs font-medium uppercase text-text-muted">
          Phone Number
        </label>
        <input
          id="phone"
          type="tel"
          className="mt-1 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
          placeholder="(555) 123-4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={saving}
        />
        <p className="mt-1 text-xs text-text-muted">
          Your phone number for emergency contact
        </p>
      </div>

      <div className="rounded-md border border-border bg-surface-alt px-4 py-3 text-xs text-text-muted">
        To update your name or email, please contact property management.
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface-deep hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
