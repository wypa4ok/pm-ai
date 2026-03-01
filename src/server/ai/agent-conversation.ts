import type {
  ResponseFunctionToolCall,
  ResponseInput,
} from "openai/resources/responses/responses";
import { getOpenAIClient, buildReasoningOptions } from "./client";
import { buildConversationalSystemPrompt } from "./prompt";
import {
  CONVERSATION_TOOLS,
  executeConversationTool,
  type ConversationToolName,
} from "./conversation-tools";
import { prisma } from "../db";
import type { Prisma } from "@prisma/client";
import type {
  AgentConversation,
  AgentConversationMessage,
  ActionProposal,
} from "@prisma/client";

export interface ConversationTurnResult {
  assistantMessage: AgentConversationMessage;
  proposals: ActionProposal[];
}

interface ConversationWithMessages extends AgentConversation {
  messages: AgentConversationMessage[];
}

export async function runConversationTurn(
  conversation: ConversationWithMessages,
  ticketId: string,
  newUserMessage?: string,
  userId?: string,
): Promise<ConversationTurnResult> {
  const client = getOpenAIClient();
  const { model, temperature } = buildReasoningOptions({
    maxOutputTokens: 2000,
  });

  // Load ticket context for the system prompt
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      tenant: true,
      unit: true,
    },
  });

  const systemPrompt = buildConversationalSystemPrompt({
    ticketSubject: ticket?.subject,
    ticketCategory: ticket?.category,
    ticketPriority: ticket?.priority,
    ticketStatus: ticket?.status,
    tenantName: ticket?.tenant
      ? `${ticket.tenant.firstName} ${ticket.tenant.lastName}`
      : undefined,
    unitName: ticket?.unit?.name,
  });

  // Build message history for OpenAI
  const messages = conversation.messages;
  const input = buildOpenAIInput(messages, conversation.summary, newUserMessage);

  // Save user message if provided
  if (newUserMessage) {
    await prisma.agentConversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: newUserMessage,
        authorUserId: userId && userId !== "system" ? userId : null,
      },
    });
  }

  // Call OpenAI with tool loop
  let response = await client.responses.create({
    model,
    instructions: systemPrompt,
    input,
    temperature,
    max_output_tokens: 2000,
    tools: CONVERSATION_TOOLS,
    parallel_tool_calls: false,
  });

  // Tool-calling loop (up to 5 iterations)
  let guard = 0;
  while (guard < 5) {
    guard += 1;
    const toolCalls = extractFunctionCalls(response);
    if (toolCalls.length === 0) break;

    const toolOutputs: ResponseInput = [];

    for (const call of toolCalls) {
      const callId = call.call_id;
      const name = call.name as ConversationToolName;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.arguments ?? "{}");
      } catch {
        args = {};
      }

      // Always override ticketId with the real one
      args.ticketId = ticketId;

      const result = await executeConversationTool(name, args);

      // Save tool result as a message
      await prisma.agentConversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: "TOOL_RESULT",
          content: JSON.stringify(result),
          metadata: { tool: name, callId },
        },
      });

      toolOutputs.push({
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(result),
      } as ResponseInput[number]);
    }

    if (toolOutputs.length === 0) break;

    response = await client.responses.create({
      model,
      previous_response_id: response.id,
      input: toolOutputs,
      temperature,
      max_output_tokens: 2000,
      tools: CONVERSATION_TOOLS,
      parallel_tool_calls: false,
    });
  }

  // Extract text content from response
  const assistantText = extractTextContent(response);

  // Parse proposals from the assistant's response
  const parsedProposals = parseProposals(assistantText);

  // Save assistant message
  const assistantMessage = await prisma.agentConversationMessage.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: assistantText,
      metadata: {
        model,
        responseId: response.id,
      },
    },
  });

  // Save proposals
  const proposals: ActionProposal[] = [];
  for (const p of parsedProposals) {
    const proposal = await prisma.actionProposal.create({
      data: {
        conversationId: conversation.id,
        actionType: p.actionType,
        description: p.description,
        payload: p.payload as Prisma.InputJsonValue,
      },
    });
    proposals.push(proposal);
  }

  // Update conversation summary if message count is high
  const totalMessages = await prisma.agentConversationMessage.count({
    where: { conversationId: conversation.id },
  });
  if (totalMessages > 30 && totalMessages % 10 === 0) {
    await updateConversationSummary(conversation.id);
  }

  return { assistantMessage, proposals };
}

function buildOpenAIInput(
  messages: AgentConversationMessage[],
  summary: string | null,
  newUserMessage?: string,
): ResponseInput {
  const input: ResponseInput = [];

  // If we have a summary and many messages, use summary + recent messages
  if (summary && messages.length > 15) {
    input.push({
      role: "user",
      type: "message",
      content: `[Previous conversation summary]\n${summary}`,
    });

    // Only include last 15 messages
    const recentMessages = messages.slice(-15);
    for (const msg of recentMessages) {
      if (msg.role === "USER") {
        input.push({
          role: "user",
          type: "message",
          content: msg.content,
        });
      } else if (msg.role === "ASSISTANT") {
        input.push({
          role: "assistant",
          type: "message",
          content: [{ type: "output_text", text: msg.content }],
        } as ResponseInput[number]);
      }
    }
  } else {
    // Include all messages
    for (const msg of messages) {
      if (msg.role === "USER") {
        input.push({
          role: "user",
          type: "message",
          content: msg.content,
        });
      } else if (msg.role === "ASSISTANT") {
        input.push({
          role: "assistant",
          type: "message",
          content: [{ type: "output_text", text: msg.content }],
        } as ResponseInput[number]);
      }
    }
  }

  // Add the new user message
  if (newUserMessage) {
    input.push({
      role: "user",
      type: "message",
      content: newUserMessage,
    });
  }

  // If no messages at all, send an initial prompt
  if (input.length === 0) {
    input.push({
      role: "user",
      type: "message",
      content:
        "Please analyze this ticket and provide your initial diagnosis with 2-3 recommended approaches.",
    });
  }

  return input;
}

interface ParsedProposal {
  actionType: string;
  description: string;
  payload: Record<string, unknown>;
}

function parseProposals(text: string): ParsedProposal[] {
  const proposals: ParsedProposal[] = [];
  const regex =
    /\[PROPOSAL:(\w+)\]\s*\n?description:\s*(.+?)\s*\n?payload:\s*(\{[\s\S]*?\})\s*\n?\[\/PROPOSAL\]/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const actionType = match[1];
    const description = match[2].trim();
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(match[3]);
    } catch {
      payload = { raw: match[3] };
    }
    proposals.push({ actionType, description, payload });
  }

  return proposals;
}

function extractFunctionCalls(
  response: { output?: Array<{ type: string }> },
): ResponseFunctionToolCall[] {
  const calls: ResponseFunctionToolCall[] = [];
  for (const output of response.output ?? []) {
    if (output.type === "function_call") {
      calls.push(output as ResponseFunctionToolCall);
    }
  }
  return calls;
}

function extractTextContent(response: {
  output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
}): string {
  const parts: string[] = [];
  for (const output of response.output ?? []) {
    if (output.type === "message" && output.content) {
      for (const block of output.content) {
        if (block.type === "output_text" && block.text) {
          parts.push(block.text);
        }
      }
    }
  }
  return parts.join("\n") || "I was unable to generate a response. Please try again.";
}

async function updateConversationSummary(conversationId: string): Promise<void> {
  try {
    const client = getOpenAIClient();
    const messages = await prisma.agentConversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });

    const transcript = messages
      .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
      .map((m) => `${m.role}: ${m.content.slice(0, 500)}`)
      .join("\n\n");

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          type: "message",
          content: `Summarize this conversation between a property manager and an AI assistant in 3-5 sentences, capturing key decisions, proposals made, and current status:\n\n${transcript}`,
        },
      ],
      temperature: 0.1,
      max_output_tokens: 300,
    });

    const summary = extractTextContent(response);
    await prisma.agentConversation.update({
      where: { id: conversationId },
      data: { summary },
    });
  } catch (error) {
    console.error("Failed to update conversation summary", error);
  }
}
