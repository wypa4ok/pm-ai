import { getOpenAIClient } from "./client";
import { prisma } from "../db";
import type { TicketCategory, TicketPriority } from "@prisma/client";

export interface ContractorSearchAnalysis {
  maintenanceType: string;
  urgency: "low" | "medium" | "high" | "urgent";
  requiredTrade: string[];
  specialty: string;
  keywords: string[];
  searchQuery: string;
  summary: string;
}

export interface AnalyzeTicketForContractorsInput {
  ticketId: string;
}

/**
 * Analyzes a ticket using AI to extract contractor search parameters
 * Returns intelligent search terms based on ticket content
 */
export async function analyzeTicketForContractors(
  input: AnalyzeTicketForContractorsInput,
): Promise<ContractorSearchAnalysis> {
  // Fetch ticket with related data
  const ticket = await prisma.ticket.findUnique({
    where: { id: input.ticketId },
    include: {
      unit: true,
      messages: {
        orderBy: { sentAt: "desc" },
        take: 5, // Get last 5 messages for context
      },
    },
  });

  if (!ticket) {
    throw new Error(`Ticket ${input.ticketId} not found`);
  }

  // Build context from ticket
  const messagesText = ticket.messages
    .map((m) => `${m.direction}: ${m.bodyText || m.bodyHtml || ""}`)
    .join("\n");

  const prompt = `Analyze this maintenance ticket and extract contractor search parameters.

TICKET INFORMATION:
Subject: ${ticket.subject}
Description: ${ticket.description || "No additional details"}
Category: ${ticket.category}
Priority: ${ticket.priority}
Property: ${ticket.unit?.address1 || "Unknown"}, ${ticket.unit?.city || ""}, ${ticket.unit?.state || ""}

RECENT MESSAGES:
${messagesText || "No messages yet"}

TASK:
Extract the following information to help find the right contractor:
1. Maintenance type (brief description of the issue)
2. Urgency level (low, medium, high, urgent) - consider priority and keywords like "emergency", "urgent", "asap"
3. Required trades - MUST be one or more of these EXACT values: PLUMBING, ELECTRICAL, HVAC, CARPENTRY, PAINTING, ROOFING, LANDSCAPING, APPLIANCE_REPAIR, PEST_CONTROL, GENERAL, CLEANING, OTHER
4. Specific specialty keywords (e.g., "water heater repair", "AC emergency", "leak detection", "roof repair")
5. Search query optimized for Google Maps (combine trade + specialty + urgency if needed)
6. Brief summary of the issue for contractor outreach

IMPORTANT: The "keywords" field should include search terms that would match contractor company names (e.g., for roof issues, include "roof", "roofing"; for plumbing, include "plumb", "plumbing", etc.)

Return JSON only:
{
  "maintenanceType": "...",
  "urgency": "low" | "medium" | "high" | "urgent",
  "requiredTrade": ["ROOFING", ...],
  "specialty": "...",
  "keywords": ["roof", "roofing", "leak", ...],
  "searchQuery": "optimized google maps search query",
  "summary": "1-2 sentence summary for contractors"
}`;

  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 500,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  const result = JSON.parse(content) as ContractorSearchAnalysis;

  // Log the analysis as an agent event for debugging
  await prisma.agentEvent.create({
    data: {
      ticketId: ticket.id,
      type: "CONTRACTOR_ANALYSIS" as any,
      note: "AI-generated contractor search analysis",
      payload: result as any,
    },
  });

  return result;
}

/**
 * Maps ticket priority to urgency level
 */
function mapPriorityToUrgency(
  priority: TicketPriority,
): "low" | "medium" | "high" | "urgent" {
  switch (priority) {
    case "URGENT":
      return "urgent";
    case "HIGH":
      return "high";
    case "MEDIUM":
      return "medium";
    case "LOW":
    default:
      return "low";
  }
}

/**
 * Maps ticket category to contractor category
 */
export function mapTicketCategoryToContractorCategory(
  category: TicketCategory,
): string {
  switch (category) {
    case "MAINTENANCE":
      return "GENERAL";
    case "BILLING":
      return "OTHER";
    case "COMMUNICATION":
      return "OTHER";
    case "OPERATIONS":
      return "GENERAL";
    case "OTHER":
    default:
      return "OTHER";
  }
}
