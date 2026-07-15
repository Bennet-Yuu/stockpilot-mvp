import { existsSync, readFileSync } from "node:fs";
import { buildResearchEvidenceBundle } from "../app/providers/ai/evidence";
import { validateResearchBrief } from "../app/providers/ai/grounding";
import { OpenAIResearchAssistantProvider } from "../app/providers/ai/provider";
import { aiPromptVersion } from "../app/providers/ai/schemas";
import { setServerRuntimeConfig } from "../app/runtime/serverRuntimeConfig";
import { createSecProvider } from "../app/providers/sec/provider";
import { FetchSecHttpClient } from "../app/providers/sec/client";
import type { Ticker } from "../app/data";
import type { ResearchBrief } from "../app/providers/ai/schemas";

const tickers: Ticker[] = ["AAPL", "AMZN"];
const factualSections = ["summary", "financialTrends", "strengths", "risks", "bullCaseConditions", "bearCaseConditions", "limitations"] as const;

function readLocalEnv(): Record<string, string> {
  if (!existsSync(".env.local")) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) values[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return values;
}

function value(name: string, localEnv: Record<string, string>): string | undefined {
  return process.env[name] ?? localEnv[name];
}

function assertCondition(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertSourceIntegrity(ticker: Ticker, evidence: ReturnType<typeof buildResearchEvidenceBundle>): void {
  const sourceMap = new Map(evidence.sources.map((source) => [source.sourceId, source]));
  for (const source of evidence.sources.filter((candidate) => candidate.derived && candidate.metric === "Free Cash Flow")) {
    const underlying = (source.derivedFrom ?? []).map((sourceId) => sourceMap.get(sourceId));
    const metrics = new Set(underlying.map((candidate) => candidate?.metric));
    assertCondition(underlying.length === 2 && metrics.size === 2 && metrics.has("Operating Cash Flow") && metrics.has("Capital Expenditure"), `${ticker}: FCF provenance did not retain OCF and CapEx only`);
    assertCondition(underlying.every((candidate) => candidate && candidate.accessionNumber === source.accessionNumber && candidate.periodStart === source.periodStart && candidate.periodEnd === source.periodEnd && candidate.unit === source.unit && candidate.form === source.form && candidate.taxonomy === source.taxonomy && Boolean(candidate.concept)), `${ticker}: FCF provenance period or concept mismatch`);
  }
}

function assertSourceUrls(ticker: Ticker, evidence: ReturnType<typeof buildResearchEvidenceBundle>): void {
  for (const source of evidence.sources) {
    const parsed = new URL(source.sourceUrl);
    assertCondition(parsed.protocol === "https:" && parsed.hostname === "www.sec.gov", `${ticker}: invalid SEC source URL`);
  }
}

function assertBriefGrounding(ticker: Ticker, evidence: ReturnType<typeof buildResearchEvidenceBundle>, brief: ResearchBrief): void {
  const grounded = validateResearchBrief(brief, evidence, "en");
  assertCondition(grounded.success, `${ticker}: grounding validation failed`);
  const sourceIds = new Set(evidence.sources.map((source) => source.sourceId));
  for (const section of factualSections) {
    for (const claim of grounded.brief[section]) assertCondition(claim.sourceIds.length > 0 && claim.sourceIds.every((sourceId) => sourceIds.has(sourceId)), `${ticker}: factual claim has an invalid or missing citation`);
  }
  assertCondition(grounded.brief.sourceIndex.length === new Set(grounded.brief.sourceIndex).size && grounded.brief.sourceIndex.every((sourceId) => sourceIds.has(sourceId)), `${ticker}: sourceIndex contains an unknown or duplicate source`);
}

async function main(): Promise<void> {
  const localEnv = readLocalEnv();
  const apiKey = value("OPENAI_API_KEY", localEnv);
  if (!apiKey?.trim() || apiKey.trim().startsWith("your-") || apiKey.trim().startsWith("sk-example")) {
    console.error("AI live smoke skipped: configure a real server-side OPENAI_API_KEY in .env.local first.");
    process.exitCode = 2;
    return;
  }
  const userAgent = value("SEC_USER_AGENT", localEnv);
  assertCondition(Boolean(userAgent?.trim()) && !/example\.com|your-domain\.com|replace|placeholder/i.test(userAgent ?? ""), "SEC_USER_AGENT must be a real contact string for live smoke");
  setServerRuntimeConfig({
    SEC_USER_AGENT: userAgent,
    SEC_REQUESTS_PER_SECOND: value("SEC_REQUESTS_PER_SECOND", localEnv),
    SEC_CACHE_TTL_SECONDS: value("SEC_CACHE_TTL_SECONDS", localEnv),
    SEC_TIMEOUT_MS: value("SEC_TIMEOUT_MS", localEnv),
    SEC_MAX_RESPONSE_BYTES: value("SEC_MAX_RESPONSE_BYTES", localEnv),
    OPENAI_API_KEY: apiKey,
    OPENAI_MODEL: value("OPENAI_MODEL", localEnv),
    OPENAI_TIMEOUT_MS: value("OPENAI_TIMEOUT_MS", localEnv),
    OPENAI_MAX_OUTPUT_TOKENS: value("OPENAI_MAX_OUTPUT_TOKENS", localEnv),
    AI_CACHE_TTL_SECONDS: value("AI_CACHE_TTL_SECONDS", localEnv),
    AI_REQUESTS_PER_MINUTE: value("AI_REQUESTS_PER_MINUTE", localEnv),
  }, "node");
  const secClient = new FetchSecHttpClient({ userAgent, requestsPerSecond: Number(value("SEC_REQUESTS_PER_SECOND", localEnv) ?? 5) });
  const secProvider = createSecProvider({ client: secClient, userAgent });
  const aiProvider = new OpenAIResearchAssistantProvider();
  for (const ticker of tickers) {
    const started = Date.now();
    const snapshot = await secProvider.getCompanySnapshot(ticker);
    assertCondition(snapshot.sourceMode === "live", `${ticker}: SEC sourceMode was not live`);
    if (ticker === "AMZN") assertCondition(snapshot.metrics.Liabilities.status === "unavailable", "AMZN: Liabilities must remain explicitly unavailable when the concept is not returned");
    const evidence = buildResearchEvidenceBundle(snapshot);
    assertSourceIntegrity(ticker, evidence);
    assertSourceUrls(ticker, evidence);
    const result = await aiProvider.generateResearchBrief({ ticker, language: "en", regenerate: true, evidence });
    assertCondition(result.aiMode === "ai-live" && result.status === "success" && !result.cached, `${ticker}: AI response did not succeed as an uncached live response`);
    assertBriefGrounding(ticker, evidence, result.brief);
    assertCondition(result.brief.promptVersion === aiPromptVersion, `${ticker}: unexpected prompt version`);
    const tokenUsage = result.tokenUsage;
    const unavailableMetrics = Object.entries(snapshot.metrics).filter(([, metric]) => metric.status === "unavailable").map(([metric]) => metric).join(",") || "none";
    console.log(`${ticker}: model=${result.brief.model} status=${result.status} sourceMode=${snapshot.sourceMode} latencyMs=${Math.max(result.latencyMs, Date.now() - started)} inputTokens=${tokenUsage?.inputTokens ?? "unknown"} outputTokens=${tokenUsage?.outputTokens ?? "unknown"} totalTokens=${tokenUsage?.totalTokens ?? "unknown"} sources=${evidence.sources.length} cached=${result.cached} grounding=passed unavailableMetrics=${unavailableMetrics}`);
  }
  console.log(`AI live smoke passed for ${tickers.length} tickers; exactly ${tickers.length} bounded requests were attempted.`);
}

main().catch((error: unknown) => {
  console.error(`AI live smoke failed: ${error instanceof Error ? error.message : "unexpected error"}`);
  process.exitCode = 1;
});
