import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isDemoRequest } from "@/lib/demo-mode";
import { getDemoRates } from "@/lib/demo-mode";
import { getRate, RateUnavailableError } from "@/lib/rates";
import { rateQuerySchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";

// See note in src/app/api/health/route.ts — API routes must not pre-render.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // In demo mode, serve demo rates so the platform always shows live
    // exchange rates regardless of network conditions.
    if (await isDemoRequest()) {
      const demoRates = await getDemoRates();
      const { from, to } = rateQuerySchema.parse({
        from: request.nextUrl.searchParams.get("from"),
        to: request.nextUrl.searchParams.get("to"),
      });

      const rateDoc = demoRates.find(
        (r) => r.fromAsset === from.toUpperCase() && r.toAsset === to.toUpperCase()
      );

      return successResponse({
        rate: rateDoc ? rateDoc.rate : "1.000",
        fromAsset: from.toUpperCase(),
        toAsset: to.toUpperCase(),
        fetchedAt: new Date().toISOString(),
        source: "demo",
      });
    }

    const user = await getCurrentUser();
    if (user) {
      const { from, to } = rateQuerySchema.parse({
        from: request.nextUrl.searchParams.get("from"),
        to: request.nextUrl.searchParams.get("to"),
      });

      const result = await getRate(from.toUpperCase(), to.toUpperCase());

      return successResponse({
        rate: result.rate,
        fromAsset: result.fromAsset,
        toAsset: result.toAsset,
        fetchedAt: result.fetchedAt,
        source: result.source,
      });
    }

    return errorResponse("Unauthorized", 401);
  } catch (err) {
    if (err instanceof RateUnavailableError) return errorResponse(err.message, 503);
    console.error("Rate fetch error:", err);
    return errorResponse("Failed to fetch exchange rate", 500);
  }
}
