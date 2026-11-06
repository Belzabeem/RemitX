import { NextRequest } from "next/server";
import { z } from "zod";
import { createChallenge } from "@/lib/wallet-auth";
import { isValidStellarPublicKey } from "@/lib/stellar-address";
import { successResponse, errorResponse } from "@/lib/api-response";
import { rateLimit, logSecurityEvent, readBodyWithLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  account: z.string().refine(isValidStellarPublicKey, "Invalid Stellar public key"),
});

/** Issues a SEP-10 challenge transaction for the wallet to sign. Nothing is submitted on-chain. */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimit(`wallet-challenge:${ip}`, 20, 60_000).allowed) {
      logSecurityEvent("rate_limited", { ip, endpoint: "wallet-challenge" });
      return errorResponse("Too many attempts. Please try again later.", 429);
    }
    const parsed = bodySchema.safeParse(await readBodyWithLimit(request));
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    return successResponse(createChallenge(parsed.data.account));
  } catch (err) {
    console.error("Wallet challenge error:", err);
    return errorResponse("Could not create challenge", 500);
  }
}
