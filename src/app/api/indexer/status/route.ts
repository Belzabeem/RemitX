import { data } from "@/lib/data";
import { getIndexerStatus } from "@/lib/indexer";
import { successResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** Public indexer health (same idea as StellarStream's event-watcher /health). */
export async function GET() {
  return successResponse(await getIndexerStatus(data));
}
