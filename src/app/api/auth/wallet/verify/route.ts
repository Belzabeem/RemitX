import { NextRequest } from "next/server";
import { z } from "zod";
import { data } from "@/lib/data";
import { getCurrentUser, signToken, setSessionCookie, toSafeUser } from "@/lib/auth";
import { verifyChallenge, WalletAuthError, walletPlaceholderEmail } from "@/lib/wallet-auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { rateLimit, logSecurityEvent, readBodyWithLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ transaction: z.string().min(1).max(8192) });

/**
 * Verifies the signed SEP-10 challenge, then signs the user in.
 * - Known wallet  -> sign in to its account.
 * - Unknown wallet while signed in with email -> link the wallet to that account.
 * - Unknown wallet otherwise -> create a wallet-only account (no password, no email).
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimit(`wallet-verify:${ip}`, 10, 60_000).allowed) {
      logSecurityEvent("rate_limited", { ip, endpoint: "wallet-verify" });
      return errorResponse("Too many attempts. Please try again later.", 429);
    }
    const parsed = bodySchema.safeParse(await readBodyWithLimit(request));
    if (!parsed.success) return errorResponse("A signed challenge is required", 400);

    let account: string;
    try {
      ({ account } = verifyChallenge(parsed.data.transaction));
    } catch (err) {
      if (err instanceof WalletAuthError) {
        logSecurityEvent("login_failed", { reason: "wallet_challenge_invalid" });
        return errorResponse(err.message, 401);
      }
      throw err;
    }

    let user = await data.users.findByStellarPublicKey(account);
    if (!user) {
      const current = await getCurrentUser();
      if (current && !current.stellarPublicKey) {
        user = await data.users.update(current.id, { stellarPublicKey: account });
      } else {
        user = await data.users.create({
          firstName: "Stellar",
          lastName: "Wallet",
          email: walletPlaceholderEmail(account),
          passwordHash: "",
          stellarPublicKey: account,
          kycStatus: "pending",
          sessionVersion: 1,
          failedLoginAttempts: 0,
          lockedUntil: null,
        });
      }
    }
    if (!user) return errorResponse("Could not sign in", 500);

    logSecurityEvent("login_success", { userId: user.id, method: "wallet" });
    await setSessionCookie(signToken(toSafeUser(user), user.sessionVersion || 1));
    return successResponse({ user: toSafeUser(user) });
  } catch (err) {
    console.error("Wallet verify error:", err);
    return errorResponse("Could not verify wallet", 500);
  }
}
