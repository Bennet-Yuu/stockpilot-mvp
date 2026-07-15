import { NextResponse } from "next/server";
import { getServerRuntimeConfig, getServerRuntimeKind, getLastSecDiagnosticCode } from "../../../runtime/serverRuntimeConfig";
import { getSecRuntimeConfig } from "../../../providers/sec/client";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export function GET(): NextResponse {
  const raw = getServerRuntimeConfig();
  const config = getSecRuntimeConfig(raw);
  return NextResponse.json({
    runtime: getServerRuntimeKind(),
    configured: Boolean(config.userAgent),
    userAgentPresent: Boolean(config.userAgent),
    requestsPerSecondConfigured: Boolean(raw.SEC_REQUESTS_PER_SECOND),
    maxResponseBytesConfigured: Boolean(raw.SEC_MAX_RESPONSE_BYTES),
    lastDiagnosticCode: getLastSecDiagnosticCode() ?? null,
    checkedAt: new Date().toISOString(),
  }, { status: 200, headers });
}
