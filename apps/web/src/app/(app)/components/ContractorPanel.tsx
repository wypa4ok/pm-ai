"use client";

import { useState } from "react";
import Composer, { type ComposerPayload } from "./Composer";

type Contractor = {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  source: "internal" | "google";
};

type AIAnalysis = {
  maintenanceType: string;
  urgency: string;
  requiredTrade: string[];
  specialty: string;
  keywords: string[];
  searchQuery: string;
  summary: string;
};

interface ContractorPanelProps {
  ticketId: string;
  onInsert?: (text: string) => void;
}

export default function ContractorPanel({
  ticketId,
  onInsert,
}: ContractorPanelProps) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [searchingAI, setSearchingAI] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Contractor | null>(null);
  const [draft, setDraft] = useState("");
  const [draftMetadata, setDraftMetadata] = useState<any>(null);

  // AI-powered contractor search
  async function handleAISearch() {
    setSearchingAI(true);
    setError(null);
    setContractors([]);
    setAnalysis(null);

    try {
      const response = await fetch(`/api/v1/tickets/${ticketId}/analyze-contractors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceExternal: false }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "AI analysis failed");
      }

      const data = await response.json();
      setAnalysis(data.analysis);

      // Combine internal and external contractors
      const allContractors = [
        ...data.contractors.internal,
        ...data.contractors.external,
      ];

      setContractors(allContractors);
      console.log(`AI Search found ${allContractors.length} contractors (${data.meta.source})`);
    } catch (err) {
      console.error("AI search error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to analyze ticket. Make sure OPENAI_API_KEY is set.",
      );
    } finally {
      setSearchingAI(false);
    }
  }

  // Generate AI message for selected contractor
  async function handleGenerateMessage(contractor: Contractor) {
    setGeneratingMessage(true);
    setDraft("");
    setDraftMetadata(null);

    try {
      const response = await fetch(`/api/v1/tickets/${ticketId}/draft-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId: contractor.id,
          contractorSource: contractor.source,
          contractorData:
            contractor.source === "google"
              ? {
                  name: contractor.name,
                  phone: contractor.phone,
                  email: contractor.email,
                  website: contractor.website,
                  rating: contractor.rating,
                  reviewCount: contractor.reviewCount,
                  address: contractor.address,
                }
              : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Message generation failed");
      }

      const data = await response.json();
      setDraft(data.body);
      setDraftMetadata(data.metadata);
      console.log(`Generated message for ${contractor.name} using ${data.metadata.model}`);
    } catch (err) {
      console.error("Message generation error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate message",
      );
    } finally {
      setGeneratingMessage(false);
    }
  }

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
        <h3 className="text-sm font-semibold text-slate-900">AI Contractor Search</h3>
        {searchingAI ? (
          <span className="text-xs text-slate-500">Analyzing ticket...</span>
        ) : null}
      </div>

      {/* AI Search Button */}
      {contractors.length === 0 && !searchingAI && (
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600 mb-3">
            Use AI to analyze this ticket and find the best contractors
          </p>
          <button
            onClick={handleAISearch}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={searchingAI}
          >
            {searchingAI ? "Searching..." : "🤖 AI Search"}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-3 rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Analysis Summary */}
      {analysis && (
        <div className="mt-3 rounded-md bg-blue-50 p-3">
          <p className="text-xs font-semibold text-blue-900 mb-1">AI Analysis</p>
          <p className="text-xs text-blue-800">{analysis.summary}</p>
          <p className="text-xs text-blue-600 mt-1">
            Trade: {analysis.requiredTrade.join(", ")} • Urgency: {analysis.urgency}
          </p>
        </div>
      )}

      {/* Contractor List */}
      {contractors.length > 0 && (
        <>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-600">
              Found {contractors.length} contractor{contractors.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={handleAISearch}
              className="text-xs text-blue-600 hover:text-blue-700"
              disabled={searchingAI}
            >
              Refresh
            </button>
          </div>
          <ul className="mt-2 space-y-2">
            {contractors.map((contractor) => (
              <li
                key={contractor.id}
                className={`rounded-md border px-3 py-2 text-sm ${
                  selected?.id === contractor.id
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{contractor.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          contractor.source === "internal"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {contractor.source}
                      </span>
                    </div>
                    {contractor.category && (
                      <p className="text-xs text-slate-500">{contractor.category}</p>
                    )}
                    {contractor.address && (
                      <p className="text-xs text-slate-500">{contractor.address}</p>
                    )}
                    {contractor.rating && (
                      <p className="text-xs text-slate-600 mt-1">
                        ⭐ {contractor.rating.toFixed(1)} • {contractor.reviewCount ?? 0}{" "}
                        reviews
                      </p>
                    )}
                    <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-600">
                      {contractor.phone && <span>📞 {contractor.phone}</span>}
                      {contractor.email && <span>✉️ {contractor.email}</span>}
                      {contractor.website && (
                        <a
                          href={contractor.website}
                          className="text-blue-600 hover:text-blue-500"
                          target="_blank"
                          rel="noreferrer"
                        >
                          🌐 {contractor.website}
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    className="ml-2 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    onClick={() => {
                      setSelected(contractor);
                      handleGenerateMessage(contractor);
                    }}
                    disabled={generatingMessage}
                  >
                    {selected?.id === contractor.id && generatingMessage
                      ? "Generating..."
                      : "Generate Message"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Draft Message */}
      {selected && draft && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-slate-500">
              AI-Generated Outreach
            </p>
            {draftMetadata && (
              <span className="text-xs text-slate-400">
                {draftMetadata.model} • {draftMetadata.tokensUsed} tokens
              </span>
            )}
          </div>
          <Composer
            ticketId={"draft"}
            draft={draft}
            onSend={handleSend}
            to={selected.email ?? selected.phone}
          />
        </div>
      )}
    </div>
  );
}
