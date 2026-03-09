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
  update_priority: "bg-orange-500/20 text-orange-400",
  update_status: "bg-blue-500/20 text-blue-400",
  update_category: "bg-purple-500/20 text-purple-400",
  add_note: "bg-surface-raised text-text-secondary",
  search_contractors: "bg-emerald-500/20 text-emerald-400",
  generate_message: "bg-teal-500/20 text-teal-400",
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
    ACTION_TYPE_COLORS[proposal.actionType] ?? "bg-surface-raised text-text-secondary";
  const badgeLabel =
    ACTION_TYPE_LABELS[proposal.actionType] ?? proposal.actionType;

  const isPending = proposal.status === "PENDING";
  const isAccepted = proposal.status === "ACCEPTED";
  const isRejected = proposal.status === "REJECTED";

  return (
    <div
      className={`my-2 rounded-lg border p-3 ${
        isPending
          ? "border-amber-500/30 bg-amber-500/10"
          : isAccepted
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-red-500/30 bg-red-500/10"
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
            className={`text-xs font-medium ${isAccepted ? "text-emerald-400" : "text-red-400"}`}
          >
            {isAccepted ? "Accepted" : "Rejected"}
          </span>
        )}
      </div>
      <p className="text-sm text-text-secondary">{proposal.description}</p>

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
        <p className="mt-1 text-xs text-emerald-400">
          {(proposal.executionResult as Record<string, unknown>).success
            ? "Action executed successfully"
            : `Error: ${(proposal.executionResult as Record<string, unknown>).error}`}
        </p>
      )}
    </div>
  );
}
