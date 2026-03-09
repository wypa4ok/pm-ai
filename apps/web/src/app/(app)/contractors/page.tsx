"use client";

import { useEffect, useMemo, useState } from "react";

type Contractor = {
  id: string;
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  category: string;
  serviceAreas: string[];
  notes?: string | null;
  createdAt: string;
};

type ContractorPayload = {
  id?: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  category: string;
  serviceAreas: string[];
  notes?: string;
};

const categoryOptions = [
  "GENERAL",
  "PLUMBING",
  "ELECTRICAL",
  "HVAC",
  "CLEANING",
  "OTHER",
];

const initialForm: ContractorPayload = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  category: "GENERAL",
  serviceAreas: [],
  notes: "",
};

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [form, setForm] = useState<ContractorPayload>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  const sortedContractors = useMemo(
    () =>
      contractors.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [contractors],
  );

  async function refresh() {
    setLoading(true);
    const response = await fetch("/api/contractors");
    if (!response.ok) {
      setError("Failed to load contractors.");
      setLoading(false);
      return;
    }
    const data = await response.json();
    setContractors(data.contractors ?? []);
    setLoading(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload: ContractorPayload = {
      ...form,
      companyName: form.companyName.trim(),
      contactName: form.contactName?.trim() || undefined,
      email: form.email?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      serviceAreas: form.serviceAreas.map((area) => area.trim()).filter(Boolean),
    };

    const method = payload.id ? "PUT" : "POST";

    const response = await fetch("/api/contractors", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Failed to save contractor.");
      setSaving(false);
      return;
    }

    setForm(initialForm);
    await refresh();
    setSaving(false);
  }

  function startEdit(contractor: Contractor) {
    setForm({
      id: contractor.id,
      companyName: contractor.companyName,
      contactName: contractor.contactName ?? "",
      email: contractor.email ?? "",
      phone: contractor.phone ?? "",
      category: contractor.category,
      notes: contractor.notes ?? "",
      serviceAreas: contractor.serviceAreas,
    });
  }

  function handleInputChange(
    field: keyof ContractorPayload,
    value: string | string[],
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-text-secondary">
          Vendor Management
        </p>
        <h1 className="text-2xl font-semibold text-text-primary">Contractors</h1>
        <p className="text-sm text-text-secondary">
          Track trusted vendors and add new partners for future dispatches.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <form
          className="rounded-xl border border-border bg-surface p-6 shadow-sm"
          onSubmit={handleSubmit}
        >
          <h2 className="text-lg font-semibold text-text-primary">
            {form.id ? "Edit contractor" : "Add contractor"}
          </h2>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1 text-sm font-medium text-text-secondary">
              Company Name
              <input
                required
                value={form.companyName}
                onChange={(event) =>
                  handleInputChange("companyName", event.target.value)
                }
                className="rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-text-secondary">
              Contact Name
              <input
                value={form.contactName}
                onChange={(event) =>
                  handleInputChange("contactName", event.target.value)
                }
                className="rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-text-secondary">
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    handleInputChange("email", event.target.value)
                  }
                  className="rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-text-secondary">
                Phone
                <input
                  value={form.phone}
                  onChange={(event) =>
                    handleInputChange("phone", event.target.value)
                  }
                  className="rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-text-secondary">
                Category
                <select
                  value={form.category}
                  onChange={(event) =>
                    handleInputChange("category", event.target.value)
                  }
                  className="rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-text-secondary">
                Service Areas (comma separated)
                <input
                  value={form.serviceAreas.join(", ")}
                  onChange={(event) =>
                    handleInputChange(
                      "serviceAreas",
                      event.target.value.split(","),
                    )
                  }
                  className="rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-medium text-text-secondary">
              Notes
              <textarea
                value={form.notes}
                onChange={(event) =>
                  handleInputChange("notes", event.target.value)
                }
                rows={3}
                className="rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </label>
            {error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : null}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface-deep transition hover:bg-accent-hover disabled:opacity-50"
              >
                {form.id
                  ? saving
                    ? "Updating..."
                    : "Update contractor"
                  : saving
                    ? "Saving..."
                    : "Add contractor"}
              </button>
              {form.id ? (
                <button
                  type="button"
                  onClick={() => setForm(initialForm)}
                  className="text-sm font-medium text-text-secondary"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>
        </form>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">
              Contractor Directory
            </h2>
            <button
              onClick={refresh}
              className="text-sm font-medium text-text-secondary hover:text-text-primary"
            >
              Refresh
            </button>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-text-secondary">Loading...</p>
          ) : sortedContractors.length === 0 ? (
            <p className="mt-4 text-sm text-text-secondary">
              No contractors yet. Add one using the form.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase text-text-secondary">
                    <th className="py-2 pr-3">Company</th>
                    <th className="py-2 pr-3">Contact</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Service Areas</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedContractors.map((contractor) => (
                    <tr key={contractor.id}>
                      <td className="py-3 pr-3 font-medium text-text-primary">
                        {contractor.companyName}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-col">
                          <span className="text-text-primary">
                            {contractor.contactName ?? "\u2014"}
                          </span>
                          <span className="text-xs text-text-secondary">
                            {contractor.email ?? contractor.phone ?? ""}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="rounded-full bg-surface-raised px-2 py-1 text-xs font-medium text-text-secondary">
                          {contractor.category}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        {contractor.serviceAreas.join(", ") || "\u2014"}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <button
                          className="text-sm font-medium text-text-secondary hover:text-text-primary"
                          onClick={() => startEdit(contractor)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
