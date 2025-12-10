import { getOpenAIClient } from "./client";
import { prisma } from "../db";
import type { ExternalContractorProfile } from "../integrations/contractor-search";
import type { Contractor } from "@prisma/client";

export interface GenerateContractorOutreachInput {
  ticketId: string;
  contractor: Contractor | ExternalContractorProfile;
  tone?: "formal" | "friendly" | "urgent";
}

export interface ContractorOutreachMessage {
  subject: string;
  body: string;
  metadata: {
    generatedAt: string;
    model: string;
    tokensUsed: number;
    contractorName: string;
    contractorSource: string;
  };
}

/**
 * Generates a professional contractor outreach message using AI
 * Includes ticket context, property details, and urgency
 */
export async function generateContractorOutreach(
  input: GenerateContractorOutreachInput,
): Promise<ContractorOutreachMessage> {
  // Fetch ticket with related data
  const ticket = await prisma.ticket.findUnique({
    where: { id: input.ticketId },
    include: {
      unit: true,
      tenant: true,
      messages: {
        orderBy: { sentAt: "desc" },
        take: 3,
      },
    },
  });

  if (!ticket) {
    throw new Error(`Ticket ${input.ticketId} not found`);
  }

  const contractor = input.contractor;
  const tone = input.tone || inferToneFromPriority(ticket.priority);

  // Build context
  const property = ticket.unit
    ? `${ticket.unit.address1}, ${ticket.unit.city}, ${ticket.unit.state} ${ticket.unit.postalCode}`
    : "Property address not available";

  const tenantInfo = ticket.tenant
    ? `${ticket.tenant.firstName} ${ticket.tenant.lastName}`
    : "Tenant";

  const urgencyNote = ticket.priority === "URGENT" || ticket.priority === "HIGH"
    ? "This is a high-priority issue that requires prompt attention."
    : "";

  const toneGuidance = {
    formal: "Use professional business language, avoid contractions. Be respectful and direct.",
    friendly: "Use warm, approachable language while remaining professional. Show appreciation for their time.",
    urgent: "Convey urgency clearly while remaining professional and courteous. Emphasize time-sensitive nature.",
  };

  const prompt = `You are drafting an outreach email to a contractor on behalf of a property manager.

CONTEXT:
- Issue: ${ticket.subject}
- Details: ${ticket.description || "Tenant reported a maintenance issue"}
- Property: ${property}
- Tenant: ${tenantInfo}
- Priority: ${ticket.priority}
- Contractor: ${contractor.name}
${urgencyNote}

TONE: ${toneGuidance[tone]}

REQUIREMENTS:
1. Professional and concise (under 200 words)
2. Clearly describe the specific issue
3. Include property address
4. Request availability and preliminary quote
5. Provide contact information for follow-up
6. Match the ${tone} tone
7. Use proper email greeting and signature
8. Sign as "Property Management Team"

OUTPUT FORMAT (JSON only, no markdown):
{
  "subject": "Brief, professional subject line",
  "body": "Complete email body with greeting, details, and signature"
}`;

  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 600,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  const result = JSON.parse(content) as { subject: string; body: string };

  // Log the message generation as an agent event
  await prisma.agentEvent.create({
    data: {
      ticketId: ticket.id,
      type: "MESSAGE_GENERATED",
      note: `AI-generated contractor outreach to ${contractor.name}`,
      payload: {
        contractorId: "id" in contractor ? contractor.id : contractor.name,
        subject: result.subject,
        bodyPreview: result.body.substring(0, 100),
      },
    },
  });

  return {
    subject: result.subject,
    body: result.body,
    metadata: {
      generatedAt: new Date().toISOString(),
      model: "gpt-4o-mini",
      tokensUsed: response.usage?.total_tokens || 0,
      contractorName: contractor.name,
      contractorSource: "source" in contractor ? contractor.source : "internal",
    },
  };
}

/**
 * Infer tone from ticket priority
 */
function inferToneFromPriority(priority: string): "formal" | "friendly" | "urgent" {
  switch (priority) {
    case "URGENT":
      return "urgent";
    case "HIGH":
      return "formal";
    case "MEDIUM":
      return "friendly";
    case "LOW":
    default:
      return "friendly";
  }
}

/**
 * Helper function to determine if contractor is internal or external
 */
export function isInternalContractor(
  contractor: Contractor | ExternalContractorProfile,
): contractor is Contractor {
  return !("source" in contractor) || contractor.source !== "google";
}
