/**
 * Short-lived in-memory TTL cache for exchange rates.
 * Used by route discovery and UI quotes to avoid redundant external network lookups.
 */

export interface CachedRate {
  fromAsset: string;
  toAsset: string;
  rate: string;
  source: string;
  cachedAt: number;
  expiresAt: number;
}

export class RateTtlCache {
  private cache = new Map<string, CachedRate>();
  private defaultTtlMs: number;

  constructor(defaultTtlMs = 60_000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  private key(from: string, to: string): string {
    return `${from.trim().toUpperCase()}:${to.trim().toUpperCase()}`;
  }

  get(from: string, to: string): CachedRate | null {
    const k = this.key(from, to);
    const entry = this.cache.get(k);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(k);
      return null;
    }
    return entry;
  }

  set(
    from: string,
    to: string,
    rate: string,
    source = "live",
    ttlMs = this.defaultTtlMs
  ): CachedRate {
    const k = this.key(from, to);
    const now = Date.now();
    const entry: CachedRate = {
      fromAsset: from.trim().toUpperCase(),
      toAsset: to.trim().toUpperCase(),
      rate,
      source,
      cachedAt: now,
      expiresAt: now + ttlMs,
    };
    this.cache.set(k, entry);
    return entry;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const rateCache = new RateTtlCache(60_000);

