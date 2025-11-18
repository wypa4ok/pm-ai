"use client";

import { useEffect, useState } from "react";
import Composer, { type ComposerPayload } from "./Composer";

type Contractor = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  source: string;
};

interface ContractorPanelProps {
  category: string;
  location?: string;
  specialty?: string;
  onInsert?: (text: string) => void;
}

export default function ContractorPanel({
  category,
  location = "Saint John, NB, Canada",
  specialty,
  onInsert,
}: ContractorPanelProps) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Contractor | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          category: category || "handyman",
          location,
          term: specialty || "handyman",
        });
        const response = await fetch(`/api/contractors/external?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch contractors");
        const data = await response.json();
        if (mounted) setContractors(data.contractors ?? []);
      } catch (err) {
        console.error(err);
        if (mounted) setError("Contractor search failed.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [category, location, specialty]);

  useEffect(() => {
    if (selected) {
      setDraft(buildOutreachDraft(selected));
    }
  }, [selected]);

  async function handleSend(payload: ComposerPayload) {
    if (onInsert && selected) {
      const insertText = [
        `Suggested contractor: ${selected.name}`,
        selected.phone ? `Phone: ${selected.phone}` : null,
        selected.email ? `Email: ${selected.email}` : null,
        `Channel: ${payload.channel}`,
        "",
        payload.body,
      ]
        .filter(Boolean)
        .join("\n");
      onInsert(insertText);
    }
    setDraft("");
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Nearby contractors</h3>
        {loading ? <span className="text-xs text-slate-500">Loading…</span> : null}
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      ) : contractors.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No suggestions yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {contractors.map((contractor) => (
            <li
              key={contractor.id}
              className={`rounded-md border px-3 py-2 text-sm ${
                selected?.id === contractor.id ? "border-blue-300 bg-blue-50" : "border-slate-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{contractor.name}</p>
                  <p className="text-xs text-slate-500">
                    {contractor.address ?? contractor.source}
                  </p>
                  {contractor.rating ? (
                    <p className="text-xs text-slate-500">
                      {contractor.rating.toFixed(1)} • {contractor.reviewCount ?? 0} reviews
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {contractor.source}
                  </span>
                  <button
                    className="text-xs font-medium text-blue-600 hover:text-blue-500"
                    onClick={() => setSelected(contractor)}
                  >
                    {selected?.id === contractor.id ? "Selected" : "Select"}
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-col gap-1 text-xs text-slate-600">
                {contractor.phone ? <span>{contractor.phone}</span> : null}
                {contractor.email ? <span>{contractor.email}</span> : null}
                {contractor.website ? (
                  <a
                    href={contractor.website}
                    className="text-blue-600 hover:text-blue-500"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {contractor.website}
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-500">Outreach draft</p>
          <Composer
            ticketId={"draft"}
            draft={draft}
            onSend={handleSend}
            to={selected.email ?? selected.phone}
          />
        </div>
      ) : null}
    </div>
  );
}

function buildOutreachDraft(contractor: Contractor): string {
  return [
    `Hi ${contractor.name},`,
    ``,
    `We have a tenant issue that matches your trade (${contractor.source}).`,
    `Could you confirm availability and share a quick estimate?`,
    ``,
    `Thanks!`,
  ].join("\n");
}
