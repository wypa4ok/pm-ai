import { randomUUID } from "node:crypto";
import type {
  Response as OpenAIResponse,
  ResponseFunctionToolCall,
  ResponseInput,
} from "openai/resources/responses/responses";
import { getOpenAIClient, buildReasoningOptions } from "./client";
import { buildSystemPrompt } from "./prompt";
import {
  categorizeAndTriageTool,
  searchContractorsTool,
  CategorizeAndTriageInputSchema,
  SearchContractorsInputSchema,
  type ToolInputByName,
  type ToolResultByName,
  type ToolName,
  type CategorizeAndTriageResult,
  type SearchContractorsResult,
} from "./tools";
import type { ConversationMessage } from "../../../packages/services/ports";
import {
  MessageChannel,
  MessageDirection,
  AgentEventType,
  TicketCategory,
} from "@prisma/client";
import { saveAgentEvent } from "../db";
import type { ZodSchema, SafeParseReturnType } from "zod";

const TICKET_ID_METADATA_KEY = "ticket_id";

type ResponseCreateParamsTool = {
  type: "function";
  name: string;
  description?: string | null;
  strict: boolean | null;
  parameters: Record<string, unknown> | null;
};

const CATEGORIZE_TOOL_PARAMETERS: ResponseCreateParamsTool["parameters"] = {
  type: "object",
  additionalProperties: false,
  required: [
    "ticketId",
    "subject",
    "latestMessageText",
    "direction",
    "channel",
  ],
  properties: {
    ticketId: { type: "string", format: "uuid" },
    subject: { type: "string", minLength: 1 },
    latestMessageText: { type: "string", minLength: 1 },
    direction: {
      type: "string",
      enum: Object.values(MessageDirection),
    },
    channel: {
      type: "string",
      enum: Object.values(MessageChannel),
    },
    hintedCategory: {
      type: "string",
      enum: Object.values(TicketCategory),
    },
    tenantEmotion: {
      type: "string",
      enum: ["CALM", "FRUSTRATED", "URGENT", "PANICKED"],
    },
  },
};

const SEARCH_TOOL_PARAMETERS: ResponseCreateParamsTool["parameters"] = {
  type: "object",
  additionalProperties: false,
  required: ["ticketId", "category"],
  properties: {
    ticketId: { type: "string", format: "uuid" },
    category: {
      type: "string",
      enum: Object.values(TicketCategory),
    },
    location: {
      type: "object",
      additionalProperties: false,
      required: [],
      properties: {
        postalCode: {
          type: "string",
          pattern: "[A-Za-z]\\d[A-Za-z]\\s?\\d[A-Za-z]\\d",
        },
        latitude: { type: "number", minimum: -90, maximum: 90 },
        longitude: { type: "number", minimum: -180, maximum: 180 },
      },
    },
    specialty: { type: "string", maxLength: 120 },
    limit: { type: "integer", minimum: 1, maximum: 10, default: 3 },
  },
};

const FUNCTION_TOOLS: ResponseCreateParamsTool[] = [
  {
    type: "function",
    name: categorizeAndTriageTool.name,
    description: categorizeAndTriageTool.description,
    strict: true,
    parameters: CATEGORIZE_TOOL_PARAMETERS,
  },
  {
    type: "function",
    name: searchContractorsTool.name,
    description: searchContractorsTool.description,
    strict: true,
    parameters: SEARCH_TOOL_PARAMETERS,
  },
];

export interface RunAgentParams {
  ticketId: string;
  subject: string;
  ticketSummary: string;
  agentInstructions?: string;
  lastMessage: {
    id: string;
    body: string;
    authorLabel?: string;
    direction: MessageDirection;
    channel: MessageChannel;
    receivedAt: Date;
  };
  conversation?: ConversationMessage[];
  promptContext?: {
    propertyName?: string;
    portfolioName?: string;
    escalationContact?: string;
  };
  hintedCategory?: string;
  contractorSearchContext?: {
    location?: {
      postalCode?: string;
      latitude?: number;
      longitude?: number;
    };
    specialty?: string;
    limit?: number;
  };
  reasoning?: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
  };
}

export interface ToolHandlers {
  categorize_and_triage: (
    input: ToolInputByName<"categorize_and_triage">,
  ) => Promise<ToolResultByName<"categorize_and_triage">>;
  search_contractors?: (
    input: ToolInputByName<"search_contractors">,
  ) => Promise<ToolResultByName<"search_contractors">>;
}

export interface ToolExecutionRecord<Name extends ToolName = ToolName> {
  callId: string;
  tool: Name;
  input: ToolInputByName<Name>;
  output: ToolResultByName<Name> | { error: string };
}

export interface RunAgentResult {
  response: OpenAIResponse;
  triage?: CategorizeAndTriageResult;
  contractors?: SearchContractorsResult;
  toolExecutions: ToolExecutionRecord[];
}

export class ReasonerError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ReasonerError";
  }
}

export async function runAgent(
  params: RunAgentParams,
  handlers: ToolHandlers,
): Promise<RunAgentResult> {
  if (!handlers.categorize_and_triage) {
    throw new ReasonerError(
      "Tool handler categorize_and_triage is required for runAgent",
    );
  }

  const client = getOpenAIClient();
  const { model, temperature, maxOutputTokens } = buildReasoningOptions({
    model: params.reasoning?.model as never,
    temperature: params.reasoning?.temperature,
    maxOutputTokens: params.reasoning?.maxOutputTokens,
  });

  const toolExecutions: ToolExecutionRecord[] = [];
  let triageResult: CategorizeAndTriageResult | undefined;
  let contractorResult: SearchContractorsResult | undefined;

  const initialInput = buildInitialInput(params);

  let response = await client.responses.create({
    model,
    instructions: buildSystemPrompt(params.promptContext),
    input: initialInput,
    temperature,
    max_output_tokens: maxOutputTokens,
    metadata: {
      [TICKET_ID_METADATA_KEY]: params.ticketId,
    },
    tools: FUNCTION_TOOLS,
    parallel_tool_calls: false,
  });

  let guard = 0;
  while (guard < 5) {
    guard += 1;
    const toolCalls = extractFunctionCalls(response);
    if (toolCalls.length === 0) {
      break;
    }

    const toolOutputs: ResponseInput = [];

    for (const call of toolCalls) {
      const execution = await executeToolCall(call, handlers, params);
      toolExecutions.push(execution);
      if (execution.tool === "categorize_and_triage" && "summary" in execution.output) {
        triageResult = execution.output as CategorizeAndTriageResult;
        await logAgentEvent(params.ticketId, AgentEventType.TRIAGE_COMPLETED, execution);
      }

      if (execution.tool === "search_contractors" && "contractors" in execution.output) {
        contractorResult = execution.output as SearchContractorsResult;
        await logAgentEvent(params.ticketId, AgentEventType.TOOL_EXECUTED, execution);
      }

      toolOutputs.push({
        type: "function_call_output",
        call_id: execution.callId,
        output: JSON.stringify(execution.output),
      } as ResponseInput[number]);
    }

    if (toolOutputs.length === 0) {
      break;
    }

    response = await client.responses.create({
      model,
      previous_response_id: response.id,
      input: toolOutputs,
      temperature,
      max_output_tokens: maxOutputTokens,
      metadata: {
        [TICKET_ID_METADATA_KEY]: params.ticketId,
      },
      tools: FUNCTION_TOOLS,
      parallel_tool_calls: false,
    });
  }

  return {
    response,
    triage: triageResult,
    contractors: contractorResult,
    toolExecutions,
  };
}

async function executeToolCall(
  call: ResponseFunctionToolCall,
  handlers: ToolHandlers,
  params: RunAgentParams,
): Promise<ToolExecutionRecord> {
  const callId = call.id ?? call.call_id ?? randomUUID();
  const name = call.name as ToolName;
  const argumentsJSON = call.arguments ?? "{}";

  if (name === "categorize_and_triage") {
    const parsedArgs = parseToolArguments<"categorize_and_triage">(
      argumentsJSON,
      CategorizeAndTriageInputSchema,
    );
    if (!parsedArgs.success) {
      return {
        callId,
        tool: name,
        input: parsedArgs.raw as ToolInputByName<typeof name>,
        output: {
          error: `Invalid arguments: ${parsedArgs.error}`,
        },
      };
    }

    const result = await handlers.categorize_and_triage({
      ...parsedArgs.data,
      ticketId: params.ticketId,
    });
    return {
      callId,
      tool: name,
      input: parsedArgs.data,
      output: result,
    };
  }

  if (name === "search_contractors") {
    if (!handlers.search_contractors) {
      return {
        callId,
        tool: name,
        input: parseRaw(argumentsJSON) as ToolInputByName<typeof name>,
        output: {
          error: "search_contractors handler is not configured.",
        },
      };
    }

    const parsedArgs = parseToolArguments<"search_contractors">(
      argumentsJSON,
      SearchContractorsInputSchema,
    );

    if (!parsedArgs.success) {
      return {
        callId,
        tool: name,
        input: parsedArgs.raw as ToolInputByName<typeof name>,
        output: {
          error: `Invalid arguments: ${parsedArgs.error}`,
        },
      };
    }

    const resolvedInput = {
      ...parsedArgs.data,
      ticketId: params.ticketId,
    };

    if (
      !resolvedInput.location &&
      params.contractorSearchContext?.location?.postalCode
    ) {
      resolvedInput.location = {
        postalCode: params.contractorSearchContext.location.postalCode,
        latitude: params.contractorSearchContext.location.latitude,
        longitude: params.contractorSearchContext.location.longitude,
      };
    }

    if (
      !resolvedInput.specialty &&
      params.contractorSearchContext?.specialty
    ) {
      resolvedInput.specialty = params.contractorSearchContext.specialty;
    }

    if (
      (resolvedInput.limit === undefined || resolvedInput.limit === null) &&
      params.contractorSearchContext?.limit
    ) {
      resolvedInput.limit = params.contractorSearchContext.limit;
    }

    const result = await handlers.search_contractors(resolvedInput);
    return {
      callId,
      tool: name,
      input: resolvedInput,
      output: result,
    };
  }

  return {
    callId,
    tool: name,
    input: parseRaw(argumentsJSON) as ToolInputByName<typeof name>,
    output: {
      error: `Unsupported tool "${name}"`,
    },
  };
}

function extractFunctionCalls(response: OpenAIResponse): ResponseFunctionToolCall[] {
  const calls: ResponseFunctionToolCall[] = [];

  for (const output of response.output ?? []) {
    if (output.type === "function_call") {
      calls.push(output);
    }
  }

  return calls;
}

function buildInitialInput(params: RunAgentParams): ResponseInput {
  return [
    {
      role: "user",
      type: "message",
      content: buildUserPrompt(params),
    },
  ];
}

function buildUserPrompt(params: RunAgentParams): string {
  const lines: string[] = [];

  lines.push(`# Ticket Summary`);
  lines.push(params.ticketSummary.trim());
  lines.push("");

  lines.push(`# Latest Message`);
  lines.push(`Channel: ${params.lastMessage.channel}`);
  lines.push(`Direction: ${params.lastMessage.direction}`);
  if (params.lastMessage.authorLabel) {
    lines.push(`Author: ${params.lastMessage.authorLabel}`);
  }
  lines.push(`Received: ${params.lastMessage.receivedAt.toISOString()}`);
  lines.push("");
  lines.push(params.lastMessage.body.trim());
  lines.push("");

  if (params.conversation?.length) {
    lines.push(`# Conversation Snippet`);
    for (const message of params.conversation.slice(-6)) {
      lines.push(
        `- [${message.role}] (${message.channel}) ${message.timestamp.toISOString()}: ${message.body}`,
      );
    }
    lines.push("");
  }

  if (params.agentInstructions) {
    lines.push(`# Agent Instructions`);
    lines.push(params.agentInstructions.trim());
    lines.push("");
  }

  if (params.hintedCategory) {
    lines.push(`# Category Hint`);
    lines.push(params.hintedCategory);
    lines.push("");
  }

  lines.push(`# Tool Guidance`);
  lines.push(
    "- Use categorize_and_triage first to classify urgency and capture a short summary/checklist.",
  );
  lines.push(
    "- Call search_contractors when additional contractor suggestions would help move the ticket forward.",
  );
  if (params.contractorSearchContext?.location?.postalCode) {
    lines.push(
      `- Default postal code for contractor search: ${params.contractorSearchContext.location.postalCode}.`,
    );
  }
  if (params.contractorSearchContext?.specialty) {
    lines.push(
      `- Preferred specialty: ${params.contractorSearchContext.specialty}.`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

async function logAgentEvent(
  ticketId: string,
  type: AgentEventType,
  execution: ToolExecutionRecord,
) {
  try {
    await saveAgentEvent({
      ticketId,
      type,
      payload: execution.output,
      note: `Tool ${execution.tool} executed`,
    });
  } catch (error) {
    console.error("Failed to log agent event", { error, execution });
  }
}

function parseToolArguments<Name extends ToolName>(
  json: string,
  schema: ZodSchema,
) {
  const raw = parseRaw(json);
  const parsed = schema.safeParse(raw) as SafeParseReturnType<
    unknown,
    ToolInputByName<Name>
  >;
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.message,
      raw,
    };
  }
  return {
    success: true as const,
    data: parsed.data as ToolInputByName<Name>,
    raw,
  };
}

function parseRaw(json: string) {
  try {
    return json ? JSON.parse(json) : {};
  } catch (error) {
    console.warn("Failed to parse tool arguments", { error, json });
    return {};
  }
}
