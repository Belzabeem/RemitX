/**
 * Escrow event indexer.
 *
 * Same job as StellarStream's event watcher: poll Soroban RPC for contract events,
 * keep a ledger cursor, and mirror on-chain state into the app's own records so the
 * UI never has to trust the browser about whether an escrow was released.
 *
 * Runs as a function you can call from a cron/scheduled hit (POST /api/indexer/sync)
 * instead of a separate long-running service, which fits serverless hosting.
 *
 * Status mapping: partial releases/refunds keep the escrow "locked" until the cumulative
 * settled amount reaches the escrow amount; on-chain "cancel" is stored as "refunded"
 * because the funds go back to the sender (the data model has no separate state).
 */
import { scValToNative, type xdr } from "@stellar/stellar-sdk";
import type { DataRepositories } from "./data/repositories";
import type { EscrowStatus } from "./data/types";

export interface RpcEvent {
  id: string;
  ledger: number;
  txHash: string;
  topic: xdr.ScVal[];
  value: xdr.ScVal;
}

export interface EventSource {
  getLatestLedger(): Promise<{ sequence: number }>;
  getEvents(request: {
    startLedger?: number;
    cursor?: string;
    filters: Array<{ type: "contract"; contractIds: string[] }>;
    limit?: number;
  }): Promise<{ events: RpcEvent[]; cursor?: string; latestLedger?: number }>;
}

export type EscrowAction = "deposit" | "release" | "refund" | "cancel" | "extend";

export interface EscrowEvent {
  action: EscrowAction;
  escrowId: string; // hex of the on-chain BytesN<32>
  ledger: number;
  txHash: string;
  args: unknown[];
}

const ACTIONS = new Set<string>(["deposit", "release", "refund", "cancel", "extend"]);
const LOOKBACK_LEDGERS = 1000; // roughly 80 minutes at ~5s per ledger
const PAGE_LIMIT = 100;
const MAX_PAGES_PER_RUN = 20;

export function decodeEscrowEvent(ev: RpcEvent): EscrowEvent | null {
  try {
    const topics = ev.topic.map((t) => scValToNative(t));
    if (topics[0] !== "escrow" || !ACTIONS.has(String(topics[1]))) return null;
    const id = topics[2];
    const escrowId = Buffer.isBuffer(id) || id instanceof Uint8Array ? Buffer.from(id).toString("hex") : null;
    if (!escrowId) return null;
    const native = scValToNative(ev.value);
    return {
      action: topics[1] as EscrowAction,
      escrowId,
      ledger: ev.ledger,
      txHash: ev.txHash,
      args: Array.isArray(native) ? native : [native],
    };
  } catch {
    return null;
  }
}

const big = (v: unknown): bigint => (typeof v === "bigint" ? v : BigInt(Number(v ?? 0)));

export interface SyncResult {
  processed: number;
  skipped: number;
  lastLedger: number | null;
  configured: true;
}

const CURSOR_KEY = "indexer:cursor";
const LEDGER_KEY = "indexer:lastLedger";
const RUN_KEY = "indexer:lastRunAt";

async function apply(ev: EscrowEvent, repos: DataRepositories, contractId: string): Promise<boolean> {
  const existing = await repos.escrows.findById(ev.escrowId);
  const settledKey = `indexer:settled:${ev.escrowId}`;

  if (ev.action === "deposit") {
    if (existing) {
      await repos.escrows.update(ev.escrowId, { depositTxHash: ev.txHash });
      return true;
    }
    const [sender, recipient, amount, asset, expiresAt] = ev.args as [string, string, bigint, string, bigint];
    const owner = await repos.users.findByStellarPublicKey(String(sender));
    if (!owner) return false; // not one of our users; nothing to mirror
    await repos.escrows.create({
      id: ev.escrowId,
      userId: owner.id,
      transactionId: `onchain-${ev.txHash}`,
      contractAddress: contractId,
      senderAddress: String(sender),
      recipientAddress: String(recipient),
      amount: big(amount).toString(),
      asset: String(asset),
      status: "locked",
      depositTxHash: ev.txHash,
      releaseTxHash: null,
      expiresAt: new Date(Number(big(expiresAt)) * 1000).toISOString(),
    });
    return true;
  }

  if (!existing) return false;

  if (ev.action === "extend") {
    await repos.escrows.update(ev.escrowId, { expiresAt: new Date(Number(big(ev.args[1])) * 1000).toISOString() });
    return true;
  }

  let status: EscrowStatus = existing.status;
  if (ev.action === "cancel") {
    status = "refunded";
  } else {
    // release: (recipient, amount_out, fee) -> settled += out + fee; refund: (sender, amount)
    const delta = ev.action === "release" ? big(ev.args[1]) + big(ev.args[2]) : big(ev.args[1]);
    const settled = BigInt((await repos.meta.get(settledKey)) ?? "0") + delta;
    await repos.meta.set(settledKey, settled.toString());
    if (settled >= BigInt(existing.amount)) status = ev.action === "release" ? "released" : "refunded";
  }
  await repos.escrows.update(ev.escrowId, {
    status,
    ...(ev.action === "release" ? { releaseTxHash: ev.txHash } : {}),
  });
  return true;
}

export async function syncEscrowEvents(
  deps: { rpc: EventSource; repos: DataRepositories; contractId: string; startLedger?: number },
  now: () => Date = () => new Date()
): Promise<SyncResult> {
  const { rpc, repos, contractId } = deps;
  let cursor = (await repos.meta.get(CURSOR_KEY)) ?? undefined;
  let processed = 0;
  let skipped = 0;
  let lastLedger = Number((await repos.meta.get(LEDGER_KEY)) ?? "") || null;

  const filters = [{ type: "contract" as const, contractIds: [contractId] }];
  let startLedger: number | undefined;
  if (!cursor) {
    startLedger = deps.startLedger ?? Math.max(1, (await rpc.getLatestLedger()).sequence - LOOKBACK_LEDGERS);
  }

  for (let page = 0; page < MAX_PAGES_PER_RUN; page++) {
    const res = await rpc.getEvents(
      cursor ? { cursor, filters, limit: PAGE_LIMIT } : { startLedger, filters, limit: PAGE_LIMIT }
    );
    for (const raw of res.events) {
      const decoded = decodeEscrowEvent(raw);
      if (decoded && (await apply(decoded, repos, contractId))) processed++;
      else skipped++;
      cursor = raw.id;
      lastLedger = raw.ledger;
    }
    if (cursor) await repos.meta.set(CURSOR_KEY, cursor);
    if (lastLedger !== null) await repos.meta.set(LEDGER_KEY, String(lastLedger));
    if (res.events.length < PAGE_LIMIT) break;
  }

  await repos.meta.set(RUN_KEY, now().toISOString());
  return { processed, skipped, lastLedger, configured: true };
}

export async function getIndexerStatus(repos: DataRepositories) {
  const contractId = process.env.ESCROW_CONTRACT_ID || null;
  return {
    configured: Boolean(contractId),
    contractId,
    lastProcessedLedger: Number((await repos.meta.get(LEDGER_KEY)) ?? "") || null,
    lastRunAt: await repos.meta.get(RUN_KEY),
  };
}
