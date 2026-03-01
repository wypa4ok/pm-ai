"use client";

import { useState } from "react";

export type Proposal = {
  id: string;
  actionType: string;
  description: string;
  payload: Record<string, unknown>;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  resolvedAt?: string | null;
  executionResult?: Record<string, unknown> | null;
  createdAt?: string;
};

interface ActionProposalCardProps {
  proposal: Proposal;
  ticketId: string;
  onResolved?: (proposal: Proposal) => void;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  update_priority: "Priority",
  update_status: "Status",
  update_category: "Category",
  add_note: "Note",
  search_contractors: "Contractors",
  generate_message: "Message",
};

const ACTION_TYPE_COLORS: Record<string, string> = {
  update_priority: "bg-orange-100 text-orange-800",
  update_status: "bg-blue-100 text-blue-800",
  update_category: "bg-purple-100 text-purple-800",
  add_note: "bg-gray-100 text-gray-800",
  search_contractors: "bg-green-100 text-green-800",
  generate_message: "bg-teal-100 text-teal-800",
};

export default function ActionProposalCard({
  proposal,
  ticketId,
  onResolved,
}: ActionProposalCardProps) {
  const [resolving, setResolving] = useState(false);

  const handleResolve = async (action: "accept" | "reject") => {
    setResolving(true);
    try {
      const response = await fetch(
        `/api/tickets/${ticketId}/agent/proposals/${proposal.id}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        onResolved?.(data.proposal);
      }
    } catch (error) {
      console.error("Failed to resolve proposal", error);
    } finally {
      setResolving(false);
    }
  };

  const badgeColor =
    ACTION_TYPE_COLORS[proposal.actionType] ?? "bg-gray-100 text-gray-800";
  const badgeLabel =
    ACTION_TYPE_LABELS[proposal.actionType] ?? proposal.actionType;

  const isPending = proposal.status === "PENDING";
  const isAccepted = proposal.status === "ACCEPTED";
  const isRejected = proposal.status === "REJECTED";

  return (
    <div
      className={`my-2 rounded-lg border p-3 ${
        isPending
          ? "border-amber-300 bg-amber-50"
          : isAccepted
            ? "border-green-200 bg-green-50"
            : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}
        >
          {badgeLabel}
        </span>
        {!isPending && (
          <span
            className={`text-xs font-medium ${isAccepted ? "text-green-700" : "text-red-700"}`}
          >
            {isAccepted ? "Accepted" : "Rejected"}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-700">{proposal.description}</p>

      {isPending && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => handleResolve("accept")}
            disabled={resolving}
            className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {resolving ? "..." : "Accept"}
          </button>
          <button
            onClick={() => handleResolve("reject")}
            disabled={resolving}
            className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {resolving ? "..." : "Reject"}
          </button>
        </div>
      )}

      {isAccepted && proposal.executionResult && (
        <p className="mt-1 text-xs text-green-600">
          {(proposal.executionResult as Record<string, unknown>).success
            ? "Action executed successfully"
            : `Error: ${(proposal.executionResult as Record<string, unknown>).error}`}
        </p>
      )}
    </div>
  );
}
