import { existsSync, readFileSync } from "node:fs";
import { createSecProvider } from "../app/providers/sec/provider";
import { FetchSecHttpClient, type SecHttpResponseStats } from "../app/providers/sec/client";
import { cikForTicker } from "../app/providers/sec/tickerMap";
import type { Ticker } from "../app/data";

const tickers: Ticker[] = ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA"];

function readLocalEnv(): Record<string, string> {
  if (!existsSync(".env.local")) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return values;
}

function validUserAgent(value: string | undefined): value is string {
  if (!value?.trim() || !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(value)) return false;
  const domain = value.match(/[^\s@]+@([^\s@]+\.[^\s@]+)/)?.[1]?.toLowerCase() ?? "";
  return !domain.endsWith("example.com") && !domain.endsWith(".example") && !domain.endsWith(".invalid") && !domain.endsWith("localhost") && !domain.endsWith("your-domain.com");
}

function valueFromEnv(name: string, localEnv: Record<string, string>): string | undefined {
  return process.env[name] ?? localEnv[name];
}

function boundedNumber(raw: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function assertCondition(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  const localEnv = readLocalEnv();
  const userAgent = valueFromEnv("SEC_USER_AGENT", localEnv);
  if (!validUserAgent(userAgent)) {
    console.error("SEC live smoke skipped: add a real, reachable contact email to .env.local as SEC_USER_AGENT before running pnpm test:sec-live.");
    process.exitCode = 2;
    return;
  }
  const requestsPerSecond = boundedNumber(valueFromEnv("SEC_REQUESTS_PER_SECOND", localEnv), 5, 1, 10);
  const cacheTtlSeconds = boundedNumber(valueFromEnv("SEC_CACHE_TTL_SECONDS", localEnv), 3600, 1, 86_400);
  const responseStats: SecHttpResponseStats[] = [];
  const client = new FetchSecHttpClient({ userAgent, requestsPerSecond, onResponse: (stats) => responseStats.push(stats) });
  const provider = createSecProvider({ client, userAgent, requestsPerSecond, cacheTtlSeconds });
  let maxBytesRead = 0;
  for (const ticker of tickers) {
    const before = responseStats.length;
    const snapshot = await provider.getCompanySnapshot(ticker);
    const requests = responseStats.slice(before);
    const unavailable = Object.values(snapshot.metrics).filter((metric) => metric.status === "unavailable").length;
    assertCondition(snapshot.sourceMode === "live", `${ticker}: expected sourceMode=live`);
    assertCondition(snapshot.status === "success" || snapshot.status === "partial", `${ticker}: unexpected status ${snapshot.status}`);
    assertCondition(snapshot.cik === cikForTicker(ticker), `${ticker}: CIK did not match the verified map`);
    assertCondition(snapshot.identity.ticker === ticker && snapshot.identity.legalName.length > 0, `${ticker}: identity was not normalized`);
    assertCondition(snapshot.fetchedAt.length > 0 && snapshot.asOf.length > 0, `${ticker}: snapshot metadata is incomplete`);
    assertCondition(snapshot.recentFilings.length > 0, `${ticker}: no supported recent filings`);
    assertCondition(snapshot.recentFilings.every((filing) => filing.sourceUrl.startsWith("https://")), `${ticker}: filing source link is invalid`);
    assertCondition(Object.values(snapshot.metrics).some((metric) => metric.status === "available"), `${ticker}: no normalized metric was available`);
    const availableFacts = Object.values(snapshot.metrics).flatMap((metric) => metric.latest ? [metric.latest] : []);
    assertCondition(availableFacts.every((fact) => fact.sourceUrl.startsWith("https://")), `${ticker}: metric source link is invalid`);
    assertCondition(requests.length === 2, `${ticker}: expected submissions and company facts requests`);
    assertCondition(requests.some((request) => request.url.includes("/submissions/")) && requests.some((request) => request.url.includes("/companyfacts/")), `${ticker}: expected submissions and company facts endpoints`);
    for (const stat of requests) {
      assertCondition(stat.status === 200, `${ticker}: SEC returned HTTP ${stat.status}`);
      maxBytesRead = Math.max(maxBytesRead, stat.bytesRead);
    }
    const contentLengths = requests.map((stat) => stat.contentLength === undefined ? "unknown" : String(stat.contentLength)).join(",");
    console.log(`${ticker}: sourceMode=${snapshot.sourceMode} status=${snapshot.status} cik=${snapshot.cik} filings=${snapshot.recentFilings.length} unavailable=${unavailable} requests=${requests.length} contentLength=${contentLengths} bytes=${requests.map((stat) => stat.bytesRead).join(",")}`);
  }
  console.log(`SEC live smoke passed for ${tickers.length} tickers; maxBytesRead=${maxBytesRead}.`);
}

main().catch((error: unknown) => {
  console.error(`SEC live smoke failed: ${error instanceof Error ? error.message : "unexpected error"}`);
  process.exitCode = 1;
});
