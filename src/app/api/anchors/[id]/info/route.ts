import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ANCHORS } from "@/lib/anchors";
import { getAnchorInfo } from "@/lib/sep24";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** Live SEP-24 info (fees, limits) read from the anchor's own servers. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();
  const { id } = await params;
  const anchor = ANCHORS.find((a) => a.id === id);
  if (!anchor) return errorResponse("Unknown anchor", 404);
  return successResponse(await getAnchorInfo(anchor.homeDomain));
}
