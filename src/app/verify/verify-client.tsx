"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Receipt from "@/components/Receipt";
import { Notice } from "@/components/ui";
import { api, formatAmount, formatDate, shortAddress } from "@/lib/client-api";

interface ReceiptData {
  hash: string; successful: boolean; ledger: number; createdAt: string; sourceAccount: string; feeChargedStroops: string; memo: string | null; explorerUrl: string;
  operations: Array<{ type: string; from?: string; to?: string; sendAsset?: string; sendAmount?: string; receiveAsset?: string; receiveAmount?: string }>;
}

function Inner() {
  const initial = useSearchParams().get("hash") ?? "";
  const [hash, setHash] = useState(initial);
  const [result, setResult] = useState<ReceiptData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function check(value: string) {
    setBusy(true);
    setError("");
    setResult(null);
    const res = await api<ReceiptData>(`/api/verify/${encodeURIComponent(value.trim())}`);
    setBusy(false);
    if (res.ok) setResult(res.data); else setError(res.error);
  }

  useEffect(() => {
    // Auto-verify a hash passed in the link.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initial) void check(initial);
  }, [initial]);

  const op = result?.operations.find((o) => o.type.startsWith("path_payment") || o.type === "payment") ?? result?.operations[0];

  return (
    <>
      <form className="mt-8 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void check(hash); }}>
        <div className="flex-1">
          <label className="label" htmlFor="hash">Transaction hash</label>
          <input id="hash" className="field mono" value={hash} onChange={(e) => setHash(e.target.value)} placeholder="64 hexadecimal characters" spellCheck={false} autoComplete="off" required />
        </div>
        <button className="btn btn-primary self-end" disabled={busy}>{busy ? "Checking…" : "Verify"}</button>
      </form>

      <div className="mt-8" aria-live="polite">
        {error && <Notice tone="danger">{error}</Notice>}
        {result && (
          <div className="max-w-md">
            <div className="mb-4">
              <span className={`pill ${result.successful ? "pill-settled" : "pill-failed"}`}>{result.successful ? "Succeeded on the network" : "Failed on the network"}</span>
            </div>
            <Receipt
              lines={[
                { label: "From", value: <span className="mono">{shortAddress(op?.from ?? result.sourceAccount, 6, 6)}</span> },
                ...(op?.to ? [{ label: "To", value: <span className="mono">{shortAddress(op.to, 6, 6)}</span> }] : []),
                ...(op?.sendAmount ? [{ label: "Sent", value: `${formatAmount(op.sendAmount, 7)} ${op.sendAsset}` }] : []),
                { label: "Ledger", value: result.ledger.toLocaleString("en-US") },
                { label: "Time", value: formatDate(result.createdAt) },
                { label: "Network fee", value: `${Number(result.feeChargedStroops) / 1e7} XLM` },
              ]}
              total={op?.receiveAmount ? { label: "Received", value: `${formatAmount(op.receiveAmount, 7)} ${op.receiveAsset}` } : undefined}
            />
            <a className="btn btn-outline mt-6" href={result.explorerUrl} target="_blank" rel="noreferrer">View on Stellar Expert</a>
          </div>
        )}
      </div>
    </>
  );
}

export default function VerifyClient() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
