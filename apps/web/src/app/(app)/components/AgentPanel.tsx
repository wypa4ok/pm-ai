"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ActionProposalCard, { type Proposal } from "./ActionProposalCard";

type AgentMessage = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL_RESULT";
  content: string;
  createdAt: string;
  authorUserId?: string | null;
};

type Conversation = {
  id: string;
  ticketId: string;
  status: "ACTIVE" | "CLOSED";
  messages: AgentMessage[];
  proposals: Proposal[];
};

interface AgentPanelProps {
  ticketId: string;
}

export default function AgentPanel({ ticketId }: AgentPanelProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    async function loadConversation() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/tickets/${ticketId}/agent/conversation`,
        );
        if (response.ok) {
          const data = await response.json();
          setConversation(data.conversation ?? null);
        } else {
          const data = await response.json().catch(() => null);
          setError(data?.error ?? `Failed to load (${response.status})`);
        }
      } catch (err) {
        console.error("Failed to load conversation", err);
        setError("Network error loading conversation");
      } finally {
        setLoading(false);
      }
    }
    loadConversation();
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages?.length, scrollToBottom]);

  const handleStartAnalysis = async () => {
    setSending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/tickets/${ticketId}/agent/conversation`,
        { method: "POST" },
      );
      if (response.ok) {
        const data = await response.json();
        setConversation(data.conversation);
      } else {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? `Failed to start analysis (${response.status})`);
      }
    } catch (err) {
      console.error("Failed to start analysis", err);
      setError("Network error starting analysis");
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!conversation || !input.trim() || sending) return;

    const userMessage = input.trim();
    setInput("");
    setSending(true);
    setError(null);

    // Optimistically add user message
    const optimisticMessage: AgentMessage = {
      id: `temp-${Date.now()}`,
      role: "USER",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setConversation((prev) =>
      prev
        ? { ...prev, messages: [...prev.messages, optimisticMessage] }
        : prev,
    );

    try {
      const response = await fetch(
        `/api/tickets/${ticketId}/agent/message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversation.id,
            message: userMessage,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        setConversation((prev) => {
          if (!prev) return prev;
          // Replace optimistic message with real one, add assistant message
          const messages = prev.messages
            .filter((m) => m.id !== optimisticMessage.id)
            .concat([
              {
                ...optimisticMessage,
                id: `user-${Date.now()}`,
              },
              data.assistantMessage,
            ]);
          const proposals = [...prev.proposals, ...data.proposals];
          return { ...prev, messages, proposals };
        });
      } else {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? `Failed to send message (${response.status})`);
      }
    } catch (err) {
      console.error("Failed to send message", err);
      setError("Network error sending message");
    } finally {
      setSending(false);
    }
  };

  const handleProposalResolved = (resolved: Proposal) => {
    setConversation((prev) => {
      if (!prev) return prev;
      const proposals = prev.proposals.map((p) =>
        p.id === resolved.id ? resolved : p,
      );
      return { ...prev, proposals };
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        Loading...
      </div>
    );
  }

  // No conversation yet — show start button
  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-900">
            AI Agent Analysis
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Start an interactive analysis to diagnose this issue and explore
            resolution options.
          </p>
        </div>
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <button
          onClick={handleStartAnalysis}
          disabled={sending}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? "Starting analysis..." : "Start Analysis"}
        </button>
      </div>
    );
  }

  // Find proposals associated with each assistant message by timestamp proximity
  const getProposalsForMessage = (msg: AgentMessage): Proposal[] => {
    if (msg.role !== "ASSISTANT") return [];
    const msgTime = new Date(msg.createdAt).getTime();
    return conversation.proposals.filter((p) => {
      if (!p.createdAt) return false;
      const pTime = new Date(p.createdAt).getTime();
      // Proposals created within 5 seconds of the message
      return Math.abs(pTime - msgTime) < 5000;
    });
  };

  const visibleMessages = conversation.messages.filter(
    (m) => m.role === "USER" || m.role === "ASSISTANT" || m.role === "SYSTEM",
  );

  return (
    <div className="flex flex-col h-full">
      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {visibleMessages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "SYSTEM" ? (
              <div className="text-center">
                <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                  {msg.content}
                </span>
              </div>
            ) : msg.role === "USER" ? (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-start">
                <div className="max-w-[80%]">
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 shadow-sm">
                    <p className="whitespace-pre-wrap">{stripProposalMarkers(msg.content)}</p>
                  </div>
                  {getProposalsForMessage(msg).map((proposal) => (
                    <ActionProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      ticketId={ticketId}
                      onResolved={handleProposalResolved}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                Maple is thinking...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Maple about this ticket..."
            disabled={sending || conversation.status !== "ACTIVE"}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={sending || !input.trim() || conversation.status !== "ACTIVE"}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function stripProposalMarkers(text: string): string {
  return text
    .replace(
      /\[PROPOSAL:\w+\]\s*\n?description:\s*.+?\s*\n?payload:\s*\{[\s\S]*?\}\s*\n?\[\/PROPOSAL\]/g,
      "",
    )
    .trim();
}
