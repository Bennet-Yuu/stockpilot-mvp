import type { Ticker } from "../../data";
import type { ResearchBrief, ResearchEvidenceBundle, ResearchLanguage, ResearchRequest, ResearchResponse } from "./schemas";

export type { ResearchBrief, ResearchEvidenceBundle, ResearchLanguage, ResearchRequest, ResearchResponse };

export type AiMode = "ai-live" | "ai-cached" | "not-configured" | "rules-based";
export type AiStatus = "success" | "cached" | "not-configured" | "sec-unavailable" | "rate-limited" | "provider-error" | "schema-error" | "grounding-error" | "refused";

export interface ResearchAssistantInput {
  ticker: Ticker;
  language: ResearchLanguage;
  question?: string;
  regenerate: boolean;
  evidence: ResearchEvidenceBundle;
}

export interface AiTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface ResearchAssistantResult {
  status: Extract<AiStatus, "success" | "cached">;
  aiMode: Extract<AiMode, "ai-live" | "ai-cached">;
  cached: boolean;
  brief: ResearchBrief;
  warnings: string[];
  latencyMs: number;
  tokenUsage?: AiTokenUsage;
}

export interface ResearchAssistantProvider {
  generateResearchBrief(input: ResearchAssistantInput): Promise<ResearchAssistantResult>;
}

export interface AiProviderErrorOptions {
  retryable?: boolean;
  cause?: unknown;
}

export type SafeAiErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_RATE_LIMITED"
  | "AI_TIMEOUT"
  | "AI_REFUSED"
  | "AI_PROVIDER_ERROR"
  | "AI_SCHEMA_ERROR"
  | "AI_GROUNDING_ERROR"
  | "AI_INVALID_REQUEST"
  | "AI_SEC_UNAVAILABLE";

export interface AiHealthSnapshot {
  runtime: "cloudflare" | "node";
  configured: boolean;
  modelConfigured: boolean;
  rateLimitConfigured: boolean;
  promptVersion: string;
  lastDiagnosticCode?: SafeAiErrorCode;
  checkedAt: string;
}

export interface AiRequestLog {
  requestId: string;
  ticker: Ticker;
  model: string;
  promptVersion: string;
  inputSourceCount: number;
  latencyMs: number;
  tokenUsage?: AiTokenUsage;
  status: AiStatus;
  diagnosticCode?: SafeAiErrorCode;
}

export type AiPublicResponse = ResearchResponse;
