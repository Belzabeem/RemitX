/**
 * Public, verifiable transfer receipts. Anyone can paste a transaction hash and get
 * the facts straight from Horizon (not from RemitX's own records), plus an explorer link.
 */
import { TtlCache, withTimeout } from "./http";

export const HASH_RE = /^[a-f0-9]{64}$/i;

export interface HorizonLike {
  transactions(): { transaction(hash: string): { call(): Promise<Record<string, unknown>> } };
  operations(): { forTransaction(hash: string): { call(): Promise<{ records: Array<Record<string, unknown>> }> } };
}

export interface Receipt {
  hash: string;
  successful: boolean;
  ledger: number;
  createdAt: string;
  sourceAccount: string;
  feeChargedStroops: string;
  memo: string | null;
  operations: Array<{
    type: string;
    from?: string;
    to?: string;
    sendAsset?: string;
    sendAmount?: string;
    receiveAsset?: string;
    receiveAmount?: string;
  }>;
  explorerUrl: string;
}

export class ReceiptNotFoundError extends Error {}

const cache = new TtlCache<Receipt>(30_000);
export const clearReceiptCache = () => cache.clear();

const asset = (type: unknown, code: unknown) => (type === "native" ? "XLM" : String(code ?? "?"));

export async function getReceipt(hash: string, horizon: HorizonLike, explorerBase: string): Promise<Receipt> {
  if (!HASH_RE.test(hash)) throw new ReceiptNotFoundError("Invalid transaction hash");
  const key = hash.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;

  let tx: Record<string, unknown>;
  let ops: Array<Record<string, unknown>>;
  try {
    [tx, { records: ops }] = await withTimeout(
      Promise.all([
        horizon.transactions().transaction(key).call(),
        horizon.operations().forTransaction(key).call(),
      ]),
      8000,
      "Horizon receipt lookup"
    );
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) {
      throw new ReceiptNotFoundError("Transaction not found on this network");
    }
    throw err;
  }

  const receipt: Receipt = {
    hash: key,
    successful: tx.successful === true,
    ledger: Number(tx.ledger),
    createdAt: String(tx.created_at),
    sourceAccount: String(tx.source_account),
    feeChargedStroops: String(tx.fee_charged),
    memo: tx.memo ? String(tx.memo) : null,
    operations: ops.map((o) => ({
      type: String(o.type),
      from: o.from ? String(o.from) : o.source_account ? String(o.source_account) : undefined,
      to: o.to ? String(o.to) : undefined,
      sendAsset: o.source_asset_type ? asset(o.source_asset_type, o.source_asset_code) : undefined,
      sendAmount: o.source_amount ? String(o.source_amount) : undefined,
      receiveAsset: o.asset_type ? asset(o.asset_type, o.asset_code) : undefined,
      receiveAmount: o.amount ? String(o.amount) : undefined,
    })),
    explorerUrl: `${explorerBase}/tx/${key}`,
  };
  cache.set(key, receipt);
  return receipt;
}
