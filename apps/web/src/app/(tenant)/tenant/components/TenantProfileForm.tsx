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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phone.trim() || null,
        }),
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
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Profile updated successfully!
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div>
        <p className="text-xs font-medium uppercase text-slate-500">Name</p>
        <p className="mt-1 text-sm text-slate-900">
          {tenant.firstName} {tenant.lastName}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase text-slate-500">Email</p>
        <p className="mt-1 text-sm text-slate-900">{tenant.email || "Not provided"}</p>
      </div>

      <div>
        <label htmlFor="phone" className="text-xs font-medium uppercase text-slate-500">
          Phone Number
        </label>
        <input
          id="phone"
          type="tel"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring"
          placeholder="(555) 123-4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={saving}
        />
        <p className="mt-1 text-xs text-slate-500">
          Your phone number for emergency contact
        </p>
      </div>

      <div className="rounded-md bg-slate-50 px-4 py-3 text-xs text-slate-600">
        To update your name or email, please contact property management.
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
