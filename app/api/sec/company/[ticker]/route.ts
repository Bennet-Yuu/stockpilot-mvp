import { createSecIdentityResponse } from "../../response";

export async function GET(_request: Request, { params }: { params: Promise<{ ticker: string }> }) {
  try { return createSecIdentityResponse((await params).ticker); } catch { return createSecIdentityResponse(undefined); }
}
