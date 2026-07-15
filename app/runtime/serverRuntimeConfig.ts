import { NextResponse } from "next/server";
import { getAiHealthSnapshot } from "../../../providers/ai/client";
import { getLastAiDiagnosticCode } from "../../../providers/ai/errors";
import { aiPromptVersion } from "../../../providers/ai/schemas";

export async function GET(): Promise<NextResponse> {
  const health = getAiHealthSnapshot();
  return NextResponse.json({ ...health, promptVersion: aiPromptVersion, lastDiagnosticCode: getLastAiDiagnosticCode(), checkedAt: new Date().toISOString() }, { status: 200, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
