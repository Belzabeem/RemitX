import { getCurrentUser } from "@/lib/auth";
import { fundTestnetAccount } from "@/lib/stellar";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

/** Testnet only: asks Friendbot to fund the signed-in user's connected wallet. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();
  if (!user.stellarPublicKey) return errorResponse("Connect a Stellar wallet first.", 400);
  if (!rateLimit(`fund:${user.id}`, 3, 60_000).allowed) return errorResponse("Too many requests.", 429);

  const result = await fundTestnetAccount(user.stellarPublicKey);
  return result.funded
    ? successResponse({ funded: true })
    : errorResponse(result.reason ?? "Could not fund account", 400);
}
