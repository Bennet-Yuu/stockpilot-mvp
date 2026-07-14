import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FetchSecHttpClient } from "../app/providers/sec/client";
import { MemorySecCache } from "../app/providers/sec/cache";
import { createSecProvider } from "../app/providers/sec/provider";
import { normalizeFinancials, normalizeSnapshot } from "../app/providers/sec/normalize";
import { secCompanyFinancialSnapshotSchema, secCompanyIdentityResponseSchema, secRecentFilingsResponseSchema, secSubmissionsSchema } from "../app/providers/sec/schemas";
import { cikForTicker, normalizeSecTicker, secArchiveUrl, secTickerMap } from "../app/providers/sec/tickerMap";
import type { SecHttpClient } from "../app/providers/sec/types";
import { createSecFilingsResponse, createSecIdentityResponse, createSecSnapshotResponse } from "../app/api/sec/response";
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
  assert.equal(snapshot.recentFilings.length, 5);
  assert.deepEqual(snapshot.recentFilings.map((filing) => filing.form), ["8-K", "10-Q", "10-Q", "10-K", "10-K/A"]);
  assert.match(snapshot.recentFilings[0]?.sourceUrl ?? "", /Archives\/edgar\/data\/320193/);
  assert.equal(snapshot.annualHistory[0]?.revenue?.value, 391035);
  assert.equal(snapshot.annualHistory[0]?.operatingCashFlow?.value, 118254);
  assert.equal(secCompanyFinancialSnapshotSchema.safeParse(snapshot).success, true);
});

test("SEC submissions normalizes numeric XBRL flags from the live API", () => {
  const parsed = secSubmissionsSchema.safeParse({
    cik: "0000320193",
    name: "Example, Inc.",
    filings: { recent: { accessionNumber: [], filingDate: [], reportDate: [], form: [], primaryDocument: [], isXBRL: [1, 0, true, false, null] } },
  });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.deepEqual(parsed.data.filings.recent.isXBRL, [true, false, true, false, undefined]);
});

type RawFactInput = { accn: string; form: string; filed: string; end: string; val: number; start?: string; fy?: number; fp?: string };

function makeAnnualFact(accn: string, year: number, value: number, overrides: Partial<RawFactInput> = {}): RawFactInput {
  return { accn, form: "10-K", filed: `${year + 1}-02-01`, start: `${year}-01-01`, end: `${year}-12-31`, fy: year, fp: "FY", val: value, ...overrides };
}

function makeFacts(concepts: Record<string, { unit: string; values: RawFactInput[] }>): unknown {
  return { entityName: "Example, Inc.", facts: { "us-gaap": Object.fromEntries(Object.entries(concepts).map(([concept, definition]) => [concept, { label: concept, units: { [definition.unit]: definition.values } }])) } };
}

function makeSubmissions(factsForLookup: RawFactInput[]): unknown {
  const unique = [...new Map(factsForLookup.map((fact) => [fact.accn, fact])).values()];
  return {
    cik: "0000320193",
    name: "Example, Inc.",
    tickers: ["AAPL"],
    exchanges: ["NASDAQ"],
    filings: { recent: {
      accessionNumber: unique.map((fact) => fact.accn),
      filingDate: unique.map((fact) => fact.filed),
      reportDate: unique.map((fact) => fact.end),
      form: unique.map((fact) => fact.form),
      primaryDocument: unique.map((_, index) => `example-${index}.htm`),
      isXBRL: unique.map(() => true),
    } },
  };
}

test("cross-year concept fallback fills older annual periods without duplicate period ends", () => {
  const rawFacts = [
    makeAnnualFact("revenue-2024", 2024, 400),
    makeAnnualFact("revenues-2023", 2023, 300),
    makeAnnualFact("revenues-2022", 2022, 200),
    makeAnnualFact("sales-2021", 2021, 100),
  ];
  const result = normalizeFinancials(makeFacts({
    RevenueFromContractWithCustomerExcludingAssessedTax: { unit: "USD", values: [rawFacts[0]!] },
    Revenues: { unit: "USD", values: [rawFacts[1]!, rawFacts[2]!] },
    SalesRevenueNet: { unit: "USD", values: [rawFacts[3]!] },
  }), makeSubmissions(rawFacts), "AAPL");
  assert.deepEqual(result.metrics.Revenue.annualHistory.map((fact) => fact.periodEnd), ["2024-12-31", "2023-12-31", "2022-12-31", "2021-12-31"]);
  assert.deepEqual(result.metrics.Revenue.annualHistory.map((fact) => fact.concept), ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "Revenues", "SalesRevenueNet"]);
  assert.equal(new Set(result.metrics.Revenue.annualHistory.map((fact) => fact.periodEnd)).size, result.metrics.Revenue.annualHistory.length);
});

test("annual amendments win within a period while newer periods remain first and 8-K facts are excluded", () => {
  const rawFacts = [
    makeAnnualFact("income-2024-original", 2024, 100, { filed: "2025-02-01" }),
    makeAnnualFact("income-2024-amended", 2024, 110, { form: "10-K/A", filed: "2025-03-01" }),
    makeAnnualFact("income-2023-amended", 2023, 90, { form: "10-K/A", filed: "2026-02-01" }),
    makeAnnualFact("income-2024-8k", 2024, 999, { form: "8-K", filed: "2025-04-01" }),
    makeAnnualFact("revenue-2025-q1", 2025, 50, { form: "10-Q/A", filed: "2025-05-01", start: "2025-01-01", end: "2025-03-31", fy: 2025, fp: "Q1" }),
  ];
  const result = normalizeFinancials(makeFacts({
    NetIncomeLoss: { unit: "USD", values: rawFacts.slice(0, 4) },
    RevenueFromContractWithCustomerExcludingAssessedTax: { unit: "USD", values: [rawFacts[4]!] },
  }), makeSubmissions(rawFacts), "AAPL");
  assert.equal(result.metrics["Net Income"].latest?.value, 110);
  assert.equal(result.metrics["Net Income"].latest?.form, "10-K/A");
  assert.equal(result.metrics["Net Income"].annualHistory[0]?.periodEnd, "2024-12-31");
  assert.equal(result.metrics["Net Income"].annualHistory[0]?.value, 110);
  assert.equal(result.metrics.Revenue.latest?.form, "10-Q/A");
  assert.equal(result.metrics["Net Income"].annualHistory.some((fact) => fact.accessionNumber === "income-2024-8k"), false);
});

test("FCF requires compatible USD source facts and exact periods; it never substitutes zero", () => {
  const ocf = makeAnnualFact("ocf-2024", 2024, 100);
  const capexShares = makeAnnualFact("capex-shares-2024", 2024, 10);
  const incompatible = normalizeFinancials(makeFacts({
    NetCashProvidedByUsedInOperatingActivities: { unit: "USD", values: [ocf] },
    PaymentsToAcquirePropertyPlantAndEquipment: { unit: "USD/shares", values: [capexShares] },
  }), makeSubmissions([ocf, capexShares]), "AAPL");
  assert.equal(incompatible.metrics["Free Cash Flow"].status, "unavailable");
  assert.equal(incompatible.metrics["Free Cash Flow"].latest, undefined);
  assert.match(incompatible.metrics["Free Cash Flow"].warning ?? "", /Capital Expenditure is missing|compatible unit/);

  const capexMillions = makeAnnualFact("capex-millions-2024", 2024, 10);
  const incompatibleMillions = normalizeFinancials(makeFacts({
    NetCashProvidedByUsedInOperatingActivities: { unit: "USD", values: [ocf] },
    PaymentsToAcquirePropertyPlantAndEquipment: { unit: "USDm", values: [capexMillions] },
  }), makeSubmissions([ocf, capexMillions]), "AAPL");
  assert.equal(incompatibleMillions.metrics["Free Cash Flow"].status, "unavailable");
  assert.equal(incompatibleMillions.metrics["Free Cash Flow"].latest, undefined);

  const missingOcf = normalizeFinancials(makeFacts({
    PaymentsToAcquirePropertyPlantAndEquipment: { unit: "USD", values: [makeAnnualFact("capex-only", 2024, 10)] },
  }), makeSubmissions([makeAnnualFact("capex-only", 2024, 10)]), "AAPL");
  assert.match(missingOcf.metrics["Free Cash Flow"].warning ?? "", /Operating Cash Flow is missing/);

  const missingCapex = normalizeFinancials(makeFacts({
    NetCashProvidedByUsedInOperatingActivities: { unit: "USD", values: [ocf] },
  }), makeSubmissions([ocf]), "AAPL");
  assert.match(missingCapex.metrics["Free Cash Flow"].warning ?? "", /Capital Expenditure is missing/);

  const capexMismatchedPeriod = makeAnnualFact("capex-2023", 2023, 10);
  const mismatchedPeriod = normalizeFinancials(makeFacts({
    NetCashProvidedByUsedInOperatingActivities: { unit: "USD", values: [ocf] },
    PaymentsToAcquirePropertyPlantAndEquipment: { unit: "USD", values: [capexMismatchedPeriod] },
  }), makeSubmissions([ocf, capexMismatchedPeriod]), "AAPL");
  assert.equal(mismatchedPeriod.metrics["Free Cash Flow"].status, "unavailable");
  assert.match(mismatchedPeriod.metrics["Free Cash Flow"].warning ?? "", /no matching fiscal year/);

  const complete = normalizeFinancials(makeFacts({
    NetCashProvidedByUsedInOperatingActivities: { unit: "USD", values: [ocf] },
    PaymentsToAcquirePropertyPlantAndEquipment: { unit: "USD", values: [makeAnnualFact("capex-2024", 2024, 10)] },
  }), makeSubmissions([ocf, makeAnnualFact("capex-2024", 2024, 10)]), "AAPL");
  const fcf = complete.metrics["Free Cash Flow"].latest;
  assert.equal(fcf?.value, 90);
  assert.equal(fcf?.provenanceType, "system-derived");
  assert.equal(fcf?.derivedFrom?.length, 2);
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
    assert.equal(new Headers(init?.headers).get("User-Agent"), "StockPilot/test unit-test@stockpilot.invalid");
    assert.equal(new Headers(init?.headers).get("Accept"), "application/json");
    assert.equal(new Headers(init?.headers).get("Accept-Encoding"), "gzip, deflate");
    return new Response('{"ok":true}', { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const client = new FetchSecHttpClient({ userAgent: "StockPilot/test unit-test@stockpilot.invalid", fetchImpl, sleep: async () => undefined });
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
  const client = new FetchSecHttpClient({ userAgent: "StockPilot/test unit-test@stockpilot.invalid", fetchImpl, sleep: async () => undefined });
  assert.deepEqual(await client.getJson<{ ok: boolean }>("https://data.sec.gov/test"), { ok: true });
  assert.equal(calls, 3);
  let forbiddenCalls = 0;
  const forbiddenFetch = (async () => { forbiddenCalls += 1; return new Response("no", { status: 403 }); }) as typeof fetch;
  const forbidden = new FetchSecHttpClient({ userAgent: "StockPilot/test unit-test@stockpilot.invalid", fetchImpl: forbiddenFetch, sleep: async () => undefined });
  await assert.rejects(() => forbidden.getJson("https://data.sec.gov/test"));
  assert.equal(forbiddenCalls, 1);
});

test("SEC HTTP client rejects invalid JSON and oversized responses", async () => {
  const invalidFetch = (async () => new Response("not-json", { status: 200 })) as typeof fetch;
  const invalid = new FetchSecHttpClient({ userAgent: "StockPilot/test unit-test@stockpilot.invalid", fetchImpl: invalidFetch, sleep: async () => undefined });
  await assert.rejects(() => invalid.getJson("https://data.sec.gov/test"), (error: unknown) => error instanceof Error && error.message.includes("invalid JSON"));
  const largeFetch = (async () => new Response("1234567890", { status: 200 })) as typeof fetch;
  const large = new FetchSecHttpClient({ userAgent: "StockPilot/test unit-test@stockpilot.invalid", fetchImpl: largeFetch, maxResponseBytes: 5, sleep: async () => undefined });
  await assert.rejects(() => large.getJson("https://data.sec.gov/test"), (error: unknown) => error instanceof Error && error.message.includes("safety limit"));
});

test("SEC HTTP client cancels a streamed response as soon as the byte cap is exceeded", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new TextEncoder().encode("12345"));
      controller.enqueue(new TextEncoder().encode("67890"));
    },
    cancel() { cancelled = true; },
  });
  const fetchImpl = (async () => new Response(body, { status: 200 })) as typeof fetch;
  const client = new FetchSecHttpClient({ userAgent: "StockPilot/test unit-test@stockpilot.invalid", fetchImpl, maxResponseBytes: 5, sleep: async () => undefined });
  await assert.rejects(() => client.getJson("https://data.sec.gov/test"), (error: unknown) => error instanceof Error && error.message.includes("safety limit"));
  assert.equal(cancelled, true);
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
  const liveProvider = createSecProvider({ client, cache: new MemorySecCache(), userAgent: "StockPilot/test unit-test@stockpilot.invalid" });
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
  const provider = createSecProvider({ client, userAgent: "StockPilot/test unit-test@stockpilot.invalid", cache: new MemorySecCache(), cacheTtlSeconds: 1, clock: () => now });
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

test("SEC identity and filings responses include validated metadata and sample provenance", async () => {
  const identityResponse = await createSecIdentityResponse("AAPL", new MockSecFilingDataProvider());
  assert.equal(identityResponse.status, 200);
  const identityBody: unknown = await identityResponse.json();
  const parsedIdentity = secCompanyIdentityResponseSchema.safeParse(identityBody);
  assert.equal(parsedIdentity.success, true);
  if (parsedIdentity.success) {
    assert.equal(parsedIdentity.data.ticker, "AAPL");
    assert.equal(parsedIdentity.data.sourceMode, "sample");
    assert.equal(parsedIdentity.data.status, "fallback");
    assert.ok(parsedIdentity.data.fetchedAt);
    assert.ok(parsedIdentity.data.asOf);
  }
  const filingsResponse = await createSecFilingsResponse("AAPL", new MockSecFilingDataProvider());
  assert.equal(filingsResponse.status, 200);
  const filingsBody: unknown = await filingsResponse.json();
  const parsedFilings = secRecentFilingsResponseSchema.safeParse(filingsBody);
  assert.equal(parsedFilings.success, true);
  if (parsedFilings.success) {
    assert.equal(parsedFilings.data.ticker, "AAPL");
    assert.equal(parsedFilings.data.sourceMode, "sample");
    assert.equal(parsedFilings.data.filings.length, 3);
  }
  assert.equal((await createSecIdentityResponse("NOPE", new MockSecFilingDataProvider())).status, 400);
  assert.equal((await createSecFilingsResponse("NOPE", new MockSecFilingDataProvider())).status, 400);
});
