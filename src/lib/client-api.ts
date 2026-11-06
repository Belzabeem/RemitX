/** Thin fetch wrapper for the app's own JSON API ({ success, data | error }). */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

export async function api<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return { ok: false, error: json?.error || `Request failed (${res.status})`, status: res.status };
    }
    return { ok: true, data: json.data as T };
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection.", status: 0 };
  }
}

export function shortAddress(address: string, lead = 5, tail = 4): string {
  return address.length > lead + tail + 1 ? `${address.slice(0, lead)}…${address.slice(-tail)}` : address;
}

/** Display formatting only. Money logic stays in string/BigInt on the server. */
export function formatAmount(value: string | null | undefined, maxFraction = 2): string {
  if (!value) return "–";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: maxFraction }).format(n);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export const EXPLORER = "https://stellar.expert/explorer/testnet";
