"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Notice from "@/components/ui/Notice";
import RouteCost, { type RouteCostData } from "@/components/ui/RouteCost";
import { api } from "@/lib/client-api";
import { explainNoRoute } from "@/lib/route-diagnosis";
import { useAssets } from "@/lib/use-assets";
import { formatAmount, formatRate, formatTime, sanitizeDecimal } from "@/lib/format";

interface Route {
  sourceAmount: string;
  destinationAmount: string;
  path: string[];
}

interface Quote {
  hops: string[];
  sendAmount: string;
  receiveAmount: string;
}
interface Discovery {
  from: string;
  to: string;
  best: (Quote & { cost: RouteCostData }) | null;
  alternatives: Quote[];
  source: "horizon" | "cache";
}

export default function RoutesPage() {
  const ASSETS = useAssets();
  // The person's pick, falling back to a default that exists on this deployment.
  const [pick, setPick] = useState<{ from?: string; to?: string }>({});
  const fromAsset = pick.from && ASSETS.includes(pick.from) ? pick.from : ASSETS.includes("USDC") ? "USDC" : "XLM";
  const toAsset = pick.to && ASSETS.includes(pick.to) ? pick.to : "XLM";
  const setFromAsset = (from: string) => setPick((p) => ({ ...p, from }));
  const setToAsset = (to: string) => setPick((p) => ({ ...p, to }));
  const [amount, setAmount] = useState("1000");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [bestCost, setBestCost] = useState<RouteCostData | null>(null);
  const [bestHops, setBestHops] = useState<string[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchedAt, setSearchedAt] = useState<Date | null>(null);

  const search = useCallback(async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setRoutes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await api<Discovery>(`/api/stellar/routes?from=${fromAsset}&to=${toAsset}&amount=${value}`);
    if (res.ok && res.data.best) {
      const { best, alternatives, source } = res.data;
      // A direct payment has a single asset in its path; show it as source then destination.
      const asPath = (hops: string[]) => (hops.length < 2 ? [fromAsset, toAsset] : hops);
      const all = [best, ...alternatives].map((q) => ({
        sourceAmount: q.sendAmount,
        destinationAmount: q.receiveAmount,
        path: asPath(q.hops),
      }));
      setRoutes(all.sort((a, b) => parseFloat(b.destinationAmount) - parseFloat(a.destinationAmount)));
      setBestCost(best.cost);
      setBestHops(best.hops);
      setFromCache(source === "cache");
      setSearchedAt(new Date());
    } else {
      setRoutes([]);
      setBestCost(null);
      setError(res.ok ? await explainNoRoute(fromAsset, toAsset, String(value)) : res.error);
    }
    setLoading(false);
  }, [fromAsset, toAsset, amount]);

  // Search as the inputs settle rather than on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => void search(), 450);
    return () => clearTimeout(id);
  }, [search]);

  const swap = () => {
    setFromAsset(toAsset);
    setToAsset(fromAsset);
  };

  const best = routes[0] ? parseFloat(routes[0].destinationAmount) : 0;

  return (
    <div className="rx-page">
      <PageHeader
        title="Routes"
        description="Every path Stellar can take for this payment right now, ranked by how much the recipient ends up with."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-[180px]">
          <label className="rx-label" htmlFor="routes-amount">You send</label>
          <input
            id="routes-amount"
            className="rx-input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(sanitizeDecimal(e.target.value))}
          />
        </div>
        <div className="flex w-full items-end gap-2 sm:w-auto">
          <div className="flex-1 sm:w-[130px] sm:flex-none">
            <label className="rx-label" htmlFor="routes-from">From</label>
            <select id="routes-from" className="rx-select" value={fromAsset} onChange={(e) => setFromAsset(e.target.value)}>
              {ASSETS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <button type="button" className="rx-iconbtn mb-[5px] shrink-0" onClick={swap} aria-label="Swap assets" title="Swap assets">
            <ArrowLeftRight size={16} />
          </button>
          <div className="flex-1 sm:w-[130px] sm:flex-none">
            <label className="rx-label" htmlFor="routes-to">To</label>
            <select id="routes-to" className="rx-select" value={toAsset} onChange={(e) => setToAsset(e.target.value)}>
              {ASSETS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-8">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}

      <section className="rx-section" aria-label="Routes found" aria-busy={loading}>
        <div className="rx-sectionhead">
          <h2 className="rx-h2">{loading ? "Searching…" : routes.length > 0 ? `${routes.length} route${routes.length === 1 ? "" : "s"} found` : "Routes"}</h2>
          {searchedAt && !loading && routes.length > 0 && <span className="rx-small">Searched at {formatTime(searchedAt)}</span>}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="rx-skel" style={{ height: 76 }} />
            ))}
          </div>
        ) : routes.length === 0 ? (
          !error && (
            <p className="max-w-[52ch] text-[15px] leading-6 text-muted">
              No route found for {fromAsset} to {toAsset} at {amount || "this amount"}. Try a smaller amount or a different pair.
            </p>
          )
        ) : (
          <ol className="rx-tablewrap">
            {routes.map((route, i) => {
              const out = parseFloat(route.destinationAmount);
              const gap = best > 0 ? ((out - best) / best) * 100 : 0;
              const hops = route.path.length - 2;
              const effective = out / parseFloat(route.sourceAmount);
              return (
                <li
                  key={`${route.path.join("-")}-${i}`}
                  className="grid grid-cols-[minmax(0,1fr)] items-center gap-x-8 gap-y-3 border-t border-line px-5 py-5 first:border-t-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_150px]"
                >
                  <div className="min-w-0">
                    <div className="rx-path" aria-label={`Path: ${route.path.join(", then ")}`}>
                      {route.path.map((p, pi) => (
                        <Fragment key={`${p}-${pi}`}>
                          <span className="rx-path-node">{p}</span>
                          {pi < route.path.length - 1 && <span className="rx-path-link" aria-hidden="true" />}
                        </Fragment>
                      ))}
                    </div>
                    <p className="rx-small mt-2">{hops <= 0 ? "Direct" : `${hops} ${hops === 1 ? "hop" : "hops"}`}</p>
                  </div>
                  <div>
                    <p className="text-[18px] font-medium tracking-[-0.02em]">
                      {formatAmount(route.destinationAmount, toAsset)} <span className="text-[14px] font-normal text-muted">{toAsset}</span>
                    </p>
                    <p className="rx-small mt-0.5">
                      1 {fromAsset} = {formatRate(effective)} {toAsset}
                    </p>
                  </div>
                  <p className={`text-[14px] md:text-right ${i === 0 ? "font-medium text-positive" : "text-muted"}`}>
                    {i === 0 ? "Best rate" : `${gap.toFixed(2)}% vs best`}
                  </p>
                </li>
              );
            })}
          </ol>
        )}

        {!loading && routes.length > 0 && bestCost && (
          <div className="mt-10 max-w-[520px]">
            <h2 className="rx-h2 mb-2">Best route, in full</h2>
            <RouteCost from={fromAsset} to={toAsset} hops={bestHops} cost={bestCost} />
            <p className="rx-small mt-3">
              Quote read from Horizon{fromCache ? " (cached for up to 15 seconds)" : ""}. Prices move, so the final quote is taken again when you send.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
