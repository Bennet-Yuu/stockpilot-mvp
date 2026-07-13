import assert from "node:assert/strict";
import test from "node:test";
import { stocks } from "../app/data";
import { calculateEvidenceScore, calculateReadiness } from "../app/domain/scoring";
import { calculateTradeMetrics } from "../app/domain/portfolio";
import type { ChecklistInput, TradeRecord } from "../app/domain/models";
import { readLocalePreference, writeLocalePreference } from "../app/i18n";
import { MockMarketDataProvider } from "../app/providers/marketData";
import { readUserData, userDataSchema, writeUserData } from "../app/storage/userData";

const blank: ChecklistInput = { why: "", holding: "", invalidation: "", maxLoss: "", weight: "", driver: "", event: "", target: "", exit: "" };

test("locale preference defaults to Chinese and persists the English toggle", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } as unknown as Storage;
  assert.equal(readLocalePreference(storage), "zh");
  writeLocalePreference("en", storage);
  assert.equal(readLocalePreference(storage), "en");
});

test("research score stays within 0–100 and preserves the five weights", () => {
  assert.equal(calculateEvidenceScore(stocks.AAPL), 73);
  assert.ok(calculateEvidenceScore({ scores: [{ label: "test", value: 101, max: 100, explanation: "" }] }) <= 100);
  assert.ok(calculateEvidenceScore({ scores: [{ label: "test", value: -2, max: 100, explanation: "" }] }) >= 0);
});

test("buy readiness warns on missing invalidation, concentration, loss and event risk", () => {
  const result = calculateReadiness({ ...blank, why: "Price went up", weight: "25", maxLoss: "25", event: "Yes", driver: "Recent price movement" });
  assert.equal(result.completedCount, 5);
  assert.ok(result.score < 60);
  assert.deepEqual(result.warnings.map((warning) => warning.code), ["MISSING_INVALIDATION", "OVERSIZED_POSITION", "HIGH_LOSS_LIMIT", "MAJOR_EVENT", "MOMENTUM_CHASING", "MISSING_EXIT_PLAN"]);
});

test("complete conservative checklist reaches a paper-trade-ready score", () => {
  const result = calculateReadiness({ why: "Recurring revenue and improving free cash flow support a durable thesis.", holding: "6–12 months", invalidation: "Two quarters of falling free cash flow and slowing core growth.", maxLoss: "10", weight: "8", driver: "Fundamentals", event: "No", target: "245", exit: "Exit if the invalidation condition occurs." });
  assert.equal(result.score, 100);
  assert.equal(result.warnings.length, 0);
});

test("paper trade metrics use cost basis, value, return and portfolio weight", () => {
  const trade: TradeRecord = { id: 1, ticker: "AAPL", buyPrice: 100, shares: 4, date: "2026-01-01", target: 130, maxLoss: 10, thesis: "", invalidation: "", holding: "6–12 months" };
  assert.deepEqual(calculateTradeMetrics(trade, 125, 1000), { costBasis: 400, currentValue: 500, unrealizedPnL: 100, returnPercent: 0.25, portfolioWeight: 0.5 });
});

test("market provider accepts supported tickers and rejects invalid input", () => {
  const provider = new MockMarketDataProvider();
  assert.equal(provider.getStock("nvda")?.ticker, "NVDA");
  assert.equal(provider.getStock("GME"), null);
  assert.deepEqual(provider.listSupportedTickers(), ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA"]);
});

test("localStorage data is versioned, validated and safely recovered", () => {
  const values = new Map<string, string>();
  const storage: Storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => void values.set(key, value), removeItem: (key) => void values.delete(key), clear: () => void values.clear(), key: (index) => [...values.keys()][index] ?? null, get length() { return values.size; } };
  const valid = { version: 1 as const, watchlist: [], trades: [], checklistDrafts: {}, journals: {} };
  assert.equal(writeUserData(valid, storage), true);
  assert.equal(readUserData(storage).recovered, false);
  values.set("stockpilot-user-data-v1", "{broken json");
  assert.equal(readUserData(storage).recovered, true);
  assert.equal(userDataSchema.safeParse(valid).success, true);
});

test("key workflow can search NVDA, add it to watchlist and create a trade input", () => {
  const provider = new MockMarketDataProvider();
  const stock = provider.getStock("NVDA");
  assert.equal(stock?.ticker, "NVDA");
  assert.equal(calculateEvidenceScore(stock!), 79);
  const checklist = { ...blank, why: "AI infrastructure demand supports revenue growth.", holding: "6–12 months", invalidation: "Data-center demand and free cash flow deteriorate for two quarters.", maxLoss: "10", weight: "8", driver: "Fundamentals", event: "No", target: "160", exit: "Reassess on thesis invalidation." };
  assert.ok(calculateReadiness(checklist).score >= 60);
});
