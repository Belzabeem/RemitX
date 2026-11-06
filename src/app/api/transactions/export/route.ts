import { NextRequest } from "next/server";
import { data } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { errorResponse, unauthorizedResponse } from "@/lib/api-response";
import { EXPLORER_BASE } from "@/lib/stellar";

export const dynamic = "force-dynamic";

/** Download your own transfer history as CSV (default) or JSON. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();
  const format = new URL(request.url).searchParams.get("format") ?? "csv";
  if (format !== "csv" && format !== "json") return errorResponse("format must be csv or json", 400);

  const { transactions } = await data.transactions.findByUserId(user.id, { limit: 10_000 });
  const rows = transactions.map((t) => ({
    id: t.id,
    createdAt: t.createdAt,
    status: t.status,
    fromAsset: t.fromAsset,
    fromAmount: t.fromAmount,
    toAsset: t.toAsset,
    toAmount: t.toAmount,
    recipient: t.recipientAddress,
    txHash: t.stellarTxHash,
    explorer: t.stellarTxHash ? `${EXPLORER_BASE}/tx/${t.stellarTxHash}` : "",
  }));

  const headers = { "Content-Disposition": `attachment; filename="remitx-transfers.${format}"`, "Cache-Control": "no-store" };
  if (format === "json") {
    return new Response(JSON.stringify(rows, null, 2), { headers: { ...headers, "Content-Type": "application/json" } });
  }
  const csv = toCsv(
    Object.keys(rows[0] ?? { id: 0, createdAt: 0, status: 0, fromAsset: 0, fromAmount: 0, toAsset: 0, toAmount: 0, recipient: 0, txHash: 0, explorer: 0 }),
    rows.map((r) => Object.values(r))
  );
  return new Response(csv, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } });
}
