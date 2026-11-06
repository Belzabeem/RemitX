"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Notice from "@/components/ui/Notice";
import CopyButton from "@/components/ui/CopyButton";
import { Ledger, LedgerRow, LedgerStack } from "@/components/ui/Ledger";
import { formatAmount, formatDateTime } from "@/lib/format";

interface OperationData {
  type: string;
  from?: string;
  to?: string;
  sendAsset?: string;
  sendAmount?: string;
  receiveAsset?: string;
  receiveAmount?: string;
}

interface ReceiptData {
  hash: string;
  successful: boolean;
  ledger: number;
  createdAt: string;
  sourceAccount: string;
  feeChargedStroops: string;
  memo: string | null;
  explorerUrl: string;
  operations: OperationData[];
}

function Inner() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("hash") ?? "";
  const [hash, setHash] = useState(initial);
  const [result, setResult] = useState<ReceiptData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function check(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setResult(json.data);
      } else {
        setError(json.error || "Transaction not found on the network.");
      }
    } catch {
      setError("Couldn't reach the server. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // Auto-verify a hash passed in the link.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initial) void check(initial);
  }, [initial]);

  const op =
    result?.operations.find((o) => o.type.startsWith("path_payment") || o.type === "payment") ??
    result?.operations[0];

  return (
    <div>
      <PageHeader
        title="Verify a transfer"
        description="Paste a Stellar transaction hash. The details come directly from the network ledger, so proof of payment cannot be altered."
      />

      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void check(hash);
        }}
      >
        <div className="flex-1">
          <label className="rx-label" htmlFor="tx-hash">
            Transaction hash
          </label>
          <div className="rx-field-icon">
            <input
              id="tx-hash"
              className="rx-input rx-mono"
              style={{ fontSize: 13.5 }}
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              placeholder="64 hexadecimal characters"
              spellCheck={false}
              autoComplete="off"
              required
            />
            <span aria-hidden="true" className="grid h-[34px] w-[34px] place-items-center text-muted">
              <Search size={16} />
            </span>
          </div>
        </div>
        <button type="submit" className="rx-btn rx-btn-primary" disabled={busy || !hash.trim()}>
          {busy ? "Checking…" : "Verify"}
        </button>
      </form>

      <div className="mt-8" aria-live="polite">
        {error && <Notice tone="danger">{error}</Notice>}

        {result && (
          <div className="rx-sheet rx-sheet-pad">
            <div className="mb-6">
              <Notice tone={result.successful ? "positive" : "danger"}>
                {result.successful
                  ? "Confirmed on the Stellar network."
                  : "Transaction failed or was rejected on the network."}
              </Notice>
            </div>

            <div className="max-w-[560px]">
              <Ledger>
                {op?.sendAmount && (
                  <LedgerRow label="Amount sent">
                    {formatAmount(op.sendAmount, op.sendAsset ?? "XLM")} {op.sendAsset ?? "XLM"}
                  </LedgerRow>
                )}
                {op?.receiveAmount && (
                  <LedgerRow label="Amount received" total>
                    {formatAmount(op.receiveAmount, op.receiveAsset ?? "XLM")} {op.receiveAsset ?? "XLM"}
                  </LedgerRow>
                )}
                <LedgerRow label="Ledger sequence">
                  #{result.ledger.toLocaleString("en-US")}
                </LedgerRow>
                <LedgerRow label="Network time">
                  {formatDateTime(result.createdAt)}
                </LedgerRow>
                <LedgerRow label="Network fee">
                  {(Number(result.feeChargedStroops) / 1e7).toFixed(7).replace(/0+$/, "").replace(/\.$/, "")} XLM
                </LedgerRow>
                {result.memo && <LedgerRow label="Memo">{result.memo}</LedgerRow>}
              </Ledger>

              <dl className="mt-4 space-y-3">
                <LedgerStack
                  label="From (Source Account)"
                  action={<CopyButton value={op?.from ?? result.sourceAccount} label="Copy sender address" />}
                >
                  <span className="rx-mono block">{op?.from ?? result.sourceAccount}</span>
                </LedgerStack>

                {op?.to && (
                  <LedgerStack
                    label="To (Destination Account)"
                    action={<CopyButton value={op.to} label="Copy recipient address" />}
                  >
                    <span className="rx-mono block">{op.to}</span>
                  </LedgerStack>
                )}

                <LedgerStack
                  label="Transaction hash"
                  action={<CopyButton value={result.hash} label="Copy transaction hash" />}
                >
                  <span className="rx-mono block">{result.hash}</span>
                </LedgerStack>
              </dl>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <a
                  href={result.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rx-link inline-flex items-center gap-1.5 text-[14px]"
                >
                  View on Stellar Expert <ExternalLink size={13} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyClient() {
  return (
    <Suspense fallback={<p className="rx-small">Loading verifier…</p>}>
      <Inner />
    </Suspense>
  );
}
