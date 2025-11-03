import OpenAI from "openai";

export type ReasoningModel =
  | "gpt-4.1-mini"
  | "gpt-4.1"
  | "gpt-4o-mini"
  | "gpt-4o";

export interface ReasoningConfig {
  model?: ReasoningModel;
  temperature?: number;
  maxOutputTokens?: number;
}

const DEFAULT_MODEL: ReasoningModel =
  (process.env.OPENAI_RESPONSES_MODEL as ReasoningModel) ?? "gpt-4.1-mini";

const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_OUTPUT_TOKENS = 800;

let cachedClient: OpenAI | null = null;

function assertServerEnvironment() {
  if (typeof window !== "undefined") {
    throw new Error("OpenAI client must only be used from the server.");
  }
}

export function getOpenAIClient(): OpenAI {
  assertServerEnvironment();

  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Populate it in .env.local.");
  }

  cachedClient = new OpenAI({
    apiKey,
    maxRetries: 2,
    baseURL:
      process.env.OPENAI_BASE_URL ??
      process.env.OPENAI_API_BASE ??
      "https://api.openai.com/v1",
  });

  return cachedClient;
}

export function buildReasoningOptions(
  config: ReasoningConfig = {},
): Required<ReasoningConfig> {
  return {
    model: config.model ?? DEFAULT_MODEL,
    temperature: config.temperature ?? DEFAULT_TEMPERATURE,
    maxOutputTokens: config.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
  };
}

export function resetCachedOpenAIClient(): void {
  cachedClient = null;
}

export const DEFAULT_REASONING_MODEL = DEFAULT_MODEL;
