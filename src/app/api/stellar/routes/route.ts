import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { server, resolveAsset } from "@/lib/stellar";
import { discoverRoutes } from "@/lib/routing";
import { routeQuerySchema } from "@/lib/validations";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";
import { rateLimit } from "@/lib/security";

// API routes must not pre-render
export const dynamic = "force-dynamic";

/**
 * Real Stellar path finding (Horizon /paths/strict-send). Returns the cheapest
 * route by amount received, the alternatives, and a full cost breakdown.
 * Nothing here is mocked or hardcoded.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();
    if (!rateLimit(`routes:${user.id}`, 60, 60_000).allowed) {
      return errorResponse("Too many requests. Please try again shortly.", 429);
    }

    const { searchParams } = new URL(request.url);
    const parsed = routeQuerySchema.safeParse({
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      amount: searchParams.get("amount") ?? "100",
    });
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid query", 400);
    }
    const from = parsed.data.from.toUpperCase();
    const to = parsed.data.to.toUpperCase();

    let sourceAsset, destAsset;
    try {
      sourceAsset = resolveAsset(from);
      destAsset = resolveAsset(to);
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : "Unsupported asset", 422);
    }

    const discovery = await discoverRoutes(
      { from, to, amount: parsed.data.amount, sourceAsset, destAsset },
      server as unknown as Parameters<typeof discoverRoutes>[1]
    );

    const allQuotes = [
      ...(discovery.best ? [discovery.best] : []),
      ...discovery.alternatives,
    ];
    const routes = allQuotes.map((q) => ({
      sourceAmount: q.sendAmount,
      destinationAmount: q.receiveAmount,
      path: q.hops,
    }));

    return successResponse({
      ...discovery,
      routes,
      amount: parsed.data.amount,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return errorResponse("Invalid query", 400);
    console.error("Routes fetch error:", err);
    return errorResponse("Could not reach Stellar network to find routes. Try again shortly.", 502);
  }
}
