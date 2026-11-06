import { NextRequest } from "next/server";
import { server, EXPLORER_BASE } from "@/lib/stellar";
import { getReceipt, ReceiptNotFoundError, type HorizonLike } from "@/lib/receipt";
import { successResponse, errorResponse } from "@/lib/api-response";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

/** Public: confirm a transfer by its Stellar transaction hash, read from Horizon. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ hash: string }> }) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`verify:${ip}`, 30, 60_000).allowed) return errorResponse("Too many requests.", 429);
  const { hash } = await params;
  try {
    return successResponse(await getReceipt(hash, server as unknown as HorizonLike, EXPLORER_BASE));
  } catch (err) {
    if (err instanceof ReceiptNotFoundError) return errorResponse(err.message, 404);
    console.error("Receipt lookup error:", err instanceof Error ? err.message : err);
    return errorResponse("Could not reach the Stellar network. Try again shortly.", 502);
  }
}
