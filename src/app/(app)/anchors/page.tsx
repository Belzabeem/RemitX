"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Notice from "@/components/ui/Notice";
import { Ledger, LedgerRow } from "@/components/ui/Ledger";
import { api } from "@/lib/client-api";
import { csvCell, formatAmount, sanitizeDecimal } from "@/lib/format";

interface AnchorRow {
  id: string;
  name: string;
  domain: string;
  corridor: string;
  country: string;
  assetCode: string;
  feePercent: number;
  typicalSettlement: string;
  estimatedFee: number;
}

const ASSETS = ["USDC", "EURC", "XLM"];

interface AssetInfo {
  enabled: boolean;
  feeFixed?: number;
  feePercent?: number;
  minAmount?: number;
  maxAmount?: number;
}
interface LiveInfo {
  reachable: boolean;
  transferServer?: string;
  deposit?: Record<string, AssetInfo>;
  withdraw?: Record<string, AssetInfo>;
  error?: string;
}

function feeText(i: AssetInfo): string {
  if (!i.enabled) return "Not available";
  const parts = [i.feePercent !== undefined && `${i.feePercent}%`, i.feeFixed !== undefined && `${i.feeFixed} fixed`].filter(Boolean);
  return parts.length ? parts.join(" + ") : "Fee not published";
}

export default function AnchorsPage() {
  const [anchors, setAnchors] = useState<AnchorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("All");
  const [assetCode, setAssetCode] = useState("USDC");
  const [amount, setAmount] = useState("200");
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<Record<string, LiveInfo | "loading">>({});

  // Reads the schedule from the anchor's own SEP-24 server, so it can differ from the directory estimate.
  const checkLive = async (id: string) => {
    setLive((l) => ({ ...l, [id]: "loading" }));
    const res = await api<LiveInfo>(`/api/anchors/${id}/info`);
    setLive((l) => ({ ...l, [id]: res.ok ? res.data : { reachable: false, error: res.error } }));
  };

  const load = useCallback(async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setAnchors([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ assetCode, amount: String(value) });
      const res = await fetch(`/api/anchors?${params.toString()}`);
      const json = await res.json();
      if (res.ok) setAnchors(json.data.anchors);
      else setError(json.error || "Couldn't load anchors.");
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }, [assetCode, amount]);

  useEffect(() => {
    const id = setTimeout(() => void load(), 350);
    return () => clearTimeout(id);
  }, [load]);

  const countries = useMemo(() => ["All", ...Array.from(new Set(anchors.map((a) => a.country)))], [anchors]);
  const activeCountry = countries.includes(country) ? country : "All";
  const visible = activeCountry === "All" ? anchors : anchors.filter((a) => a.country === activeCountry);
  const maxFee = Math.max(...visible.map((a) => a.feePercent), 0.0001);
  const cheapest = visible.length > 0 ? Math.min(...visible.map((a) => a.feePercent)) : null;

  const exportCsv = () => {
    const header = "Name,Domain,Corridor,Asset,Fee %,Estimated fee,Settlement\n";
    const rows = visible
      .map((a) => [a.name, a.domain, a.corridor, a.assetCode, a.feePercent, a.estimatedFee, a.typicalSettlement].map(csvCell).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + rows], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "remitx-anchors.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rx-page">
      <PageHeader
        title="Anchors"
        description="Anchors turn Stellar assets into local money. This directory is curated by hand and sorted by fee, lowest first."
        actions={
          <button type="button" className="rx-btn rx-btn-secondary rx-btn-sm" onClick={exportCsv} disabled={visible.length === 0}>
            <Download size={15} aria-hidden="true" /> Export CSV
          </button>
        }
      />

      <div className="flex flex-wrap items-end gap-x-4 gap-y-5">
        <div className="w-[calc(50%-8px)] sm:w-[160px]">
          <label className="rx-label" htmlFor="anchor-amount">Amount to send</label>
          <input id="anchor-amount" className="rx-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(sanitizeDecimal(e.target.value, 2))} />
        </div>
        <div className="w-[calc(50%-8px)] sm:w-[130px]">
          <label className="rx-label" htmlFor="anchor-asset">Asset</label>
          <select id="anchor-asset" className="rx-select" value={assetCode} onChange={(e) => setAssetCode(e.target.value)}>
            {ASSETS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto">
          <span className="rx-label">Country</span>
          <div className="rx-seg" role="group" aria-label="Country">
            {countries.map((c) => (
              <button key={c} type="button" aria-pressed={activeCountry === c} onClick={() => setCountry(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-8">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}

      <section className="mt-8" aria-busy={loading} aria-label="Anchor fees">
        <div className="rx-tablewrap">
          <div className="rx-tablescroll">
            <table className="rx-table">
              <thead>
                <tr>
                  <th scope="col">Anchor</th>
                  <th scope="col" className="hidden sm:table-cell">Corridor</th>
                  <th scope="col" className="min-w-[160px]">Fee</th>
                  <th scope="col" className="num">On {amount || "0"} {assetCode}</th>
                  <th scope="col" className="hidden md:table-cell">Settles in</th>
                  <th scope="col" className="num">Live schedule</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [0, 1, 2].map((i) => (
                    <tr key={i}>
                      <td colSpan={6}><span className="rx-skel" style={{ height: 36 }} /></td>
                    </tr>
                  ))
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted">
                      {assetCode === "XLM" ? "No anchors in the directory list XLM." : "No anchors match these filters."}
                    </td>
                  </tr>
                ) : (
                  visible.map((a) => {
                    const l = live[a.id];
                    return (
                      <Fragment key={a.id}>
                        <tr>
                          <td>
                            <span className="block font-medium">{a.name}</span>
                            <span className="rx-small block">{a.domain}</span>
                          </td>
                          <td className="hidden sm:table-cell">
                            <span className="block">{a.corridor}</span>
                          </td>
                          <td>
                            <div className="flex items-center gap-3">
                              <span className="w-[44px] flex-none font-medium">{a.feePercent}%</span>
                              <span className="h-[6px] w-[72px] flex-none overflow-hidden rounded-full bg-line" aria-hidden="true">
                                <span
                                  className="block h-full rounded-full bg-ink"
                                  style={{ width: `${Math.max((a.feePercent / maxFee) * 100, 6)}%`, opacity: a.feePercent === cheapest ? 1 : 0.35 }}
                                />
                              </span>
                            </div>
                          </td>
                          <td className="num whitespace-nowrap">
                            {formatAmount(a.estimatedFee, a.assetCode)} {a.assetCode}
                          </td>
                          <td className="hidden whitespace-nowrap md:table-cell">{a.typicalSettlement}</td>
                          <td className="num">
                            <button type="button" className="rx-btn rx-btn-secondary rx-btn-sm" disabled={l === "loading"} onClick={() => void checkLive(a.id)}>
                              {l === "loading" ? "Checking…" : l ? "Check again" : "Check live"}
                            </button>
                          </td>
                        </tr>
                        {l && l !== "loading" && (
                          <tr>
                            <td colSpan={6} className="bg-paper">
                              {l.reachable ? (
                                <div className="grid gap-x-12 gap-y-4 py-1 sm:grid-cols-2">
                                  {(["deposit", "withdraw"] as const).map((kind) => (
                                    <div key={kind}>
                                      <h3 className="rx-h2">{kind === "deposit" ? "Deposit (cash in)" : "Withdraw (cash out)"}</h3>
                                      {l[kind] && Object.keys(l[kind] ?? {}).length > 0 ? (
                                        <Ledger>
                                          {Object.entries(l[kind] ?? {}).map(([code, info]) => (
                                            <LedgerRow key={code} label={code}>{feeText(info)}</LedgerRow>
                                          ))}
                                        </Ledger>
                                      ) : (
                                        <p className="rx-small mt-1">Not listed</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="rx-small py-1">
                                  Couldn&apos;t read this anchor{l.error ? `: ${l.error}` : "."} The estimate above is still RemitX&apos;s own figure.
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="rx-tablefoot">
            {visible.length} anchor{visible.length === 1 ? "" : "s"}. Fees come from each anchor&apos;s published schedule and are checked by hand before listing. Check live reads the schedule from the anchor&apos;s own SEP-24 server.
          </p>
        </div>
      </section>
    </div>
  );
}
