import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { rpc } from "@stellar/stellar-sdk";
import { data } from "@/lib/data";
import { syncEscrowEvents, type EventSource } from "@/lib/indexer";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";

function authorised(request: NextRequest): boolean {
  const secret = process.env.INDEXER_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // open in dev only
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Pull new escrow events from Soroban RPC. Call from a scheduler (cron) with the INDEXER_SECRET bearer. */
export async function POST(request: NextRequest) {
  if (!authorised(request)) return errorResponse("Unauthorized", 401);
  const contractId = process.env.ESCROW_CONTRACT_ID;
  if (!contractId) {
    return errorResponse(
      "ESCROW_CONTRACT_ID is not set. The escrow contract has not been deployed yet (see docs/DEPLOYMENTS.md).",
      503
    );
  }
  try {
    const server = new rpc.Server(SOROBAN_RPC_URL);
    const result = await syncEscrowEvents({
      rpc: server as unknown as EventSource,
      repos: data,
      contractId,
      startLedger: process.env.INDEXER_START_LEDGER ? Number(process.env.INDEXER_START_LEDGER) : undefined,
    });
    return successResponse(result);
  } catch (err) {
    console.error("Indexer sync error:", err instanceof Error ? err.message : err);
    return errorResponse("Could not reach Soroban RPC", 502);
  }
}
