import { getCurrentUser } from "@/lib/auth";
import { successResponse, unauthorizedResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const KEY_RE = /^G[A-Z2-7]{55}$/;

/** Assets this deployment can transact: XLM plus every STELLAR_<CODE>_ISSUER that is set and valid. */
// TODO: backend#sac-endpoints — Add SAC issuance / redemption endpoints when
// anchors go live (see contracts#sac-issuance).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();
  const codes = Object.entries(process.env)
    .map(([k, v]) => ({ m: /^STELLAR_([A-Z0-9]{1,12})_ISSUER$/.exec(k), v }))
    .filter((x): x is { m: RegExpExecArray; v: string } => Boolean(x.m) && KEY_RE.test(x.v ?? ""))
    .map((x) => x.m[1])
    .sort();
  return successResponse({ assets: ["XLM", ...codes] });
}
