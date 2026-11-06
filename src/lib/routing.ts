import type { Asset } from "@stellar/stellar-sdk";
import { fromStroops, ratio, toStroops } from "./amounts";
import { TtlCache, withTimeout } from "./http";

export const HORIZON_TIMEOUT_MS = 8000;
const ROUTE_CACHE_TTL_MS = 15_000;

/** The slice of Horizon.Server we use; narrow so tests can supply a fake. */
export interface PathFinder {
  strictSendPaths(
    source: Asset,
    amount: string,
    destinations: Asset[]
  ): { call(): Promise<{ records: HorizonPathRecord[] }> };
  feeStats?(): Promise<{ max_fee?: { p70?: string } }>;
}

export interface HorizonPathRecord {
  source_amount: string;
  destination_amount: string;
  path: Array<{ asset_type: string; asset_code?: string; asset_issuer?: string }>;
}

export interface RouteQuote {
  /** Asset codes traversed, source first, destination last. */
  hops: string[];
  sendAmount: string;
  receiveAmount: string;
  /** Destination units per source unit, from the on-chain order books/pools. */
  effectiveRate: string;
  /** Raw Horizon path, needed to build the transaction. */
  pathAssets: HorizonPathRecord["path"];
}

export interface CostBreakdown {
  sendAmount: string;
  receiveAmount: string;
  effectiveRate: string;
  /** Stellar network fee for the single path-payment operation. */
  networkFeeStroops: number;
  /** RemitX charges no platform fee on direct path payments. */
  platformFee: "0";
  /** Stellar closes a ledger roughly every 5 seconds; this is protocol timing, not a guarantee. */
  estimatedArrival: string;
}

export interface RouteDiscovery {
  from: string;
  to: string;
  best: (RouteQuote & { cost: CostBreakdown }) | null;
  alternatives: RouteQuote[];
  source: "horizon" | "cache";
  fetchedAt: string;
}

const cache = new TtlCache<RouteDiscovery>(ROUTE_CACHE_TTL_MS);
export const clearRouteCache = () => cache.clear();

const BASE_FEE_STROOPS = 100;

function describe(code: string | undefined, type: string): string {
  return type === "native" ? "XLM" : code || "?";
}

export async function discoverRoutes(
  params: { from: string; to: string; amount: string; sourceAsset: Asset; destAsset: Asset },
  horizon: PathFinder
): Promise<RouteDiscovery> {
  const key = `${params.from}:${params.to}:${params.amount}`;
  const cached = cache.get(key);
  if (cached) return { ...cached, source: "cache" };

  const sendStroops = toStroops(params.amount);
  // Same asset on both sides is a direct payment: no path finding, 1:1, no hops.
  const sameAsset = params.sourceAsset.equals(params.destAsset);
  const { records } = sameAsset
    ? { records: [{ source_amount: params.amount, destination_amount: params.amount, path: [] } as HorizonPathRecord] }
    : await withTimeout(
        horizon.strictSendPaths(params.sourceAsset, params.amount, [params.destAsset]).call(),
        HORIZON_TIMEOUT_MS,
        "Horizon path finding"
      );

  let networkFeeStroops = BASE_FEE_STROOPS;
  if (horizon.feeStats) {
    try {
      const stats = await withTimeout(horizon.feeStats(), 3000, "Horizon fee stats");
      const p70 = Number(stats.max_fee?.p70);
      if (Number.isFinite(p70) && p70 >= BASE_FEE_STROOPS) networkFeeStroops = p70;
    } catch {
      // fee stats are advisory; fall back to the protocol base fee
    }
  }

  const quotes: RouteQuote[] = records
    .map((r) => {
      const receive = toStroops(r.destination_amount);
      return {
        receive,
        quote: {
          hops: sameAsset
            ? [params.from]
            : [params.from, ...r.path.map((p) => describe(p.asset_code, p.asset_type)), params.to],
          sendAmount: params.amount,
          receiveAmount: fromStroops(receive),
          effectiveRate: ratio(receive, sendStroops),
          pathAssets: r.path,
        } satisfies RouteQuote,
      };
    })
    // Best route = most destination asset for the same amount sent (this already
    // includes spread and pool fees; the network fee is identical for all routes).
    .sort((a, b) => (a.receive === b.receive ? a.quote.hops.length - b.quote.hops.length : a.receive > b.receive ? -1 : 1))
    .map((x) => x.quote);

  const best = quotes[0]
    ? {
        ...quotes[0],
        cost: {
          sendAmount: quotes[0].sendAmount,
          receiveAmount: quotes[0].receiveAmount,
          effectiveRate: quotes[0].effectiveRate,
          networkFeeStroops,
          platformFee: "0" as const,
          estimatedArrival: "About 5 seconds (one Stellar ledger close)",
        },
      }
    : null;

  const result: RouteDiscovery = {
    from: params.from,
    to: params.to,
    best,
    alternatives: quotes.slice(1, 5),
    source: "horizon",
    fetchedAt: new Date().toISOString(),
  };
  cache.set(key, result);
  return result;
}
