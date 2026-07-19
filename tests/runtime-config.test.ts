import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GET as getSecHealth } from "../app/api/sec/health/route";
import { createSecSnapshotResponse } from "../app/api/sec/response";
import { getSecRuntimeConfig, FetchSecHttpClient } from "../app/providers/sec/client";
import { createSecProvider } from "../app/providers/sec/provider";
import { MemorySecCache } from "../app/providers/sec/cache";
import { clearServerRuntimeConfigForTests, getServerRuntimeConfig, setServerRuntimeConfig } from "../app/runtime/serverRuntimeConfig";
import type { SecFilingDataProvider } from "../app/providers/sec/types";

const submissions = JSON.parse(readFileSync("tests/fixtures/sec/aapl-submissions.json", "utf8")) as unknown;
const facts = JSON.parse(readFileSync("tests/fixtures/sec/aapl-companyfacts.json", "utf8")) as unknown;

function fixtureFetch(input: RequestInfo | URL): Promise<Response> {
  const url = String(input);
  const body = url.includes("submissions") ? submissions : facts;
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }));
}

test("Worker adapter copies only SEC fields and health never returns the secret", async () => {
  clearServerRuntimeConfigForTests();
  setServerRuntimeConfig({
    SEC_USER_AGENT: "StockPilot/test contact@example.invalid",
    SEC_REQUESTS_PER_SECOND: "5",
    SEC_CACHE_TTL_SECONDS: "3600",
    unrelated_secret: "must-not-be-copied",
  });
  assert.equal(getServerRuntimeConfig().SEC_USER_AGENT, "StockPilot/test contact@example.invalid");
  const health = await getSecHealth();
  const body = await health.json() as Record<string, unknown>;
  assert.equal(body.runtime, "cloudflare");
  assert.equal(body.configured, true);
  assert.equal(body.userAgentPresent, true);
  assert.equal(body.requestsPerSecondConfigured, true);
  assert.equal("SEC_USER_AGENT" in body, false);
  assert.equal(JSON.stringify(body).includes("contact@example.invalid"), false);
  assert.equal(JSON.stringify(body).includes("must-not-be-copied"), false);
});

test("Node runtime continues reading process.env after the test adapter is cleared", () => {
  const previous = process.env.SEC_USER_AGENT;
  try {
    clearServerRuntimeConfigForTests();
    process.env.SEC_USER_AGENT = "StockPilot/node node@example.invalid";
    assert.equal(getSecRuntimeConfig().userAgent, "StockPilot/node node@example.invalid");
  } finally {
    if (previous === undefined) delete process.env.SEC_USER_AGENT;
    else process.env.SEC_USER_AGENT = previous;
    clearServerRuntimeConfigForTests();
  }
});

test("Node runtime reads the allowlisted AI fields without exposing unrelated environment values", () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.OPENAI_MODEL;
  const previousUnrelated = process.env.UNRELATED_STOCKPILOT_SECRET;
  try {
    clearServerRuntimeConfigForTests();
    process.env.OPENAI_API_KEY = "sk-test-only";
    process.env.OPENAI_MODEL = "gpt-test";
    process.env.UNRELATED_STOCKPILOT_SECRET = "must-not-be-copied";
    const config = getServerRuntimeConfig();
    assert.equal(config.OPENAI_API_KEY, "sk-test-only");
    assert.equal(config.OPENAI_MODEL, "gpt-test");
    assert.equal("UNRELATED_STOCKPILOT_SECRET" in config, false);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = previousModel;
    if (previousUnrelated === undefined) delete process.env.UNRELATED_STOCKPILOT_SECRET;
    else process.env.UNRELATED_STOCKPILOT_SECRET = previousUnrelated;
    clearServerRuntimeConfigForTests();
  }
});

test("a provider imported before Worker injection still uses request-time configuration", async () => {
  clearServerRuntimeConfigForTests();
  const beforeInjection = createSecProvider({ cache: new MemorySecCache() });
  const sample = await beforeInjection.getCompanySnapshot("TSLA");
  assert.equal(sample.status, "not-configured");

  const originalFetch = globalThis.fetch;
  try {
    setServerRuntimeConfig({ SEC_USER_AGENT: "StockPilot/worker worker@example.invalid" });
    globalThis.fetch = fixtureFetch as typeof fetch;
    const response = await createSecSnapshotResponse("AAPL");
    const body = await response.json() as { sourceMode: string; status: string; diagnosticCode?: string };
    assert.equal(response.status, 200);
    assert.equal(body.sourceMode, "live");
    assert.ok(body.status === "success" || body.status === "partial");
    assert.equal(body.diagnosticCode, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    clearServerRuntimeConfigForTests();
  }
});

test("safe diagnostic codes distinguish forbidden, network, and timeout failures", async () => {
  const forbidden = createSecProvider({
    cache: new MemorySecCache(),
    client: new FetchSecHttpClient({ userAgent: "StockPilot/test test@example.invalid", fetchImpl: (async () => new Response("no", { status: 403 })) as typeof fetch, sleep: async () => undefined }),
  });
  const forbiddenSnapshot = await forbidden.getCompanySnapshot("AAPL");
  assert.equal(forbiddenSnapshot.sourceMode, "sample");
  assert.equal(forbiddenSnapshot.status, "unavailable");
  assert.equal(forbiddenSnapshot.diagnosticCode, "SEC_FORBIDDEN");

  const network = createSecProvider({
    cache: new MemorySecCache(),
    client: new FetchSecHttpClient({ userAgent: "StockPilot/test test@example.invalid", fetchImpl: (async () => { throw new TypeError("network detail"); }) as typeof fetch, sleep: async () => undefined }),
  });
  assert.equal((await network.getCompanySnapshot("MSFT")).diagnosticCode, "SEC_NETWORK_ERROR");

  const timeout = createSecProvider({
    cache: new MemorySecCache(),
    client: new FetchSecHttpClient({ userAgent: "StockPilot/test test@example.invalid", fetchImpl: (async () => { throw new DOMException("timeout detail", "AbortError"); }) as typeof fetch, sleep: async () => undefined }),
  });
  assert.equal((await timeout.getCompanySnapshot("NVDA")).diagnosticCode, "SEC_TIMEOUT");
});

test("API errors expose no stack, email, or User-Agent", async () => {
  const brokenProvider = {
    getCompanySnapshot: async () => { throw new Error("secret@example.invalid StockPilot/private-agent stack"); },
  } as unknown as SecFilingDataProvider;
  const response = await createSecSnapshotResponse("AAPL", brokenProvider);
  const body = JSON.stringify(await response.json());
  assert.equal(response.status, 503);
  assert.equal(body.includes("secret@example.invalid"), false);
  assert.equal(body.includes("private-agent"), false);
  assert.equal(body.includes("stack"), false);
  assert.match(body, /SEC_UNAVAILABLE/);
});

test("Cloudflare compatibility date and env population flag are explicit", () => {
  const config = readFileSync("vite.config.ts", "utf8");
  assert.match(config, /compatibility_date:\s*["']2025-04-01["']/);
  assert.match(config, /nodejs_compat_populate_process_env/);
});
