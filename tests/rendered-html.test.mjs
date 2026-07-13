import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the StockPilot product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>StockPilot/);
  assert.match(html, /Good morning, Demo Investor/);
  assert.match(html, /Paper Portfolio/);
  assert.match(html, /Buy Checklist/);
  assert.match(html, /Demo mode/);
});

test("renders required guardrails and original-source affordances", async () => {
  const html = await (await render()).text();
  assert.match(html, /educational research and paper-trading tool/i);
  assert.match(html, /does not provide personalized investment advice/i);
  assert.match(html, /sample data/i);
  assert.match(html, /Source fact/);
  assert.match(html, /https:\/\/www\.sec\.gov\/edgar\/search\//);
  assert.match(html, /company investor relations/i);
  assert.doesNotMatch(html, /Strong Buy|Guaranteed Return/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});
