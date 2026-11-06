"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Notice from "@/components/ui/Notice";
import StatusMark from "@/components/ui/StatusMark";
import CopyButton from "@/components/ui/CopyButton";
import { Ledger, LedgerRow, LedgerStack } from "@/components/ui/Ledger";
import {
  formatAmount,
  formatDateTime,
  formatRate,
  timeUntil,
  type EscrowStatus,
  type TransactionStatus,
} from "@/lib/format";
import { explorerTxUrl } from "@/lib/network-label";

interface TransactionDetail {
  id: string;
  fromAsset: string;
  toAsset: string;
  fromAmount: string;
  toAmount: string | null;
  recipientAddress: string;
  status: TransactionStatus;
  stellarTxHash: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

interface EscrowDetail {
  id: string;
  status: EscrowStatus;
  amount: string;
  asset: string;
  expiresAt: string;
}

const ESCROW_COPY: Record<EscrowStatus, string> = {
  locked: "The funds are held on-chain. Before the expiry time only the platform authority can release them to the recipient. After it, the sender can take them back.",
  released: "The funds were released to the recipient.",
  refunded: "The escrow expired and the funds went back to the sender.",
  expired: "The escrow has expired. The sender can now refund the funds.",
};

function Timeline({ tx }: { tx: TransactionDetail }) {
  const failed = tx.status === "failed";
  const stage = tx.status === "pending" ? 0 : tx.status === "validating" ? 1 : 2;
  const steps = [
    { label: "Created", at: tx.createdAt },
    { label: "Submitted to Stellar", at: stage >= 1 ? tx.createdAt : null },
    { label: failed ? "Failed" : "Confirmed", at: tx.confirmedAt },
  ];
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Transfer progress">
      {steps.map((s, i) => {
        const reached = i <= stage;
        const bad = failed && i === 2;
        return (
          <li key={s.label} className="min-w-0">
            <div className="flex items-center gap-2" aria-hidden="true">
              <span
                className="h-[9px] w-[9px] flex-none rounded-full border-[1.5px]"
                style={{
                  borderColor: bad ? "var(--color-danger)" : reached ? "var(--color-ink)" : "var(--color-line-strong)",
                  background: reached ? (bad ? "var(--color-danger)" : "var(--color-ink)") : "transparent",
                }}
              />
              {i < steps.length - 1 && <span className="flex-1 border-t-2 border-dotted border-line-strong" />}
            </div>
            <p className={`mt-2 text-[14px] ${reached ? "font-medium" : "text-muted"}`}>{s.label}</p>
            <p className="rx-small">{i === 1 ? "" : s.at && reached ? formatDateTime(s.at) : ""}</p>
          </li>
        );
      })}
    </ol>
  );
}

export default function TransactionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [tx, setTx] = useState<TransactionDetail | null>(null);
  const [escrow, setEscrow] = useState<EscrowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/transactions/${id}`);
        const json = await res.json();
        if (ignore) return;
        if (res.ok) {
          setTx(json.data.transaction);
          setEscrow(json.data.escrow);
        } else {
          setError(json.error || "Transfer not found.");
        }
      } catch {
        if (!ignore) setError("Couldn't reach the server.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 0);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [id]);

  const back = (
    <Link href="/activity" className="rx-btn rx-btn-quiet rx-btn-sm -ml-3 mb-4">
      <ArrowLeft size={15} aria-hidden="true" /> Activity
    </Link>
  );

  if (loading) {
    return (
      <div className="rx-page" aria-busy="true">
        {back}
        <span className="rx-skel" style={{ width: 320, height: 36 }} />
        <span className="rx-skel mt-10" style={{ height: 200 }} />
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="rx-page">
        {back}
        <Notice tone="danger">{error || "Transfer not found."}</Notice>
      </div>
    );
  }

  const rate = tx.toAmount ? parseFloat(tx.toAmount) / parseFloat(tx.fromAmount) : null;
  const remaining = escrow ? timeUntil(escrow.expiresAt) : null;

  return (
    <div className="rx-page">
      {back}
      <PageHeader
        title={`${formatAmount(tx.fromAmount, tx.fromAsset)} ${tx.fromAsset} to ${tx.toAsset}`}
        description={<StatusMark state={tx.status} />}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <section aria-label="Details">
          <Ledger>
            <LedgerRow label="You sent">
              {formatAmount(tx.fromAmount, tx.fromAsset)} {tx.fromAsset}
            </LedgerRow>
            <LedgerRow label="They received">
              {tx.toAmount ? `${formatAmount(tx.toAmount, tx.toAsset)} ${tx.toAsset}` : "\u2013"}
            </LedgerRow>
            <LedgerRow label="Rate">{rate ? `1 ${tx.fromAsset} = ${formatRate(rate)} ${tx.toAsset}` : "\u2013"}</LedgerRow>
            <LedgerRow label="Created">{formatDateTime(tx.createdAt)}</LedgerRow>
            {tx.confirmedAt && <LedgerRow label="Confirmed">{formatDateTime(tx.confirmedAt)}</LedgerRow>}
          </Ledger>
          <dl className="mt-3">
            <LedgerStack label="Recipient" action={<CopyButton value={tx.recipientAddress} label="Copy recipient address" />}>
              <span className="rx-mono">{tx.recipientAddress}</span>
            </LedgerStack>
            {tx.stellarTxHash && (
              <LedgerStack label="Stellar transaction hash" action={<CopyButton value={tx.stellarTxHash} label="Copy transaction hash" />}>
                <span className="rx-mono">{tx.stellarTxHash}</span>
                <a href={explorerTxUrl(tx.stellarTxHash)} target="_blank" rel="noreferrer" className="rx-link mt-2 flex w-fit items-center gap-1.5 text-[14px]">
                  View on Stellar Expert <ExternalLink size={13} aria-hidden="true" />
                </a>
              </LedgerStack>
            )}
            <LedgerStack label="Transfer ID" action={<CopyButton value={tx.id} label="Copy transfer ID" />}>
              <span className="rx-mono">{tx.id}</span>
            </LedgerStack>
          </dl>
        </section>

        <div className="space-y-10">
          <section aria-label="Progress">
            <h2 className="rx-h2 mb-4">Progress</h2>
            <Timeline tx={tx} />
          </section>

          {escrow && (
            <section aria-label="Escrow">
              <div className="flex items-center justify-between gap-4">
                <h2 className="rx-h2">Escrow</h2>
                <StatusMark state={escrow.status} />
              </div>
              <Ledger>
                <LedgerRow label="Held">{formatAmount(escrow.amount, escrow.asset)} {escrow.asset}</LedgerRow>
                <LedgerRow label="Expires">{formatDateTime(escrow.expiresAt)}</LedgerRow>
                {escrow.status === "locked" && (
                  <LedgerRow label="Time left">{remaining ?? "Expired, refund available"}</LedgerRow>
                )}
              </Ledger>
              <p className="mt-3 max-w-[56ch] text-[14.5px] leading-[22px] text-muted">{ESCROW_COPY[escrow.status]}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
