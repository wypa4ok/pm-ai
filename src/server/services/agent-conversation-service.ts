import { prisma, logMessage, saveAgentEvent } from "../db";
import { updateTicket } from "./ticket-service";
import { searchContractorsWithAI } from "./contractor-service";
import { generateContractorOutreach } from "../ai/message-generator";
import { runConversationTurn } from "../ai/agent-conversation";
import type {
  AgentConversation,
  AgentConversationMessage,
  ActionProposal,
  Prisma,
} from "@prisma/client";

type ConversationWithDetails = AgentConversation & {
  messages: AgentConversationMessage[];
  proposals: ActionProposal[];
};

export async function getActiveConversation(
  ticketId: string,
): Promise<ConversationWithDetails | null> {
  return prisma.agentConversation.findFirst({
    where: { ticketId, status: "ACTIVE" },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      proposals: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function createConversation(
  ticketId: string,
  userId: string,
): Promise<{
  conversation: ConversationWithDetails;
  initialResponse: AgentConversationMessage;
  proposals: ActionProposal[];
}> {
  // Close any existing active conversations
  await prisma.agentConversation.updateMany({
    where: { ticketId, status: "ACTIVE" },
    data: { status: "CLOSED" },
  });

  // Create a new conversation
  const conversation = await prisma.agentConversation.create({
    data: { ticketId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      proposals: { orderBy: { createdAt: "asc" } },
    },
  });

  // Run initial analysis turn with an explicit starter message
  const initialPrompt =
    "Please analyze this ticket. Diagnose the issue, assess the current priority and category, and present 2-3 recommended approaches with trade-offs.";
  const result = await runConversationTurn(conversation, ticketId, initialPrompt, userId);

  // Log agent event (only set actorId if it's a real UUID, not "system")
  await saveAgentEvent({
    ticketId,
    actorId: userId !== "system" ? userId : null,
    type: "NOTE_ADDED",
    note: "AI agent conversation started",
  });

  // Reload with all messages and proposals
  const updated = await prisma.agentConversation.findUniqueOrThrow({
    where: { id: conversation.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      proposals: { orderBy: { createdAt: "asc" } },
    },
  });

  return {
    conversation: updated,
    initialResponse: result.assistantMessage,
    proposals: result.proposals,
  };
}

export async function sendMessage(
  conversationId: string,
  ticketId: string,
  userId: string,
  message: string,
): Promise<{
  assistantMessage: AgentConversationMessage;
  proposals: ActionProposal[];
}> {
  const conversation = await prisma.agentConversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      proposals: { orderBy: { createdAt: "asc" } },
    },
  });

  if (conversation.status !== "ACTIVE") {
    throw new Error("Cannot send message to a closed conversation");
  }

  return runConversationTurn(conversation, ticketId, message, userId);
}

export async function resolveProposal(
  proposalId: string,
  userId: string,
  action: "accept" | "reject",
  ticketId: string,
): Promise<ActionProposal> {
  const proposal = await prisma.actionProposal.findUniqueOrThrow({
    where: { id: proposalId },
  });

  if (proposal.status !== "PENDING") {
    throw new Error("Proposal has already been resolved");
  }

  const status = action === "accept" ? "ACCEPTED" : "REJECTED";

  let executionResult: Record<string, unknown> | null = null;

  if (action === "accept") {
    executionResult = await executeProposal(proposal, ticketId, userId);
  }

  return prisma.actionProposal.update({
    where: { id: proposalId },
    data: {
      status,
      resolvedByUserId: userId,
      resolvedAt: new Date(),
      executionResult: (executionResult as Prisma.InputJsonValue) ?? undefined,
    },
  });
}

async function executeProposal(
  proposal: ActionProposal,
  ticketId: string,
  userId: string,
): Promise<Record<string, unknown>> {
  const payload = proposal.payload as Record<string, unknown>;

  try {
    switch (proposal.actionType) {
      case "update_priority": {
        const ticket = await updateTicket(ticketId, {
          priority: payload.priority as never,
        });
        return { success: true, updatedPriority: ticket.priority };
      }

      case "update_status": {
        const ticket = await updateTicket(ticketId, {
          status: payload.status as never,
        });
        return { success: true, updatedStatus: ticket.status };
      }

      case "update_category": {
        const ticket = await updateTicket(ticketId, {
          category: payload.category as never,
        });
        return { success: true, updatedCategory: ticket.category };
      }

      case "add_note": {
        // Get the ticket to find ownerUserId
        const ticket = await prisma.ticket.findUniqueOrThrow({
          where: { id: ticketId },
        });
        await logMessage({
          ticketId,
          authorId: userId,
          ownerUserId: ticket.ownerUserId,
          direction: "INTERNAL",
          channel: "INTERNAL",
          bodyText: payload.note as string,
        });
        return { success: true, noteAdded: true };
      }

      case "search_contractors": {
        const result = await searchContractorsWithAI({
          ticketId,
          forceExternal: (payload.forceExternal as boolean) ?? false,
        });
        return {
          success: true,
          contractorsFound: result.internalContractors.length + result.externalContractors.length,
          source: result.source,
        };
      }

      case "generate_message": {
        const contractorId = payload.contractorId as string;
        const tone = (payload.tone as "formal" | "friendly" | "urgent") ?? "friendly";
        // Look up contractor
        const contractor = await prisma.contractor.findUnique({
          where: { id: contractorId },
        });
        if (!contractor) {
          return { success: false, error: "Contractor not found" };
        }
        const outreach = await generateContractorOutreach({
          ticketId,
          contractor,
          tone,
        });
        return {
          success: true,
          subject: outreach.subject,
          body: outreach.body,
        };
      }

      default:
        return { success: false, error: `Unknown action type: ${proposal.actionType}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
