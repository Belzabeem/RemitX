import { api } from "./client-api";

interface Discovery {
  best: { sendAmount: string } | null;
}

const trim = (n: number) => n.toFixed(7).replace(/\.?0+$/, "");
const memo = new Map<string, string>();

/**
 * Horizon found no path. Work out why, so the person gets something they can act on:
 * either the amount is bigger than the market can fill, or nobody is trading the pair.
 * Smaller amounts are tried to find roughly how much can be sent right now.
 */
export async function explainNoRoute(from: string, to: string, amount: string): Promise<string> {
  const key = `${from}:${to}:${amount}`;
  const known = memo.get(key);
  if (known) return known;

  const n = parseFloat(amount);
  let message = "";
  if (Number.isFinite(n) && n > 0) {
    const tries = [0.1, 0.01, 0.001].map((f) => n * f).filter((v) => v >= 0.0000001);
    const results = await Promise.all(
      tries.map(async (v) => {
        const res = await api<Discovery>(`/api/stellar/routes?from=${from}&to=${to}&amount=${trim(v)}`);
        return res.ok && res.data.best ? v : null;
      })
    );
    const fills = results.find((v) => v !== null);
    if (fills != null) {
      message = `The market for ${from} to ${to} is too thin for this amount. About ${trim(fills)} ${from} can be sent right now, so try that or less.`;
    }
  }
  if (!message) {
    message =
      `Nobody is trading ${from} for ${to} on this network right now, so there is nothing to route through. ` +
      `This is a gap in the test network's markets, not a problem with your account. ` +
      `Try the reverse direction or another pair, or send ${to === "XLM" || from === "XLM" ? "XLM" : "an asset"} that has an active market.`;
  }
  memo.set(key, message);
  return message;
}
