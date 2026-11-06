/** Small helpers so every outbound call has a hard timeout. */
export class TimeoutError extends Error {}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function fetchJson<T>(
  url: string,
  { timeoutMs = 5000, headers }: { timeoutMs?: number; headers?: Record<string, string> } = {}
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers, cache: "no-store" });
    if (!res.ok) throw new Error(`${url} responded ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Tiny TTL cache for server-side lookups. */
export class TtlCache<V> {
  private store = new Map<string, { value: V; expires: number }>();
  constructor(private ttlMs: number, private max = 500) {}
  get(key: string): V | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }
  set(key: string, value: V): void {
    if (this.store.size >= this.max) this.store.delete(this.store.keys().next().value as string);
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }
  clear(): void {
    this.store.clear();
  }
}
