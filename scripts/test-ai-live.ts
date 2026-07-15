import { existsSync, readFileSync } from "node:fs";
import { buildResearchEvidenceBundle } from "../app/providers/ai/evidence";
import { OpenAIResearchAssistantProvider } from "../app/providers/ai/provider";
import { aiPromptVersion } from "../app/providers/ai/schemas";
import { setServerRuntimeConfig } from "../app/runtime/serverRuntimeConfig";
import { createSecProvider } from "../app/providers/sec/provider";
import { FetchSecHttpClient } from "../app/providers/sec/client";
import type { Ticker } from "../app/data";

const tickers: Ticker[] = ["AAPL", "AMZN"];
const forbidden = /\b(strong\s*(buy|sell)|buy|sell|hold|price\s*target|target\s*price|expected\s*(return|yield)|upside|downside|probability|position\s*(size|sizing)|stop[- ]?loss|price\s*(forecast|prediction))\b|买入|卖出|持有|目标价|预期收益|仓位|止损|价格预测/i;

function readLocalEnv(): Record<string, string> {
  if (!existsSync(".env.local")) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) values[match[1]] = match[2].replace(/^("|')(.*)\1$/, "$2");
  }
  return values;
}

function value(name: string, localEnv: Record<string, string>): string | undefined {
  return process.env[name] ?? localEnv[name];
}

function assertCondition(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  const localEnv = readLocalEnv();
  const apiKey = value("OPENAI_API_KEY", localEnv);
  if (!apiKey?.trim() || apiKey.trim().startsWith("your-") || apiKey.trim().startsWith("sk-example")) {
    console.error("AI live smoke skipped: configure a real server-side OPENAI_API_KEY in .env.local first.");
    process.exitCode = 2;
    return;
  }
  setServerRuntimeConfig({
    SEC_USER_AGENT: value("SEC_USER_AGENT", localEnv),
    SEC_REQUESTS_PER_SECOND: value("SEC_REQUESTS_PER_SECOND", localEnv),
    SEC_CACHE_TTL_SECONDS: value("SEC_CACHE_TTL_SECONDS", localEnv),
    OPENAI_API_KEY: apiKey,
    OPENAI_MODEL: value("OPENAI_MODEL", localEnv),
    OPENAI_TIMEOUT_MS: value("OPENAI_TIMEOUT_MS", localEnv),
    OPENAI_MAX_OUTPUT_TOKENS: value("OPENAI_MAX_OUTPUT_TOKENS", localEnv),
    AI_CACHE_TTL_SECONDS: value("AI_CACHE_TTL_SECONDS", localEnv),
    AI_REQUESTS_PER_MINUTE: value("AI_REQUESTS_PER_MINUTE", localEnv),
  }, "node");
  const secClient = new FetchSecHttpClient({ userAgent: value("SEC_USER_AGENT", localEnv), requestsPerSecond: Number(value("SEC_REQUESTS_PER_SECOND", localEnv) ?? 5) });
  const secProvider = createSecProvider({ client: secClient, userAgent: value("SEC_USER_AGENT", localEnv) });
  const aiProvider = new OpenAIResearchAssistantProvider();
  for (const ticker of tickers) {
    const snapshot = await secProvider.getCompanySnapshot(ticker);
    assertCondition(snapshot.sourceMode === "live", `${ticker}: SEC sourceMode was not live`);
    if (ticker === "AMZN") assertCondition(snapshot.metrics.Liabilities.status === "unavailable", "AMZN: expected Liabilities to remain unavailable in this fixture/live response");
    const evidence = buildResearchEvidenceBundle(snapshot);
    const result = await aiProvider.generateResearchBrief({ ticker, language: "en", regenerate: true, evidence });
    const text = JSON.stringify(result.brief);
    assertCondition(result.aiMode === "ai-live" && (result.status === "success" || result.status === "cached"), `${ticker}: AI response did not succeed`);
    assertCondition(result.brief.sourceIndex.every((sourceId) => evidence.sources.some((source) => source.sourceId === sourceId)), `${ticker}: invalid source index`);
    assertCondition(!forbidden.test(text), `${ticker}: prohibited language appeared in grounded output`);
    console.log(`${ticker}: status=${result.status} sourceMode=${snapshot.sourceMode} sources=${evidence.sources.length} unavailable=${Object.values(snapshot.metrics).filter((metric) => metric.status === "unavailable").length} latencyMs=${result.latencyMs} tokenUsage=${result.tokenUsage ?? "unknown"} promptVersion=${aiPromptVersion}`);
  }
  console.log(`AI live smoke passed for ${tickers.length} tickers; exactly ${tickers.length} bounded requests were attempted.`);
}

main().catch((error: unknown) => {
  console.error(`AI live smoke failed: ${error instanceof Error ? error.message : "unexpected error"}`);
  process.exitCode = 1;
});
