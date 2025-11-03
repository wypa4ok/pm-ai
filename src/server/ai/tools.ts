import { z } from "zod";
import {
  TicketCategory as TicketCategoryEnum,
  TicketPriority as TicketPriorityEnum,
  MessageDirection as MessageDirectionEnum,
  MessageChannel as MessageChannelEnum,
} from "@prisma/client";

type EnumLike = Record<string, string>;

function createEnumSchema<T extends EnumLike>(values: T) {
  return z.nativeEnum(values);
}

export const TicketCategorySchema = createEnumSchema(TicketCategoryEnum);
export const TicketPrioritySchema = createEnumSchema(TicketPriorityEnum);
export const MessageDirectionSchema = createEnumSchema(
  MessageDirectionEnum,
);
export const MessageChannelSchema = createEnumSchema(MessageChannelEnum);

export const CategorizeAndTriageInputSchema = z.object({
  ticketId: z.string().uuid(),
  subject: z.string().min(1),
  latestMessageText: z.string().min(1),
  direction: MessageDirectionSchema,
  channel: MessageChannelSchema,
  hintedCategory: TicketCategorySchema.optional(),
  tenantEmotion: z.enum(["CALM", "FRUSTRATED", "URGENT", "PANICKED"]).optional(),
});

export const CategorizeAndTriageResultSchema = z.object({
  category: TicketCategorySchema,
  priority: TicketPrioritySchema,
  requiresHumanReview: z.boolean().default(false),
  summary: z.string().min(5),
  checklist: z
    .array(
      z.object({
        label: z.string().min(2),
        completed: z.boolean().default(false),
        action: z.string().min(2),
      }),
    )
    .max(8),
  suggestedAssigneeId: z.string().uuid().nullable().optional(),
  tenantUserId: z.string().uuid().nullable().optional(),
});

export type CategorizeAndTriageInput = z.infer<typeof CategorizeAndTriageInputSchema>;
export type CategorizeAndTriageResult = z.infer<typeof CategorizeAndTriageResultSchema>;

export const SearchContractorsInputSchema = z.object({
  ticketId: z.string().uuid(),
  category: TicketCategorySchema,
  location: z
    .object({
      postalCode: z.string().regex(/[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d/, "Invalid Canadian postal code"),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
    })
    .optional(),
  specialty: z.string().max(120).optional(),
  limit: z.number().min(1).max(10).default(3),
});

export const SearchContractorsResultSchema = z.object({
  contractors: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        rating: z.number().min(0).max(5).optional(),
        reviewCount: z.number().int().min(0).optional(),
        distanceKm: z.number().positive().optional(),
        source: z.enum(["internal", "external"]),
      }),
    )
    .max(5),
});

export type SearchContractorsInput = z.infer<typeof SearchContractorsInputSchema>;
export type SearchContractorsResult = z.infer<typeof SearchContractorsResultSchema>;

export type ToolName = "categorize_and_triage" | "search_contractors";

export type ToolDefinition<TInput extends z.ZodTypeAny, TResult extends z.ZodTypeAny> = {
  name: ToolName;
  description: string;
  input: TInput;
  result: TResult;
};

export const categorizeAndTriageTool: ToolDefinition<
  typeof CategorizeAndTriageInputSchema,
  typeof CategorizeAndTriageResultSchema
> = {
  name: "categorize_and_triage",
  description: "Analyze inbound conversation and categorize priority, summary, and next steps.",
  input: CategorizeAndTriageInputSchema,
  result: CategorizeAndTriageResultSchema,
};

export const searchContractorsTool: ToolDefinition<
  typeof SearchContractorsInputSchema,
  typeof SearchContractorsResultSchema
> = {
  name: "search_contractors",
  description: "Search internal/external contractor directories, returning top matches.",
  input: SearchContractorsInputSchema,
  result: SearchContractorsResultSchema,
};

export const tools = [categorizeAndTriageTool, searchContractorsTool] as const;

export function getToolDefinition(name: ToolName) {
  return tools.find((tool) => tool.name === name);
}

export type ToolInputByName<Name extends ToolName> = Name extends "categorize_and_triage"
  ? CategorizeAndTriageInput
  : Name extends "search_contractors"
    ? SearchContractorsInput
    : never;

export type ToolResultByName<Name extends ToolName> = Name extends "categorize_and_triage"
  ? CategorizeAndTriageResult
  : Name extends "search_contractors"
    ? SearchContractorsResult
    : never;
