import { createSecSnapshotResponse } from "../../response";

export async function GET(_request: Request, { params }: { params: Promise<{ ticker: string }> }) {
  try { return createSecSnapshotResponse((await params).ticker); } catch { return createSecSnapshotResponse(undefined); }
}
