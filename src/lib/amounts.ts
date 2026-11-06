/**
 * Exact decimal math for Stellar amounts (7 decimal places) using BigInt.
 * Money never goes through floating point.
 */
const SCALE = 7;
const ONE = BigInt(10) ** BigInt(SCALE);

export function toStroops(amount: string): bigint {
  if (!/^\d+(\.\d{1,7})?$/.test(amount)) throw new Error(`Invalid amount: ${amount}`);
  const [whole, frac = ""] = amount.split(".");
  return BigInt(whole) * ONE + BigInt(frac.padEnd(SCALE, "0"));
}

export function fromStroops(value: bigint): string {
  const negative = value < BigInt(0);
  const abs = negative ? -value : value;
  const whole = abs / ONE;
  const frac = (abs % ONE).toString().padStart(SCALE, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

/** Rate = destination / source, as a decimal string with `digits` places. */
export function ratio(destination: bigint, source: bigint, digits = 7): string {
  if (source === BigInt(0)) return "0";
  const scale = BigInt(10) ** BigInt(digits);
  const scaled = (destination * scale) / source;
  const whole = scaled / scale;
  const frac = (scaled % scale).toString().padStart(digits, "0");
  return `${whole}.${frac}`;
}

/** amount * (10000 - bps) / 10000, rounded down. */
export function applySlippageBps(amount: bigint, bps: number): bigint {
  return (amount * BigInt(10_000 - bps)) / BigInt(10_000);
}
