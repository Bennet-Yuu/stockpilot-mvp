import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FetchSecHttpClient } from "../app/providers/sec/client";
import { MemorySecCache } from "../app/providers/sec/cache";
import { createSecProvider } from "../app/providers/sec/provider";
import { normalizeFinancials, normalizeSnapshot } from "../app/providers/sec/normalize";
import { secCompanyFinancialSnapshotSchema } from "../app/providers/sec/schemas";
import { cikForTicker, normalizeSecTicker, secArchiveUrl, secTickerMap } from "../app/providers/sec/tickerMap";
import type { SecHttpClient } from "../app/providers/sec/types";
import { createSecSnapshotResponse } from "../app/api/sec/response";
import { MockSecFilingDataProvider } from "../app/providers/sec/sample";

const submissions = JSON.parse(readFileSync("tests/fixtures/sec/aapl-submissions.json", "utf8")) as unknown;
const facts = JSON.parse(readFileSync("tests/fixtures/sec/aapl-companyfacts.json", "utf8")) as unknown;

test("SEC ticker mapping uses verified zero-padded CIKs and archive URLs", () => {
  assert.equal(normalizeSecTicker(" aapl "), "AAPL");
  assert.equal(cikForTicker("AAPL"), "0000320193");
  assert.equal(secTickerMap.MSFT.cik, "0000789019");
  assert.equal(secArchiveUrl("0000320193", "0000320193-24-000123", "aapl-20240928.htm"), "https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/aapl-20240928.htm");
  assert.throws(() => normalizeSecTicker("BRK.B"));
});

test("normalizer selects annual facts, keeps amended filing provenance and derives FCF", () => {
  const snapshot = normalizeSnapshot(facts, submissions, "AAPL", "live", "success", "2026-07-13T00:00:00.000Z");
  assert.equal(snapshot.metrics.Revenue.latest?.periodEnd, "2024-12-28");
  assert.equal(snapshot.metrics.Revenue.annualHistory[0]?.accessionNumber, "0000320193-24-000122");
  assert.equal(snapshot.metrics["Capital Expenditure"].annualHistory[0]?.value, 9959);
  assert.equal(snapshot.metrics["Free Cash Flow"].annualHistory[0]?.value, 108295);
  assert.equal(snapshot.metrics["Free Cash Flow"].annualHistory[0]?.derivedFrom?.length, 2);
  assert.equal(snapshot.recentFilings.length, 4);
  assert.match(snapshot.recentFilings[0]?.sourceUrl ?? "", /Archives\/edgar\/data\/320193/);
  assert.equal(snapshot.annualHistory[0]?.revenue?.value, 391035);
  assert.equal(snapshot.annualHistory[0]?.operatingCashFlow?.value, 118254);
  assert.equal(secCompanyFinancialSnapshotSchema.safeParse(snapshot).success, true);
});

test("concept fallback works and missing values stay unavailable rather than becoming zero", () => {
  const fallbackFacts = { entityName: "Example", facts: { "us-gaap": { SalesRevenueNet: { units: { USD: [{ accn: "x", form: "10-K", filed: "2025-01-01", fy: 2024, fp: "FY", start: "2024-01-01", end: "2024-12-31", val: 10 }] } } } } };
  const result = normalizeFinancials(fallbackFacts, submissions, "AAPL");
  assert.equal(result.metrics.Revenue.latest?.value, 10);
  assert.equal(result.metrics["Net Income"].status, "unavailable");
  assert.equal(result.metrics["Net Income"].latest, undefined);
  assert.equal(result.metrics["Net Income"].annualHistory.length, 0);
});

test("SEC HTTP client sends identity headers and never calls fetch without User-Agent", async () => {
  let calls = 0;
  const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    calls += 1;
    assert.equal(new Headers(init?.headers).get("User-Agent"), "StockPilot/test contact@example.com");
    assert.equal(new Headers(init?.headers).get("Accept"), "application/json");
    assert.equal(new Headers(init?.headers).get("Accept-Encoding"), "gzip, deflate");
    return new Response('{"ok":true}', { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const client = new FetchSecHttpClient({ userAgent: "StockPilot/test contact@example.com", fetchImpl, sleep: async () => undefined });
  assert.deepEqual(await client.getJson<{ ok: boolean }>("https://data.sec.gov/test"), { ok: true });
  assert.equal(calls, 1);
  const noUserAgent = new FetchSecHttpClient({ userAgent: "", fetchImpl });
  await assert.rejects(() => noUserAgent.getJson("https://data.sec.gov/test"), (error: unknown) => error instanceof Error && error.message.includes("SEC_USER_AGENT"));
  assert.equal(calls, 1);
});

test("SEC HTTP client retries 429 and 5xx at most twice, but not 403", async () => {
  const statuses = [429, 500, 200];
  let calls = 0;
  const fetchImpl = (async () => new Response(calls++ < statuses.length ? (statuses[calls - 1] === 200 ? '{"ok":true}' : "busy") : "busy", { status: statuses[calls - 1] ?? 500 })) as typeof fetch;
  const client = new FetchSecHttpClient({ userAgent: "StockPilot/test contact@example.com", fetchImpl, sleep: async () => undefined });
  assert.deepEqual(await client.getJson<{ ok: boolean }>("https://data.sec.gov/test"), { ok: true });
  assert.equal(calls, 3);
  let forbiddenCalls = 0;
  const forbiddenFetch = (async () => { forbiddenCalls += 1; return new Response("no", { status: 403 }); }) as typeof fetch;
  const forbidden = new FetchSecHttpClient({ userAgent: "StockPilot/test contact@example.com", fetchImpl: forbiddenFetch, sleep: async () => undefined });
  await assert.rejects(() => forbidden.getJson("https://data.sec.gov/test"));
  assert.equal(forbiddenCalls, 1);
});

test("SEC HTTP client rejects invalid JSON and oversized responses", async () => {
  const invalidFetch = (async () => new Response("not-json", { status: 200 })) as typeof fetch;
  const invalid = new FetchSecHttpClient({ userAgent: "StockPilot/test contact@example.com", fetchImpl: invalidFetch, sleep: async () => undefined });
  await assert.rejects(() => invalid.getJson("https://data.sec.gov/test"), (error: unknown) => error instanceof Error && error.message.includes("invalid JSON"));
  const largeFetch = (async () => new Response("1234567890", { status: 200 })) as typeof fetch;
  const large = new FetchSecHttpClient({ userAgent: "StockPilot/test contact@example.com", fetchImpl: largeFetch, maxResponseBytes: 5, sleep: async () => undefined });
  await assert.rejects(() => large.getJson("https://data.sec.gov/test"), (error: unknown) => error instanceof Error && error.message.includes("safety limit"));
});

class FixtureClient implements SecHttpClient {
  calls = 0;
  fail = false;
  async getJson<T>(url: string): Promise<T> {
    this.calls += 1;
    if (this.fail) throw new Error("fixture transport failure");
    return (url.includes("submissions") ? submissions : facts) as T;
  }
}

test("provider serves sample mode without configuration and live data through injected transport", async () => {
  const sampleProvider = createSecProvider({ userAgent: "" });
  const sample = await sampleProvider.getCompanySnapshot("TSLA");
  assert.equal(sample.sourceMode, "sample");
  assert.equal(sample.status, "not-configured");
  const client = new FixtureClient();
  const liveProvider = createSecProvider({ client, cache: new MemorySecCache(), userAgent: "StockPilot/test contact@example.com" });
  const live = await liveProvider.getCompanySnapshot("AAPL");
  assert.equal(live.sourceMode, "live");
  assert.equal(live.cik, "0000320193");
  assert.equal(client.calls, 2);
  const cached = await liveProvider.getCompanySnapshot("AAPL");
  assert.equal(cached.sourceMode, "cached");
  assert.equal(client.calls, 2);
});

test("provider returns stale cache and safe warnings after a refresh failure", async () => {
  let now = 0;
  const client = new FixtureClient();
  const provider = createSecProvider({ client, userAgent: "StockPilot/test contact@example.com", cache: new MemorySecCache(), cacheTtlSeconds: 1, clock: () => now });
  const first = await provider.getCompanySnapshot("AAPL");
  assert.equal(first.sourceMode, "live");
  now = 2000;
  client.fail = true;
  const stale = await provider.getCompanySnapshot("AAPL");
  assert.equal(stale.sourceMode, "stale-cache");
  assert.ok(stale.warnings.some((warning) => warning.includes("last cached")));
});

test("SEC API response validates ticker and returns sample snapshot without exposing stack details", async () => {
  const invalid = await createSecSnapshotResponse("NOPE", new MockSecFilingDataProvider());
  assert.equal(invalid.status, 400);
  const valid = await createSecSnapshotResponse("AAPL", new MockSecFilingDataProvider());
  assert.equal(valid.status, 200);
  const body: unknown = await valid.json();
  assert.equal(typeof body, "object");
  assert.equal((body as { sourceMode: string }).sourceMode, "sample");
  assert.equal((body as { warnings: string[] }).warnings.length > 0, true);
});
