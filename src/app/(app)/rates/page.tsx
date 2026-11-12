"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Notice from "@/components/ui/Notice";
import { Ledger, LedgerRow } from "@/components/ui/Ledger";
import { formatAmount, formatRate, formatTime, sanitizeDecimal } from "@/lib/format";

interface RateData {
  rate: string;
  fromAsset: string;
  toAsset: string;
  fetchedAt: string;
  source: "cache" | "api" | "fallback";
}

interface Point {
  rate: number;
  at: number;
}

interface Watch {
  id: string;
  pair: string;
  direction: "above" | "below";
  threshold: number;
  triggeredAt?: number;
  triggeredRate?: number;
}

const PAIRS = ["USD/NGN", "USD/PHP", "USD/GBP", "GBP/NGN", "XLM/USDC", "USDC/NGN"];
const POLL_MS = 12_000;
const HISTORY_LIMIT = 40;
const WATCH_KEY = "remitx:rate-watches";

const split = (pair: string) => pair.split("/") as [string, string];

function Sparkline({ points }: { points: Point[] }) {
  if (points.length < 2) return <span className="text-faint">{"\u2013"}</span>;
  const values = points.map((p) => p.rate);
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i / (points.length - 1)) * 80},${18 - ((p.rate - min) / range) * 16 - 1}`)
    .join(" ");
  return (
    <svg width="80" height="18" viewBox="0 0 80 18" aria-hidden="true">
      <path d={d} fill="none" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Chart({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return (
      <div className="grid h-[220px] place-items-center text-center text-[14px] text-muted">
        <p className="max-w-[34ch]">The chart fills in as new rates arrive. Rates refresh every {POLL_MS / 1000} seconds.</p>
      </div>
    );
  }
  const values = points.map((p) => p.rate);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 800;
  const H = 220;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * W, H - 16 - ((p.rate - min) / range) * (H - 32)] as const);
  const line = xy.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[220px] w-full" role="img" aria-label="Rate observed since you opened this page">
      <line x1="0" x2={W} y1={H - 1} y2={H - 1} stroke="#e4e4df" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={`${line} L${W},${H} L0,${H} Z`} fill="rgba(17,17,17,0.05)" />
      <path d={line} fill="none" stroke="#111" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function RatesPage() {
  const [active, setActive] = useState("USD/NGN");
  const [rates, setRates] = useState<Record<string, RateData>>({});
  const [history, setHistory] = useState<Record<string, Point[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liquidity, setLiquidity] = useState<{ reserves: { asset: string; amount: string }[] } | null>(null);

  const [watches, setWatches] = useState<Watch[]>([]);
  const [fired, setFired] = useState<string[]>([]);
  const [wPair, setWPair] = useState("USD/NGN");
  const [wDirection, setWDirection] = useState<"above" | "below">("above");
  const [wThreshold, setWThreshold] = useState("");
  const watchesRef = useRef<Watch[]>([]);
  const watchesLoaded = useRef(false);

  // Saved watches live in this browser only.
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const raw = localStorage.getItem(WATCH_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Watch[];
          watchesRef.current = parsed;
          setWatches(parsed);
        }
      } catch {
        // Corrupt or blocked storage: start with none.
      }
      watchesLoaded.current = true;
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const saveWatches = (next: Watch[]) => {
    watchesRef.current = next;
    setWatches(next);
    try {
      localStorage.setItem(WATCH_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable: watches last for this visit only.
    }
  };

  const poll = useCallback(async () => {
    setRefreshing(true);
    const settled = await Promise.allSettled(
      PAIRS.map(async (pair) => {
        const [from, to] = split(pair);
        const res = await fetch(`/api/stellar/rate?from=${from}&to=${to}`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error("no rate");
        return [pair, json.data as RateData] as const;
      })
    );
    const next: Record<string, RateData> = {};
    for (const r of settled) if (r.status === "fulfilled") next[r.value[0]] = r.value[1];

    if (Object.keys(next).length === 0) {
      setError("Couldn't reach the rate service. Showing the last values we have, if any.");
    } else {
      setError(null);
      setRates((prev) => ({ ...prev, ...next }));
      const now = Date.now();
      setHistory((prev) => {
        const out = { ...prev };
        for (const [pair, data] of Object.entries(next)) {
          out[pair] = [...(out[pair] ?? []), { rate: parseFloat(data.rate), at: now }].slice(-HISTORY_LIMIT);
        }
        return out;
      });

      // Check saved watches against what just came in.
      const messages: string[] = [];
      const updated = watchesRef.current.map((w) => {
        const data = next[w.pair];
        if (!data || w.triggeredAt) return w;
        const current = parseFloat(data.rate);
        const hit = w.direction === "above" ? current >= w.threshold : current <= w.threshold;
        if (!hit) return w;
        messages.push(`${w.pair} is ${w.direction === "above" ? "above" : "below"} ${formatRate(w.threshold)} (now ${formatRate(current)}).`);
        return { ...w, triggeredAt: now, triggeredRate: current };
      });
      if (messages.length > 0) {
        if (watchesLoaded.current) saveWatches(updated);
        setFired((prev) => [...messages, ...prev]);
      }
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void poll(), 0);
    const repeat = setInterval(() => void poll(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(repeat);
    };
  }, [poll]);

  // Liquidity pool for the selected pair's base asset, when Stellar has one.
  useEffect(() => {
    const base = split(active)[0];
    if (!["XLM", "USDC", "EURC"].includes(base)) {
      const id = setTimeout(() => setLiquidity(null), 0);
      return () => clearTimeout(id);
    }
    let ignore = false;
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stellar/liquidity?asset=${base}`);
        const json = await res.json();
        if (!ignore) setLiquidity(res.ok ? json.data.pool : null);
      } catch {
        if (!ignore) setLiquidity(null);
      }
    }, 0);
    return () => {
      ignore = true;
      clearTimeout(id);
    };
  }, [active]);

  const current = rates[active];
  const points = useMemo(() => history[active] ?? [], [history, active]);
  const first = points[0]?.rate;
  const last = points[points.length - 1]?.rate;
  const change = first && last && points.length > 1 ? ((last - first) / first) * 100 : null;
  const low = points.length ? Math.min(...points.map((p) => p.rate)) : null;
  const high = points.length ? Math.max(...points.map((p) => p.rate)) : null;
  const [activeFrom, activeTo] = split(active);

  const addWatch = (e: React.FormEvent) => {
    e.preventDefault();
    const threshold = parseFloat(wThreshold);
    if (!threshold || threshold <= 0) return;
    saveWatches([
      ...watchesRef.current,
      { id: `${Date.now()}`, pair: wPair, direction: wDirection, threshold },
    ]);
    setWThreshold("");
  };

  return (
    <div className="rx-page">
      <PageHeader
        title="Rates"
        description="Live rates for the corridors RemitX supports, and the Stellar assets behind them."
        actions={
          <button type="button" className="rx-btn rx-btn-secondary rx-btn-sm" onClick={() => void poll()} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? "rx-spin" : ""} aria-hidden="true" /> Refresh
          </button>
        }
      />

      {error && (
        <div className="mb-8">
          <Notice tone="caution">{error}</Notice>
        </div>
      )}
      {fired.length > 0 && (
        <div className="mb-8 space-y-2">
          {fired.map((m, i) => (
            <Notice key={`${m}-${i}`} tone="positive" role="status">
              {m}
            </Notice>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14">
        {/* Watchlist */}
        <section aria-label="Pairs">
          <div className="rx-tablewrap">
            <div className="rx-tablescroll">
              <table className="rx-table">
                <thead>
                  <tr>
                    <th scope="col">Pair</th>
                    <th scope="col" className="num">Rate</th>
                    <th scope="col" className="num hidden sm:table-cell">Since opened</th>
                    <th scope="col" className="hidden sm:table-cell"><span className="sr-only">Trend</span></th>
                  </tr>
                </thead>
                <tbody>
                  {PAIRS.map((pair) => {
                    const data = rates[pair];
                    const pts = history[pair] ?? [];
                    const delta = pts.length > 1 ? ((pts[pts.length - 1].rate - pts[0].rate) / pts[0].rate) * 100 : null;
                    return (
                      <tr key={pair} data-active={pair === active}>
                        <td>
                          <button type="button" className="rx-rowlink rx-rowbutton" onClick={() => setActive(pair)} aria-pressed={pair === active}>
                            {pair}
                          </button>
                        </td>
                        <td className="num whitespace-nowrap">
                          {data ? formatRate(data.rate) : loading ? <span className="rx-skel ml-auto" style={{ width: 64, height: 14 }} /> : "\u2013"}
                        </td>
                        <td className="num hidden whitespace-nowrap text-muted sm:table-cell">
                          {delta === null ? "\u2013" : `${delta > 0 ? "+" : ""}${delta.toFixed(3)}%`}
                        </td>
                        <td className="hidden sm:table-cell">
                          <Sparkline points={pts} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Detail */}
        <section aria-label={`${active} detail`}>
          <p className="rx-small">{active}</p>
          <p className="rx-figure mt-1 text-[40px] md:text-[48px]">
            {current ? formatRate(current.rate) : <span className="rx-skel inline-block" style={{ width: 180, height: 44 }} />}
          </p>
          <p className="rx-small mt-2">
            {current ? `1 ${activeFrom} buys ${activeTo}. Updated ${formatTime(current.fetchedAt)}.` : "Waiting for the first rate."}
          </p>

          {current?.source === "fallback" && (
            <div className="mt-4">
              <Notice tone="caution">This is a built-in fallback value because live sources didn&apos;t respond. Don&apos;t rely on it for a transfer.</Notice>
            </div>
          )}

          <div className="mt-6">
            <Chart points={points} />
            <div className="mt-2 flex justify-between text-[13px] text-muted">
              <span>{points.length > 1 ? formatTime(points[0].at) : "Since you opened this page"}</span>
              <span>{points.length > 1 ? "Now" : ""}</span>
            </div>
          </div>

          {points.length > 1 && low !== null && high !== null && (
            <Ledger>
              <LedgerRow label="Change since opened">{change !== null ? `${change > 0 ? "+" : ""}${change.toFixed(3)}%` : "\u2013"}</LedgerRow>
              <LedgerRow label="Low">{formatRate(low)}</LedgerRow>
              <LedgerRow label="High">{formatRate(high)}</LedgerRow>
            </Ledger>
          )}

          {liquidity && liquidity.reserves.length > 1 && (
            <div className="mt-6">
              <h3 className="rx-h2">Stellar liquidity pool</h3>
              <Ledger>
                {liquidity.reserves.map((r) => {
                  const code = r.asset === "native" ? "XLM" : r.asset.split(":")[0];
                  return (
                    <LedgerRow key={r.asset} label={code}>
                      {formatAmount(r.amount, code).replace(/\.\d+$/, "")}
                    </LedgerRow>
                  );
                })}
              </Ledger>
            </div>
          )}
        </section>
      </div>

      {/* Watches */}
      <section className="rx-section" aria-labelledby="watch-heading">
        <div className="rx-sectionhead">
          <h2 id="watch-heading" className="rx-h2">Rate watches</h2>
        </div>
        <p className="mb-5 max-w-[60ch] text-[14.5px] leading-[22px] text-muted">
          Get a notice here when a pair crosses a level. Watches are saved in this browser and checked while this page is open.
        </p>

        <form onSubmit={addWatch} className="flex flex-wrap items-end gap-3">
          <div className="w-[calc(50%-6px)] sm:w-[150px]">
            <label className="rx-label" htmlFor="watch-pair">Pair</label>
            <select id="watch-pair" className="rx-select" value={wPair} onChange={(e) => setWPair(e.target.value)}>
              {PAIRS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="w-[calc(50%-6px)] sm:w-[160px]">
            <label className="rx-label" htmlFor="watch-direction">When it</label>
            <select id="watch-direction" className="rx-select" value={wDirection} onChange={(e) => setWDirection(e.target.value as "above" | "below")}>
              <option value="above">Rises above</option>
              <option value="below">Falls below</option>
            </select>
          </div>
          <div className="w-[calc(50%-6px)] sm:w-[160px]">
            <label className="rx-label" htmlFor="watch-threshold">Level</label>
            <input
              id="watch-threshold"
              className="rx-input"
              inputMode="decimal"
              placeholder={rates[wPair] ? formatRate(rates[wPair].rate) : "0.00"}
              value={wThreshold}
              onChange={(e) => setWThreshold(sanitizeDecimal(e.target.value, 6))}
            />
          </div>
          <button type="submit" className="rx-btn rx-btn-primary" disabled={!parseFloat(wThreshold)}>
            Add watch
          </button>
        </form>

        {watches.length > 0 && (
          <div className="rx-tablewrap mt-6">
            <div className="rx-tablescroll">
              <table className="rx-table">
                <thead>
                  <tr>
                    <th scope="col">Pair</th>
                    <th scope="col">Condition</th>
                    <th scope="col" className="num">Level</th>
                    <th scope="col" className="num hidden sm:table-cell">Now</th>
                    <th scope="col">Status</th>
                    <th scope="col"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody>
                  {watches.map((w) => {
                    const now = rates[w.pair];
                    return (
                      <tr key={w.id}>
                        <td className="font-medium">{w.pair}</td>
                        <td>{w.direction === "above" ? "Rises above" : "Falls below"}</td>
                        <td className="num">{formatRate(w.threshold)}</td>
                        <td className="num hidden text-muted sm:table-cell">{now ? formatRate(now.rate) : "\u2013"}</td>
                        <td>
                          <span className="rx-status" data-state={w.triggeredAt ? "confirmed" : "pending"}>
                            {w.triggeredAt ? `Reached at ${formatTime(w.triggeredAt)}` : "Watching"}
                          </span>
                        </td>
                        <td className="num">
                          <button
                            type="button"
                            className="rx-iconbtn"
                            aria-label={`Remove ${w.pair} watch`}
                            onClick={() => saveWatches(watchesRef.current.filter((x) => x.id !== w.id))}
                          >
                            <X size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
