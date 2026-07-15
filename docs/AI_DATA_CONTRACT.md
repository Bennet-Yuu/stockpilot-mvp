import { NextResponse } from "next/server";
import { normalizeSecTicker } from "../../../../providers/sec/tickerMap";
import { getSecFilingDataProvider } from "../../../../providers/sec/provider";
import type { SecCompanyFinancialSnapshot } from "../../../../providers/sec/types";
import { getAiRuntimeConfig } from "../../../../providers/ai/client";
import { buildResearchEvidenceBundle } from "../../../../providers/ai/evidence";
import { AiProviderError, setLastAiDiagnosticCode } from "../../../../providers/ai/errors";
import { containsRefusalRequest } from "../../../../providers/ai/grounding";
import { aiPromptVersion, researchRequestSchema, researchResponseSchema, type ResearchResponse } from "../../../../providers/ai/schemas";
import { getResearchAssistantProvider } from "../../../../providers/ai/provider";
import { getAiRateLimiter, hashClientIdentifier } from "../../../../providers/ai/rateLimit";
import type { ResearchAssistantProvider } from "../../../../providers/ai/types";

const MAX_REQUEST_BYTES = 12_000;
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

function json(payload: ResearchResponse, status = 200, extraHeaders: Record<string, string> = {}): NextResponse {
  const parsed = researchResponseSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ticker: payload.ticker, status: "provider-error", sourceMode: payload.sourceMode, aiMode: "not-configured", cached: false, promptVersion: aiPromptVersion, sources: [], warnings: ["AI response failed safe response validation."], diagnosticCode: "AI_SCHEMA_ERROR" }, { status: 502, headers });
  return NextResponse.json(parsed.data, { status, headers: { ...headers, ...extraHeaders } });
}

function invalidTicker(): NextResponse {
  return NextResponse.json({ error: "Unsupported ticker", status: "invalid-ticker" }, { status: 400, headers });
}

async function readRequestBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) throw new AiProviderError("AI_INVALID_REQUEST", "Request body is too large.");
  if (!text.trim()) return {};
  try { return JSON.parse(text) as unknown; } catch { throw new AiProviderError("AI_INVALID_REQUEST", "Request body is not valid JSON."); }
}

function errorResponse(ticker: string, sourceMode: ResearchResponse["sourceMode"], error: AiProviderError, sources: ResearchResponse["sources"] = [], warnings: string[] = []): NextResponse {
  const status = error.code === "AI_RATE_LIMITED" ? 429 : error.code === "AI_INVALID_REQUEST" ? 400 : error.code === "AI_REFUSED" ? 422 : error.code === "AI_GROUNDING_ERROR" || error.code === "AI_SCHEMA_ERROR" ? 502 : 503;
  const retryAfter = error.code === "AI_RATE_LIMITED" ? String(Math.max(1, Number(error.cause) || 60)) : undefined;
  const aiMode = error.code === "AI_NOT_CONFIGURED" || error.code === "AI_SEC_UNAVAILABLE" ? "not-configured" : "ai-live";
  return json({ ticker, status: error.code === "AI_RATE_LIMITED" ? "rate-limited" : error.code === "AI_REFUSED" ? "refused" : error.code === "AI_GROUNDING_ERROR" ? "grounding-error" : error.code === "AI_SCHEMA_ERROR" ? "schema-error" : error.code === "AI_NOT_CONFIGURED" ? "not-configured" : error.code === "AI_SEC_UNAVAILABLE" ? "sec-unavailable" : "provider-error", sourceMode, aiMode, cached: false, promptVersion: aiPromptVersion, sources, warnings: [...warnings, error.code === "AI_GROUNDING_ERROR" ? "AI output did not pass source grounding validation." : error.code === "AI_REFUSED" ? "The request is outside StockPilot's research-only boundaries." : error.code === "AI_SEC_UNAVAILABLE" ? "SEC sample or unavailable data was not sent to AI." : "AI Research Assistant is temporarily unavailable."], diagnosticCode: error.code }, status, retryAfter ? { "Retry-After": retryAfter } : {});
}

export async function createAiResearchResponse(request: Request, rawTicker: unknown, provider?: ResearchAssistantProvider): Promise<NextResponse> {
  let ticker;
  try { ticker = normalizeSecTicker(rawTicker); } catch { return invalidTicker(); }

  let requestBody: unknown;
  try { requestBody = await readRequestBody(request); } catch (error) { return errorResponse(ticker, "unavailable", error instanceof AiProviderError ? error : new AiProviderError("AI_INVALID_REQUEST", "Invalid request.")); }
  const parsedRequest = researchRequestSchema.safeParse(requestBody);
  if (!parsedRequest.success) return errorResponse(ticker, "unavailable", new AiProviderError("AI_INVALID_REQUEST", "Request validation failed."));
  const { language, question, regenerate } = parsedRequest.data;

  let snapshot: SecCompanyFinancialSnapshot;
  try { snapshot = await getSecFilingDataProvider().getCompanySnapshot(ticker); } catch { return errorResponse(ticker, "unavailable", new AiProviderError("AI_SEC_UNAVAILABLE", "SEC evidence is unavailable.")); }
  if (snapshot.sourceMode === "sample" || snapshot.sourceMode === "unavailable") return errorResponse(ticker, snapshot.sourceMode, new AiProviderError("AI_SEC_UNAVAILABLE", "Sample or unavailable SEC data cannot be sent to AI."), [], snapshot.warnings);

  if (question && containsRefusalRequest(question)) return errorResponse(ticker, snapshot.sourceMode, new AiProviderError("AI_REFUSED", "The question is outside the research-only scope."), [], snapshot.warnings);
  const evidence = (() => { try { return buildResearchEvidenceBundle(snapshot); } catch { return undefined; } })();
  if (!evidence) return errorResponse(ticker, snapshot.sourceMode, new AiProviderError("AI_SEC_UNAVAILABLE", "SEC evidence could not be prepared safely."), [], snapshot.warnings);

  const aiConfig = getAiRuntimeConfig();
  if (!aiConfig.apiKey) {
    setLastAiDiagnosticCode("AI_NOT_CONFIGURED");
    return json({ ticker, status: "not-configured", sourceMode: snapshot.sourceMode, aiMode: "not-configured", cached: false, promptVersion: aiPromptVersion, sources: [], warnings: ["AI Research Assistant is not configured. No OpenAI request was made.", "Rules-based research questions are available in the UI; they are not AI-generated.", ...snapshot.warnings], diagnosticCode: "AI_NOT_CONFIGURED" });
  }

  const identifier = hashClientIdentifier(request.headers.get("x-forwarded-for") ?? request.headers.get("cf-connecting-ip") ?? undefined);
  const rate = getAiRateLimiter(aiConfig.requestsPerMinute).take(identifier);
  if (!rate.allowed) {
    const error = new AiProviderError("AI_RATE_LIMITED", "AI rate limit reached.", { cause: rate.retryAfterSeconds });
    return errorResponse(ticker, snapshot.sourceMode, error, evidence.sources, snapshot.warnings);
  }

  try {
    const result = await (provider ?? getResearchAssistantProvider()).generateResearchBrief({ ticker, language, question, regenerate, evidence });
    const status: ResearchResponse["status"] = result.status === "cached" ? "cached" : "success";
    return json({ ticker, status, sourceMode: snapshot.sourceMode, aiMode: result.aiMode, generatedAt: result.brief.generatedAt, cached: result.cached, promptVersion: result.brief.promptVersion, brief: result.brief, sources: evidence.sources, warnings: [...snapshot.warnings, ...result.warnings], diagnosticCode: undefined });
  } catch (error) {
    const safe = error instanceof AiProviderError ? error : new AiProviderError("AI_PROVIDER_ERROR", "AI provider unavailable.");
    return errorResponse(ticker, snapshot.sourceMode, safe, evidence.sources, snapshot.warnings);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ ticker: string }> }): Promise<NextResponse> {
  try { return createAiResearchResponse(request, (await params).ticker); } catch { return errorResponse("unknown", "unavailable", new AiProviderError("AI_INVALID_REQUEST", "Invalid request.")); }
}
