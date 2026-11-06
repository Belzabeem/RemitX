/**
 * Display helpers shared by the app screens. Pure functions only, so they are
 * safe to import from both server and client components.
 */

export type TransactionStatus = "pending" | "validating" | "confirmed" | "failed";
export type EscrowStatus = "locked" | "released" | "refunded" | "expired";

export const STATUS_LABEL: Record<TransactionStatus | EscrowStatus, string> = {
  pending: "Pending",
  validating: "Validating",
  confirmed: "Confirmed",
  failed: "Failed",
  locked: "Locked",
  released: "Released",
  refunded: "Refunded",
  expired: "Expired",
};

const EMPTY = "\u2013";

/** XLM keeps four decimals, everything else two. */
export function decimalsFor(asset?: string): number {
  return asset === "XLM" ? 4 : 2;
}

export function formatAmount(value: string | number | null | undefined, asset?: string): string {
  if (value === null || value === undefined || value === "") return EMPTY;
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(n)) return EMPTY;
  const d = decimalsFor(asset);
  return new Intl.NumberFormat("en", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
}

export function formatMoney(value: string | number | null | undefined, asset: string): string {
  const amount = formatAmount(value, asset);
  return amount === EMPTY ? EMPTY : `${amount} ${asset}`;
}

/** Rates span 0.1042 (XLM/USD) to 1,495.00 (USD/NGN); keep enough precision for both. */
export function formatRate(rate: string | number | null | undefined): string {
  if (rate === null || rate === undefined || rate === "") return EMPTY;
  const n = typeof rate === "number" ? rate : parseFloat(rate);
  if (!Number.isFinite(n)) return EMPTY;
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 2 : abs >= 1 ? 4 : abs >= 0.01 ? 5 : 6;
  return new Intl.NumberFormat("en", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
}

export function truncateMiddle(value: string, head = 6, tail = 6): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}\u2026${value.slice(-tail)}`;
}

export function formatDateTime(iso: string | number | Date): string {
  return new Date(iso).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}

export function formatTime(iso: string | number | Date): string {
  return new Date(iso).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** "6d 4h", "3h 12m", "8m". Returns null once the time has passed. */
export function timeUntil(iso: string, now: number = Date.now()): string | null {
  const ms = new Date(iso).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const mins = Math.floor(ms / 60_000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const minutes = mins % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(minutes, 1)}m`;
}

/** Keep digits and a single dot, capped at Stellar's seven decimal places. */
export function sanitizeDecimal(input: string, maxDecimals = 7): string {
  const cleaned = input.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join("").slice(0, maxDecimals)}`;
}

/** The API only accepts `^\d+(\.\d+)?$`, so ".5" and "5." need tidying first. */
export function normalizeAmount(input: string): string {
  let v = input.trim();
  if (v.startsWith(".")) v = `0${v}`;
  if (v.endsWith(".")) v = v.slice(0, -1);
  return v;
}

/** CSV cells containing commas, quotes or newlines must be quoted. */
export function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
