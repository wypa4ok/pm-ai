"use client";

import { useState } from "react";
import KanbanBoard from "./KanbanBoard";
import TicketTable from "./TicketTable";

type TicketRow = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  channel: string;
  openedAt: string;
  tenantName?: string;
  unitName?: string;
  latestMessageSnippet?: string;
};

interface TicketsViewProps {
  tickets: TicketRow[];
}

type ViewMode = "kanban" | "list";

export default function TicketsView({ tickets }: TicketsViewProps) {
  const [view, setView] = useState<ViewMode>("kanban");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-border bg-surface-alt p-0.5">
          <button
            onClick={() => setView("kanban")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              view === "kanban"
                ? "bg-accent text-surface-deep"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setView("list")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              view === "list"
                ? "bg-accent text-surface-deep"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            List
          </button>
        </div>
        <span className="text-sm text-text-secondary">{tickets.length} tickets</span>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-secondary">
          No tickets match the current filters.
        </div>
      ) : view === "kanban" ? (
        <KanbanBoard tickets={tickets} />
      ) : (
        <div className="rounded-xl border border-border bg-surface shadow-sm">
          <TicketTable tickets={tickets} />
        </div>
      )}
    </div>
  );
}
