import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { getServerRuntimeConfig, getServerRuntimeKind } from "../../runtime/serverRuntimeConfig";
import { AiProviderError } from "./errors";
import { researchBriefSchema, type ResearchBrief } from "./schemas";
import { buildResearchPrompt, researchSystemPrompt } from "./prompt";
import type { ResearchEvidenceBundle, ResearchLanguage } from "./schemas";
import type { AiTokenUsage } from "./types";

export interface AiRuntimeConfig {
  apiKey?: string;
  model: string;
  timeoutMs: number;
  maxOutputTokens: number;
  cacheTtlSeconds: number;
  requestsPerMinute: number;
}

function numberValue(value: string | undefined, fallback: number, minimum: number, maximum?: number): number {
  const parsed = Number(value);
  const bounded = Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
  return Math.min(maximum ?? Number.MAX_SAFE_INTEGER, Math.max(minimum, bounded));
}

export function getAiRuntimeConfig(source: ReturnType<typeof getServerRuntimeConfig> = getServerRuntimeConfig()): AiRuntimeConfig {
  return {
    apiKey: source.OPENAI_API_KEY?.trim() || undefined,
    model: source.OPENAI_MODEL?.trim() || "gpt-5.6",
    timeoutMs: numberValue(source.OPENAI_TIMEOUT_MS, 20_000, 1_000, 120_000),
    maxOutputTokens: numberValue(source.OPENAI_MAX_OUTPUT_TOKENS, 1_600, 256, 4_000),
    cacheTtlSeconds: numberValue(source.AI_CACHE_TTL_SECONDS, 21_600, 1),
    requestsPerMinute: numberValue(source.AI_REQUESTS_PER_MINUTE, 5, 1, 60),
  };
}

export function isAiConfigured(): boolean {
  return Boolean(getAiRuntimeConfig().apiKey);
}

export function getAiHealthSnapshot(): { runtime: "cloudflare" | "node"; configured: boolean; modelConfigured: boolean; rateLimitConfigured: boolean } {
  const config = getAiRuntimeConfig();
  return { runtime: getServerRuntimeKind(), configured: Boolean(config.apiKey), modelConfigured: Boolean(config.model), rateLimitConfigured: config.requestsPerMinute > 0 };
}

export interface OpenAiResearchResult {
  brief: ResearchBrief;
  tokenUsage?: AiTokenUsage;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function safeTokenCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : undefined;
}

function hasRefusalOutput(response: UnknownRecord): boolean {
  const output = Array.isArray(response.output) ? response.output : [];
  return output.some((item) => {
    if (!isRecord(item) || item.type !== "message" || !Array.isArray(item.content)) return false;
    return item.content.some((content) => isRecord(content) && content.type === "refusal");
  });
}

function isIncompleteResponse(response: UnknownRecord): boolean {
  if (response.status === "incomplete" || response.status === "failed" || (response.incomplete_details !== null && response.incomplete_details !== undefined)) return true;
  const output = Array.isArray(response.output) ? response.output : [];
  return output.some((item) => isRecord(item) && item.type === "message" && (item.status === "incomplete" || item.status === "in_progress"));
}

export function parseOpenAiResearchResponse(response: unknown): OpenAiResearchResult {
  if (!isRecord(response)) throw new AiProviderError("AI_PROVIDER_ERROR", "The AI provider returned an unavailable response.");
  if (hasRefusalOutput(response)) throw new AiProviderError("AI_REFUSED", "The AI provider refused this research request.");
  if (isIncompleteResponse(response)) throw new AiProviderError("AI_PROVIDER_ERROR", "The AI provider returned an incomplete response.", { retryable: true });
  const parsed = researchBriefSchema.safeParse(response.output_parsed);
  if (!parsed.success) throw new AiProviderError("AI_SCHEMA_ERROR", "OpenAI returned an invalid structured response.");
  const usage = isRecord(response.usage)
    ? {
        inputTokens: safeTokenCount(response.usage.input_tokens),
        outputTokens: safeTokenCount(response.usage.output_tokens),
        totalTokens: safeTokenCount(response.usage.total_tokens),
      }
    : undefined;
  const hasUsage = usage && Object.values(usage).some((value) => value !== undefined);
  return { brief: parsed.data, tokenUsage: hasUsage ? usage : undefined };
}

export async function requestOpenAiResearch(input: { bundle: ResearchEvidenceBundle; language: ResearchLanguage; question?: string }): Promise<OpenAiResearchResult> {
  const config = getAiRuntimeConfig();
  if (!config.apiKey) throw new AiProviderError("AI_NOT_CONFIGURED", "OpenAI is not configured.");
  const client = new OpenAI({ apiKey: config.apiKey, timeout: config.timeoutMs, maxRetries: 0 });
  const startedAt = Date.now();
  try {
    const response = await client.responses.parse({
      model: config.model,
      input: [
        { role: "system", content: researchSystemPrompt },
        { role: "user", content: buildResearchPrompt({ bundle: input.bundle, language: input.language, question: input.question }) },
      ],
      text: { format: zodTextFormat(researchBriefSchema, "stockpilot_research_brief") },
      store: false,
      max_output_tokens: config.maxOutputTokens,
    });
    return parseOpenAiResearchResponse(response);
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if (Date.now() - startedAt >= config.timeoutMs) throw new AiProviderError("AI_TIMEOUT", "The AI provider timed out.", { retryable: true, cause: error });
    throw new AiProviderError("AI_PROVIDER_ERROR", "The AI provider is unavailable.", { cause: error });
  }
}
