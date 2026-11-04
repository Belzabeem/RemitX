import { HORIZON_URL } from "@/lib/stellar";
import { data, DATA_MODE } from "@/lib/data";
import { successResponse } from "@/lib/api-response";

// API routes must not pre-render at build time
export const dynamic = "force-dynamic";

const STELLAR_CHECK_TIMEOUT_MS = 5000;

async function checkDatabase(): Promise<boolean> {
  try {
    // In-memory or database query verification
    const list = await data.users.list();
    return Array.isArray(list);
  } catch {
    return false;
  }
}

async function checkStellar(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STELLAR_CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(HORIZON_URL, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Lightweight, unauthenticated health check for uptime monitoring: verifies
 * data layer connectivity, active dataMode, and Stellar Horizon reachability.
 */
export async function GET() {
  const [database, stellar] = await Promise.all([checkDatabase(), checkStellar()]);
  const healthy = database && stellar;

  return successResponse(
    {
      status: healthy ? "ok" : "degraded",
      dataMode: DATA_MODE,
      checks: { database, stellar },
    },
    healthy ? 200 : 503
  );
}
