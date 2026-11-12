import { getCurrentUser } from "@/lib/auth";
import { isDemoRequest } from "@/lib/demo-mode";
import { getNetworkStatus } from "@/lib/stellar";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

// See note in src/app/api/health/route.ts — API routes must not pre-render.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // In demo mode, serve a demo network status with the platform's "open"
    // channels so the dashboard always shows a live Stellar network.
    if (await isDemoRequest()) {
      const now = new Date().toISOString();
      return successResponse({
        ledgerSequence: 42000000 + Math.floor(Math.random() * 1000000),
        baseFeeStroops: 100,
        closedAt: now,
        networkPass: true,
      });
    }

    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const status = await getNetworkStatus();
    return successResponse(status);
  } catch (err) {
    console.error("Network status fetch error:", err);
    return errorResponse("Failed to fetch network status", 500);
  }
}
