import type {
  AIClient,
  DraftReplyRequest,
  DraftReplyResult,
  TriageRequest,
  TriageResult,
} from "../../services/ports";
import {
  runAgent,
  type RunAgentParams,
  type RunAgentResult,
  type ToolHandlers,
} from "../../../src/server/ai/reasoner";
import type {
  CategorizeAndTriageResult,
  SearchContractorsResult,
} from "../../../src/server/ai/tools";

export interface OpenAIAgentAdapterOptions {
  runAgentParamsMapper?: (request: TriageRequest | DraftReplyRequest) => Partial<RunAgentParams>;
  defaultChannel?: "email" | "whatsapp";
}

export interface OpenAIToolHandlers extends ToolHandlers {
  categorize_and_triage: ToolHandlers["categorize_and_triage"];
  search_contractors?: ToolHandlers["search_contractors"];
}

interface ParsedTriageResult {
  triage: CategorizeAndTriageResult;
  contractors?: SearchContractorsResult;
  response: RunAgentResult["response"];
}

export class OpenAIAgentAdapter implements AIClient {
  constructor(
    private readonly handlers: OpenAIToolHandlers,
    private readonly options: OpenAIAgentAdapterOptions = {},
  ) {}

  async triage(request: TriageRequest): Promise<TriageResult> {
    const agentInput = this.buildRunAgentParams(request);
    const result = await runAgent(agentInput, this.handlers);
    const parsed = this.ensureTriage(result);

    return {
      summary: parsed.triage.summary,
      category: parsed.triage.category,
      urgency: this.mapUrgency(parsed.triage.priority),
      confidence: parsed.triage.priority === "URGENT" ? 0.9 : 0.75,
    };
  }

  async draftReply(request: DraftReplyRequest): Promise<DraftReplyResult> {
    const agentInput = this.buildRunAgentParams(request);
    const result = await runAgent(agentInput, this.handlers);

    return {
      draft: result.response.output_text ?? "",
      rationale: result.triage?.summary ?? undefined,
      tokens: {
        prompt: result.response.usage?.input_tokens ?? 0,
        completion: result.response.usage?.output_tokens ?? 0,
        total: result.response.usage?.total_tokens ?? 0,
      },
    };
  }

  private buildRunAgentParams(
    request: TriageRequest | DraftReplyRequest,
  ): RunAgentParams {
    const defaultChannel = this.options.defaultChannel ?? "email";

    const base: RunAgentParams = {
      ticketId: request.ticketId,
      subject: this.resolveSubject(request),
      ticketSummary: this.resolveSummary(request),
      lastMessage: this.resolveLastMessage(request, defaultChannel),
      conversation: "conversation" in request ? request.conversation : undefined,
      agentInstructions: "instructions" in request ? request.instructions : undefined,
    };

    if (this.options.runAgentParamsMapper) {
      return {
        ...base,
        ...this.options.runAgentParamsMapper(request),
      };
    }

    return base;
  }

  private resolveSubject(request: TriageRequest | DraftReplyRequest): string {
    if (isTriageRequest(request)) {
      return request.subject;
    }

    return request.ticketId;
  }

  private resolveSummary(request: TriageRequest | DraftReplyRequest): string {
    if (isTriageRequest(request)) {
      return request.body;
    }

    return request.conversation
      .map((message) => `${message.role}: ${message.body}`)
      .join("\n");
  }

  private resolveLastMessage(
    request: TriageRequest | DraftReplyRequest,
    defaultChannel: "email" | "whatsapp",
  ): RunAgentParams["lastMessage"] {
    const now = new Date();

    if (isDraftReplyRequest(request) && request.conversation.length > 0) {
      const message = request.conversation[request.conversation.length - 1];
      return {
        id: message.id,
        body: message.body,
        direction: message.role === "assistant" ? "OUTBOUND" : "INBOUND",
        channel: message.channel.toUpperCase() === "WHATSAPP" ? "WHATSAPP" : "EMAIL",
        receivedAt: message.timestamp ?? now,
      };
    }

    return {
      id: request.ticketId,
      body: isTriageRequest(request) ? request.body : request.conversation[0]?.body ?? "",
      direction: "INBOUND",
      channel: defaultChannel.toUpperCase() === "WHATSAPP" ? "WHATSAPP" : "EMAIL",
      receivedAt: now,
    };
  }

  private ensureTriage(result: RunAgentResult): ParsedTriageResult {
    if (!result.triage) {
      throw new Error("Reasoner did not return a triage outcome");
    }

    return {
      triage: result.triage,
      contractors: result.contractors,
      response: result.response,
    };
  }

  private mapUrgency(priority: CategorizeAndTriageResult["priority"]): "low" | "medium" | "high" {
    switch (priority) {
      case "URGENT":
      case "HIGH":
        return "high";
      case "MEDIUM":
        return "medium";
      default:
        return "low";
    }
  }
}

function isTriageRequest(value: TriageRequest | DraftReplyRequest): value is TriageRequest {
  return (value as TriageRequest).subject !== undefined;
}

function isDraftReplyRequest(value: TriageRequest | DraftReplyRequest): value is DraftReplyRequest {
  return Array.isArray((value as DraftReplyRequest).conversation);
}
