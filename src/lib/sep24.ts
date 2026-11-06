/**
 * SEP-24 anchor discovery: resolve the anchor's stellar.toml, find its
 * TRANSFER_SERVER_SEP0024, then read GET {server}/info for the real fee and
 * limit schedule per asset. Fails soft: an unreachable anchor yields
 * { reachable: false, error } rather than an exception.
 */
import { StellarToml } from "@stellar/stellar-sdk";
import { fetchJson, TtlCache } from "./http";

export interface Sep24AssetInfo {
  enabled: boolean;
  feeFixed?: number;
  feePercent?: number;
  minAmount?: number;
  maxAmount?: number;
}

export interface AnchorLiveInfo {
  reachable: boolean;
  homeDomain: string;
  transferServer?: string;
  deposit?: Record<string, Sep24AssetInfo>;
  withdraw?: Record<string, Sep24AssetInfo>;
  error?: string;
  fetchedAt: string;
}

export interface Sep24Deps {
  resolveToml: (domain: string) => Promise<{ TRANSFER_SERVER_SEP0024?: string }>;
  getJson: <T>(url: string) => Promise<T>;
}

const defaultDeps: Sep24Deps = {
  resolveToml: (domain) => StellarToml.Resolver.resolve(domain, { timeout: 5000 }),
  getJson: (url) => fetchJson(url, { timeoutMs: 5000 }),
};

const okCache = new TtlCache<AnchorLiveInfo>(10 * 60_000);
const failCache = new TtlCache<AnchorLiveInfo>(60_000);
export const clearAnchorCache = () => {
  okCache.clear();
  failCache.clear();
};

/** A remote stellar.toml must not be able to point us at internal services. */
export function isSafePublicHttpsUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return false;
    }
  }
  return !host.includes(":") && host.includes(".");
}

interface RawInfoEntry {
  enabled?: boolean;
  fee_fixed?: number;
  fee_percent?: number;
  min_amount?: number;
  max_amount?: number;
}

function normalise(raw: Record<string, RawInfoEntry> | undefined): Record<string, Sep24AssetInfo> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  return Object.fromEntries(
    Object.entries(raw).map(([code, v]) => [
      code,
      {
        enabled: v.enabled === true,
        feeFixed: v.fee_fixed,
        feePercent: v.fee_percent,
        minAmount: v.min_amount,
        maxAmount: v.max_amount,
      },
    ])
  );
}

export async function getAnchorInfo(homeDomain: string, deps: Sep24Deps = defaultDeps): Promise<AnchorLiveInfo> {
  const hit = okCache.get(homeDomain) ?? failCache.get(homeDomain);
  if (hit) return hit;

  const fail = (error: string): AnchorLiveInfo => {
    const result = { reachable: false, homeDomain, error, fetchedAt: new Date().toISOString() };
    failCache.set(homeDomain, result);
    return result;
  };

  try {
    const toml = await deps.resolveToml(homeDomain);
    const server = toml.TRANSFER_SERVER_SEP0024?.replace(/\/+$/, "");
    if (!server) return fail("Anchor does not advertise SEP-24 (no TRANSFER_SERVER_SEP0024 in stellar.toml)");
    if (!isSafePublicHttpsUrl(server)) return fail("Anchor transfer server URL was rejected as unsafe");

    const info = await deps.getJson<{
      deposit?: Record<string, RawInfoEntry>;
      withdraw?: Record<string, RawInfoEntry>;
    }>(`${server}/info`);

    const result: AnchorLiveInfo = {
      reachable: true,
      homeDomain,
      transferServer: server,
      deposit: normalise(info.deposit),
      withdraw: normalise(info.withdraw),
      fetchedAt: new Date().toISOString(),
    };
    okCache.set(homeDomain, result);
    return result;
  } catch (err) {
    return fail(err instanceof Error ? `Anchor unreachable: ${err.message}` : "Anchor unreachable");
  }
}
