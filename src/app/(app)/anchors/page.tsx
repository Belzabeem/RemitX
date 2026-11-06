"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Notice from "@/components/ui/Notice";
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
  fetchedAt: string;
}

function feeInfoText(i: AssetInfo): string {
  if (!i.enabled) return "Not available";
  const parts = [
    i.feePercent !== undefined && `${i.feePercent}%`,
    i.feeFixed !== undefined && `${i.feeFixed} fixed`,
  ].filter(Boolean);
  return parts.length ? parts.join(" + ") : "Fee not published";
}

const ASSETS = ["USDC", "EURC", "XLM"];

export default function AnchorsPage() {
  const [anchors, setAnchors] = useState<AnchorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("All");
  const [assetCode, setAssetCode] = useState("USDC");
  const [amount, setAmount] = useState("200");
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<Record<string, LiveInfo | "loading">>({});

  const checkLive = async (id: string) => {
    setLive((prev) => ({ ...prev, [id]: "loading" }));
    try {
      const res = await fetch(`/api/anchors/${encodeURIComponent(id)}/info`);
      const json = await res.json();
      if (res.ok && json.success) {
        setLive((prev) => ({ ...prev, [id]: json.data }));
      } else {
        setLive((prev) => ({
          ...prev,
          [id]: { reachable: false, error: json.error || "Failed to query anchor", fetchedAt: new Date().toISOString() },
        }));
      }
    } catch {
      setLive((prev) => ({
        ...prev,
        [id]: { reachable: false, error: "Network timeout", fetchedAt: new Date().toISOString() },
      }));
    }
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
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [0, 1, 2].map((i) => (
                    <tr key={i}>
                      <td colSpan={5}><span className="rx-skel" style={{ height: 36 }} /></td>
                    </tr>
                  ))
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-muted">
                      {assetCode === "XLM" ? "No anchors in the directory list XLM." : "No anchors match these filters."}
                    </td>
                  </tr>
                ) : (
                  visible.map((a) => {
                    const l = live[a.id];
                    return (
                    <tr key={a.id}>
                      <td>
                        <span className="block font-medium">{a.name}</span>
                        <span className="rx-small block">{a.domain}</span>
                        <button
                          type="button"
                          className="rx-link mt-1 text-[12px]"
                          disabled={l === "loading"}
                          onClick={() => checkLive(a.id)}
                        >
                          {l === "loading"
                            ? "Checking live…"
                            : l
                              ? "Re-check live"
                              : "Check live SEP-24"}
                        </button>
                        {l && l !== "loading" && (
                          <div className="mt-2 rounded-[6px] border border-line bg-paper p-2 text-[12px]">
                            {l.reachable ? (
                              <div className="space-y-1">
                                <p className="font-medium text-ink">Live SEP-24 fee:</p>
                                {l.deposit?.[a.assetCode] && (
                                  <p className="text-muted">
                                    Deposit: {feeInfoText(l.deposit[a.assetCode])}
                                  </p>
                                )}
                                {l.withdraw?.[a.assetCode] && (
                                  <p className="text-muted">
                                    Withdraw: {feeInfoText(l.withdraw[a.assetCode])}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-muted">
                                Unreachable: {l.error || "SEP-24 server unavailable"}
                              </p>
                            )}
                          </div>
                        )}
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
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="rx-tablefoot">
            {visible.length} anchor{visible.length === 1 ? "" : "s"}. Fees come from each anchor&apos;s published schedule and are checked by hand before listing.
          </p>
        </div>
      </section>
    </div>
  );
}
