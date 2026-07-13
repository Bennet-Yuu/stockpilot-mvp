import { NextResponse } from "next/server";
import { normalizeSecTicker } from "../../providers/sec/tickerMap";
import { SecProviderError } from "../../providers/sec/errors";
import { secCompanyFinancialSnapshotSchema } from "../../providers/sec/schemas";
import { secFilingDataProvider } from "../../providers/sec/provider";
import type { SecFilingDataProvider } from "../../providers/sec/types";

const headers = { "Cache-Control": "private, max-age=60", "X-Content-Type-Options": "nosniff" };

export async function createSecSnapshotResponse(rawTicker: unknown, provider: SecFilingDataProvider = secFilingDataProvider): Promise<NextResponse> {
  let ticker;
  try {
    ticker = normalizeSecTicker(rawTicker);
  } catch {
    return NextResponse.json({ error: "Unsupported ticker", status: "invalid-ticker" }, { status: 400, headers });
  }
  try {
    const snapshot = await provider.getCompanySnapshot(ticker);
    const parsed = secCompanyFinancialSnapshotSchema.safeParse(snapshot);
    if (!parsed.success) return NextResponse.json({ error: "SEC snapshot failed validation", status: "unavailable" }, { status: 502, headers });
    return NextResponse.json(parsed.data, { status: 200, headers });
  } catch (error) {
    if (error instanceof SecProviderError && error.code === "SEC_INVALID_TICKER") return NextResponse.json({ error: "Unsupported ticker", status: "invalid-ticker" }, { status: 400, headers });
    return NextResponse.json({ error: "SEC data is temporarily unavailable", status: "unavailable" }, { status: 503, headers });
  }
}

export async function createSecIdentityResponse(rawTicker: unknown, provider: SecFilingDataProvider = secFilingDataProvider): Promise<NextResponse> {
  let ticker;
  try { ticker = normalizeSecTicker(rawTicker); } catch { return NextResponse.json({ error: "Unsupported ticker", status: "invalid-ticker" }, { status: 400, headers }); }
  try {
    const identity = await provider.getCompanyIdentity(ticker);
    return NextResponse.json({ ticker, identity }, { status: 200, headers });
  } catch { return NextResponse.json({ error: "SEC data is temporarily unavailable", status: "unavailable" }, { status: 503, headers }); }
}

export async function createSecFilingsResponse(rawTicker: unknown, provider: SecFilingDataProvider = secFilingDataProvider): Promise<NextResponse> {
  let ticker;
  try { ticker = normalizeSecTicker(rawTicker); } catch { return NextResponse.json({ error: "Unsupported ticker", status: "invalid-ticker" }, { status: 400, headers }); }
  try {
    const filings = await provider.getRecentFilings(ticker);
    return NextResponse.json({ ticker, filings, sourceMode: filings.length > 0 ? "live" : "unavailable", asOf: new Date().toISOString() }, { status: 200, headers });
  } catch { return NextResponse.json({ error: "SEC data is temporarily unavailable", status: "unavailable" }, { status: 503, headers }); }
}
