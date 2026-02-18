"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUnit, createTenant, getUnitsAndTenants, createTenancy } from "../actions";

type Unit = {
  id: string;
  name: string;
  address1: string;
  city: string;
  state: string;
};

type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
};

export default function NewTenancyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showNewUnitForm, setShowNewUnitForm] = useState(false);
  const [showNewTenantForm, setShowNewTenantForm] = useState(false);

  const [formData, setFormData] = useState({
    unitId: "",
    startDate: "",
    endDate: "",
    notes: "",
    members: [{ tenantId: "", isPrimary: true }],
  });

  const [newUnitData, setNewUnitData] = useState({
    name: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    notes: "",
  });

  const [newTenantData, setNewTenantData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // Load units and tenants on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getUnitsAndTenants();
        setUnits(data.units);
        setTenants(data.tenants);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  const handleCreateUnit = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await createUnit(newUnitData);

      // Add new unit to list and select it
      setUnits([...units, result.unit]);
      setFormData({ ...formData, unitId: result.unit.id });
      setShowNewUnitForm(false);
      setNewUnitData({
        name: "",
        address1: "",
        address2: "",
        city: "",
        state: "",
        postalCode: "",
        notes: "",
      });
    } catch (err) {
      console.error("Error creating unit:", err);
      setError(err instanceof Error ? err.message : "Failed to create unit");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await createTenant(newTenantData);

      // Add new tenant to list and select it for the first member
      const newTenant = result.tenant;
      setTenants([...tenants, newTenant]);

      // If this is the first member slot and it's empty, auto-select the new tenant
      if (formData.members.length > 0 && !formData.members[0].tenantId) {
        const newMembers = [...formData.members];
        newMembers[0].tenantId = newTenant.id;
        setFormData({ ...formData, members: newMembers });
      }

      setShowNewTenantForm(false);
      setNewTenantData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
      });
    } catch (err) {
      console.error("Error creating tenant:", err);
      setError(err instanceof Error ? err.message : "Failed to create tenant");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await createTenancy({
        ...formData,
        endDate: formData.endDate || null,
        notes: formData.notes || null,
      });

      router.push(`/tenancies/${result.tenancyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tenancy");
    } finally {
      setIsLoading(false);
    }
  };

  const addMember = () => {
    setFormData({
      ...formData,
      members: [...formData.members, { tenantId: "", isPrimary: false }],
    });
  };

  const removeMember = (index: number) => {
    const newMembers = formData.members.filter((_, i) => i !== index);
    setFormData({ ...formData, members: newMembers });
  };

  const updateMember = (
    index: number,
    field: "tenantId" | "isPrimary",
    value: string | boolean
  ) => {
    const newMembers = [...formData.members];
    if (field === "isPrimary" && value === true) {
      // Unset other primary members
      newMembers.forEach((m, i) => {
        if (i !== index) m.isPrimary = false;
      });
    }
    newMembers[index] = { ...newMembers[index], [field]: value };
    setFormData({ ...formData, members: newMembers });
  };

  if (loadingData) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <Link
          href="/tenancies"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to tenancies
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          Create New Tenancy
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Add a new tenancy to track tenant leases and rental periods
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Property/Unit Selection
            </h2>
            <button
              type="button"
              onClick={() => setShowNewUnitForm(!showNewUnitForm)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {showNewUnitForm ? "Cancel" : "Create New Unit"}
            </button>
          </div>

          {showNewUnitForm ? (
            <div className="mt-4 space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                New Unit Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700">
                    Unit Name *
                  </label>
                  <input
                    type="text"
                    required={showNewUnitForm}
                    value={newUnitData.name}
                    onChange={(e) =>
                      setNewUnitData({ ...newUnitData, name: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., Apartment 3B, 123 Main St House"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    required={showNewUnitForm}
                    value={newUnitData.address1}
                    onChange={(e) =>
                      setNewUnitData({
                        ...newUnitData,
                        address1: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Street address"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={newUnitData.address2}
                    onChange={(e) =>
                      setNewUnitData({
                        ...newUnitData,
                        address2: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Apt, suite, unit, etc."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    City *
                  </label>
                  <input
                    type="text"
                    required={showNewUnitForm}
                    value={newUnitData.city}
                    onChange={(e) =>
                      setNewUnitData({ ...newUnitData, city: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    State *
                  </label>
                  <input
                    type="text"
                    required={showNewUnitForm}
                    value={newUnitData.state}
                    onChange={(e) =>
                      setNewUnitData({ ...newUnitData, state: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., CA, NY"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    required={showNewUnitForm}
                    value={newUnitData.postalCode}
                    onChange={(e) =>
                      setNewUnitData({
                        ...newUnitData,
                        postalCode: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateUnit}
                disabled={isLoading}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Creating Unit..." : "Create Unit"}
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <label className="text-sm font-medium text-slate-700">
                Select Unit/Property *
              </label>
              <select
                required
                value={formData.unitId}
                onChange={(e) =>
                  setFormData({ ...formData, unitId: e.target.value })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">
                  {units.length === 0
                    ? "No units available - create one above"
                    : "Select a unit"}
                </option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} - {unit.address1}, {unit.city}, {unit.state}
                  </option>
                ))}
              </select>
              {units.length === 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Click &quot;Create New Unit&quot; to add your first property
                </p>
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Tenancy Details
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                End Date (optional)
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Any additional notes about this tenancy"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Tenant Members
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowNewTenantForm(!showNewTenantForm)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {showNewTenantForm ? "Cancel" : "Create New Tenant"}
              </button>
              <button
                type="button"
                onClick={addMember}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Add Member
              </button>
            </div>
          </div>

          {showNewTenantForm && (
            <div className="mt-4 space-y-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                New Tenant Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required={showNewTenantForm}
                    value={newTenantData.firstName}
                    onChange={(e) =>
                      setNewTenantData({ ...newTenantData, firstName: e.target.value })
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
                    required={showNewTenantForm}
                    value={newTenantData.lastName}
                    onChange={(e) =>
                      setNewTenantData({ ...newTenantData, lastName: e.target.value })
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
                    required={showNewTenantForm}
                    value={newTenantData.email}
                    onChange={(e) =>
                      setNewTenantData({ ...newTenantData, email: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="john.doe@example.com"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={newTenantData.phone}
                    onChange={(e) =>
                      setNewTenantData({ ...newTenantData, phone: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateTenant}
                disabled={isLoading}
                className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? "Creating Tenant..." : "Create Tenant"}
              </button>
            </div>
          )}

          <div className="mt-4 space-y-4">
            {formData.members.map((member, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-lg border border-slate-200 p-4"
              >
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Tenant *
                    </label>
                    <select
                      required
                      value={member.tenantId}
                      onChange={(e) =>
                        updateMember(index, "tenantId", e.target.value)
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select a tenant</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.firstName} {tenant.lastName} ({tenant.email})
                        </option>
                      ))}
                    </select>
                    {tenants.length === 0 && !showNewTenantForm && (
                      <p className="mt-1 text-xs text-slate-500">
                        No tenants available. Click &quot;Create New Tenant&quot; to add one.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`primary-${index}`}
                      checked={member.isPrimary}
                      onChange={(e) =>
                        updateMember(index, "isPrimary", e.target.checked)
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`primary-${index}`}
                      className="text-sm text-slate-700"
                    >
                      Primary tenant
                    </label>
                  </div>
                </div>

                {formData.members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    className="mt-6 text-red-600 hover:text-red-700"
                  >
                    <svg
                      className="h-5 w-5"
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
                )}
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-500">
            At least one tenant member is required. You can add more tenants
            after creating the tenancy using the &quot;Add Tenant&quot; button.
          </p>
        </section>

        <div className="flex justify-end gap-3">
          <Link
            href="/tenancies"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isLoading || showNewUnitForm || showNewTenantForm}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Create Tenancy"}
          </button>
        </div>
      </form>
    </div>
  );
}
