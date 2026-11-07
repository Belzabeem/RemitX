"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import Notice from "@/components/ui/Notice";
import StatusMark from "@/components/ui/StatusMark";
import CopyButton from "@/components/ui/CopyButton";
import { Ledger, LedgerRow, LedgerStack } from "@/components/ui/Ledger";
import { api } from "@/lib/client-api";
import { formatAmount, formatDateTime, formatXlmFee, truncateMiddle } from "@/lib/format";

interface ReceiptData {
  hash: string;
  successful: boolean;
  ledger: number;
  createdAt: string;
  sourceAccount: string;
  feeChargedStroops: string;
  memo: string | null;
  explorerUrl: string;
  operations: Array<{
    type: string;
    from?: string;
    to?: string;
    sendAsset?: string;
    sendAmount?: string;
    receiveAsset?: string;
    receiveAmount?: string;
  }>;
}

function Inner() {
  const initial = useSearchParams().get("hash") ?? "";
  const [hash, setHash] = useState(initial);
  const [result, setResult] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(value: string) {
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await api<ReceiptData>(`/api/verify/${encodeURIComponent(value.trim())}`);
    setBusy(false);
    if (res.ok) setResult(res.data);
    else setError(res.error);
  }

  useEffect(() => {
    // Auto-verify a hash passed in the link.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initial) void check(initial);
  }, [initial]);

  const op = result?.operations.find((o) => o.type.startsWith("path_payment") || o.type === "payment") ?? result?.operations[0];
  const from = op?.from ?? result?.sourceAccount;

  return (
    <>
      <form
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          void check(hash);
        }}
      >
        <label className="rx-label" htmlFor="verify-hash">Transaction hash</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="verify-hash"
            className="rx-input rx-mono flex-1 text-[16px] sm:text-[13.5px]"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            placeholder="64 hexadecimal characters"
            spellCheck={false}
            autoComplete="off"
            required
          />
          <button type="submit" className="rx-btn rx-btn-primary" disabled={busy || !hash.trim()}>
            {busy ? "Checking…" : "Verify"}
          </button>
        </div>
      </form>

      <div className="mt-8" aria-live="polite" aria-busy={busy}>
        {busy && <span className="rx-skel" style={{ height: 180 }} />}
        {error && <Notice tone="danger">{error}</Notice>}
        {result && (
          <div className="rx-sheet rx-sheet-pad">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="rx-h2">{result.successful ? "Succeeded on the network" : "Failed on the network"}</h2>
              <StatusMark state={result.successful ? "confirmed" : "failed"} />
            </div>

            <div className="mt-2">
              <Ledger>
                {op?.sendAmount && (
                  <LedgerRow label="Sent">
                    {formatAmount(op.sendAmount, op.sendAsset)} {op.sendAsset}
                  </LedgerRow>
                )}
                <LedgerRow label="Ledger">#{result.ledger.toLocaleString("en")}</LedgerRow>
                <LedgerRow label="Time">{formatDateTime(result.createdAt)}</LedgerRow>
                <LedgerRow label="Network fee">{formatXlmFee(Number(result.feeChargedStroops))}</LedgerRow>
                {op?.receiveAmount && (
                  <LedgerRow label="Received" total>
                    {formatAmount(op.receiveAmount, op.receiveAsset)} {op.receiveAsset}
                  </LedgerRow>
                )}
              </Ledger>
            </div>

            <dl className="mt-3">
              {from && (
                <LedgerStack label="From" action={<CopyButton value={from} label="Copy sender address" />}>
                  <span className="rx-mono" title={from}>{from}</span>
                </LedgerStack>
              )}
              {op?.to && (
                <LedgerStack label="To" action={<CopyButton value={op.to} label="Copy recipient address" />}>
                  <span className="rx-mono" title={op.to}>{op.to}</span>
                </LedgerStack>
              )}
              <LedgerStack label="Transaction hash" action={<CopyButton value={result.hash} label="Copy transaction hash" />}>
                <span className="rx-mono" title={result.hash}>{truncateMiddle(result.hash, 12, 12)}</span>
              </LedgerStack>
            </dl>

            <a href={result.explorerUrl} target="_blank" rel="noreferrer" className="rx-link mt-2 inline-flex items-center gap-1.5 text-[14px]">
              View on Stellar Expert <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </>
  );
}

export default function VerifyClient() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
