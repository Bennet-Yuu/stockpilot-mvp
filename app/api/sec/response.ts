import { NextResponse } from "next/server";
import { normalizeSecTicker } from "../../providers/sec/tickerMap";
import { SecProviderError } from "../../providers/sec/errors";
import { secCompanyFinancialSnapshotSchema, secCompanyIdentityResponseSchema, secRecentFilingsResponseSchema } from "../../providers/sec/schemas";
import { getSecFilingDataProvider } from "../../providers/sec/provider";
import type { SecFilingDataProvider } from "../../providers/sec/types";
import type { SecDiagnosticCode } from "../../providers/sec/errors";

const headers = { "Cache-Control": "private, max-age=60", "X-Content-Type-Options": "nosniff" };

function safeDiagnosticCode(error: unknown): SecDiagnosticCode {
  if (error instanceof SecProviderError && error.code !== "SEC_INVALID_TICKER") return error.code;
  return "SEC_UNAVAILABLE";
}

export async function createSecSnapshotResponse(rawTicker: unknown, provider?: SecFilingDataProvider): Promise<NextResponse> {
  let ticker;
  try {
    ticker = normalizeSecTicker(rawTicker);
  } catch {
    return NextResponse.json({ error: "Unsupported ticker", status: "invalid-ticker" }, { status: 400, headers });
  }
  try {
    const snapshot = await (provider ?? getSecFilingDataProvider()).getCompanySnapshot(ticker);
    const parsed = secCompanyFinancialSnapshotSchema.safeParse(snapshot);
    if (!parsed.success) return NextResponse.json({ error: "SEC snapshot failed validation", status: "unavailable", diagnosticCode: "SEC_INVALID_RESPONSE" }, { status: 502, headers });
    return NextResponse.json(parsed.data, { status: 200, headers });
  } catch (error) {
    if (error instanceof SecProviderError && error.code === "SEC_INVALID_TICKER") return NextResponse.json({ error: "Unsupported ticker", status: "invalid-ticker" }, { status: 400, headers });
    return NextResponse.json({ error: "SEC data is temporarily unavailable", status: "unavailable", diagnosticCode: safeDiagnosticCode(error) }, { status: 503, headers });
  }
}

export async function createSecIdentityResponse(rawTicker: unknown, provider?: SecFilingDataProvider): Promise<NextResponse> {
  let ticker;
  try { ticker = normalizeSecTicker(rawTicker); } catch { return NextResponse.json({ error: "Unsupported ticker", status: "invalid-ticker" }, { status: 400, headers }); }
  try {
    const snapshot = await (provider ?? getSecFilingDataProvider()).getCompanySnapshot(ticker);
    const payload = { ticker, identity: snapshot.identity, sourceMode: snapshot.sourceMode, status: snapshot.status, fetchedAt: snapshot.fetchedAt, asOf: snapshot.asOf, warnings: snapshot.warnings, diagnosticCode: snapshot.diagnosticCode };
    const parsed = secCompanyIdentityResponseSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: "SEC identity failed validation", status: "unavailable", diagnosticCode: "SEC_INVALID_RESPONSE" }, { status: 502, headers });
    return NextResponse.json(parsed.data, { status: 200, headers });
  } catch (error) { return NextResponse.json({ error: "SEC data is temporarily unavailable", status: "unavailable", diagnosticCode: safeDiagnosticCode(error) }, { status: 503, headers }); }
}

export async function createSecFilingsResponse(rawTicker: unknown, provider?: SecFilingDataProvider): Promise<NextResponse> {
  let ticker;
  try { ticker = normalizeSecTicker(rawTicker); } catch { return NextResponse.json({ error: "Unsupported ticker", status: "invalid-ticker" }, { status: 400, headers }); }
  try {
    const snapshot = await (provider ?? getSecFilingDataProvider()).getCompanySnapshot(ticker);
    const payload = { ticker, filings: snapshot.recentFilings, sourceMode: snapshot.sourceMode, status: snapshot.status, fetchedAt: snapshot.fetchedAt, asOf: snapshot.asOf, warnings: snapshot.warnings, diagnosticCode: snapshot.diagnosticCode };
    const parsed = secRecentFilingsResponseSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: "SEC filings failed validation", status: "unavailable", diagnosticCode: "SEC_INVALID_RESPONSE" }, { status: 502, headers });
    return NextResponse.json(parsed.data, { status: 200, headers });
  } catch (error) { return NextResponse.json({ error: "SEC data is temporarily unavailable", status: "unavailable", diagnosticCode: safeDiagnosticCode(error) }, { status: 503, headers }); }
}
