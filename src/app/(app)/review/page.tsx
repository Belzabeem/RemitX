"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, ExternalLink } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Notice from "@/components/ui/Notice";
import CopyButton from "@/components/ui/CopyButton";
import { Ledger, LedgerRow, LedgerStack } from "@/components/ui/Ledger";
import { checkStellarPublicKey } from "@/lib/stellar-address";
import { formatAmount, formatRate, formatXlmFee, truncateMiddle } from "@/lib/format";
import { explorerTxUrl } from "@/lib/network-label";
import { api } from "@/lib/client-api";
import { useWallet } from "@/lib/wallet-context";
import { clearPrepared, loadPrepared } from "@/lib/prepared-transfer";

const STEPS = ["Details", "Review", "Sent"];

function Steps({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center gap-3 text-[14px]" aria-label="Progress">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-3" aria-current={i === current ? "step" : undefined}>
          <span className={i <= current ? "font-medium text-ink" : "text-faint"}>
            <span className="mr-1.5 inline-block w-3 text-center">{i < current ? <Check size={13} className="inline" /> : i + 1}</span>
            {label}
          </span>
          {i < STEPS.length - 1 && <span className="inline-block w-8 border-t-2 border-dotted border-line-strong" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="rx-page">
      <PageHeader title="Review transfer" />
      <p className="max-w-[52ch] text-[15px] leading-6 text-muted">{children}</p>
    </div>
  );
}

function ReviewInner() {
  const params = useSearchParams();
  const transactionId = params.get("transactionId");

  const { address, loaded: walletLoaded, openModal, signTransaction } = useWallet();
  const [tx] = useState(() => loadPrepared(transactionId));
  const [status, setStatus] = useState<"idle" | "submitting" | "confirmed" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  // The address comes back out of sessionStorage, so check it again before signing.
  const recipientCheck = checkStellarPublicKey(tx?.recipientAddress ?? "");

  const handleConfirm = async () => {
    if (!tx || !recipientCheck.valid) return;
    setStatus("submitting");
    setError(null);
    try {
      // The wallet shows the transaction and signs it; RemitX never sees a secret key.
      const signedXdr = await signTransaction(tx.xdr, tx.networkPassphrase);
      const res = await api<{ status: string; stellarTxHash: string | null }>("/api/stellar/submit", {
        method: "POST",
        body: JSON.stringify({ transactionId: tx.transactionId, signedXdr }),
      });
      if (!res.ok) throw new Error(res.error);
      if (res.data.status !== "confirmed" || !res.data.stellarTxHash) {
        throw new Error("The network rejected the transfer, so nothing was sent. Check your balance and try again.");
      }
      setStatus("confirmed");
      setHash(res.data.stellarTxHash);
      clearPrepared(tx.transactionId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setStatus("failed");
      setError(
        /reject|denied|declin|cancel|closed/i.test(msg) && !/network rejected/i.test(msg)
          ? "You declined the request in your wallet. Nothing was sent."
          : msg || "Something went wrong. Nothing was sent."
      );
    }
  };

  if (!transactionId) {
    return (
      <Message>
        There&apos;s no transfer to review. <Link href="/send" className="rx-link">Start a new one</Link>.
      </Message>
    );
  }
  if (!tx) {
    return (
      <Message>
        This transfer is no longer in this browser session. <Link href="/send" className="rx-link">Start a new one</Link>.
      </Message>
    );
  }

  const done = status === "confirmed";
  const busy = status === "submitting";
  const needsWallet = walletLoaded && !address;
  const canSign = recipientCheck.valid && !!address && !busy;

  return (
    <div className="rx-page">
      <PageHeader
        title={done ? "Transfer sent" : "Review transfer"}
        description={done ? "The recipient has been paid on Stellar." : "Nothing is signed until you confirm on the right."}
      />
      <Steps current={done ? 2 : 1} />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
        <section aria-label="Transfer summary">
          <p className="rx-small">They receive</p>
          <p className="rx-figure mt-1 text-[30px] sm:text-[40px] md:text-[52px] break-words">
            {formatAmount(tx.toAmount, tx.toAsset)}
            <span className="ml-2 text-[20px] font-normal tracking-normal text-muted">{tx.toAsset}</span>
          </p>
          <p className="rx-small mt-2">
            At least {formatAmount(tx.destMin, tx.toAsset)} {tx.toAsset} is guaranteed. If the recipient would get less, the network rejects the transfer and nothing is sent.
          </p>

          <div className="mt-6 max-w-[520px]">
            <Ledger>
              <LedgerRow label="You send">
                {formatAmount(tx.fromAmount, tx.fromAsset)} {tx.fromAsset}
              </LedgerRow>
              <LedgerRow label="Route">{tx.route.length > 1 ? tx.route.join(" > ") : "Direct payment"}</LedgerRow>
              <LedgerRow label="Rate">
                1 {tx.fromAsset} = {formatRate(tx.cost.effectiveRate)} {tx.toAsset}
              </LedgerRow>
              <LedgerRow label="RemitX fee">{tx.cost.platformFee === "0" ? "None" : tx.cost.platformFee}</LedgerRow>
              <LedgerRow label="Network fee">{formatXlmFee(tx.cost.networkFeeStroops)}</LedgerRow>
              <LedgerRow label="Arrives">{tx.cost.estimatedArrival}</LedgerRow>
              <LedgerRow label="Total cost" total>
                {formatAmount(tx.fromAmount, tx.fromAsset)} {tx.fromAsset}
              </LedgerRow>
            </Ledger>
            <dl className="mt-4">
              <LedgerStack label="Recipient" action={<CopyButton value={tx.recipientAddress} label="Copy recipient address" />}>
                <span className="rx-mono block">{tx.recipientAddress}</span>
                <span className="rx-hint block" data-tone={recipientCheck.valid ? "positive" : "danger"}>
                  {recipientCheck.valid ? "Checksum verified." : recipientCheck.message}
                </span>
              </LedgerStack>
            </dl>
          </div>

          <div className="mt-6 max-w-[520px]">
            <Notice tone="caution">Double-check the recipient. Assets sent on Stellar can&apos;t be reversed.</Notice>
          </div>
        </section>

        <aside aria-label="Sign and send">
          <div className="rx-sheet rx-sheet-pad">
            {!done ? (
              <>
                <h2 className="rx-h2">Sign and send</h2>
                <p className="mt-3 text-[14.5px] leading-[22px] text-muted">
                  Your wallet will show this transfer and ask you to approve it. RemitX never sees your secret key.
                </p>

                {status === "failed" && error && (
                  <div className="mt-3">
                    <Notice tone="danger">{error}</Notice>
                  </div>
                )}

                {needsWallet ? (
                  <button type="button" className="rx-btn rx-btn-primary rx-btn-block mt-6" onClick={openModal}>
                    Connect wallet
                  </button>
                ) : (
                  <div className="rx-glow mt-6" data-off={!canSign}>
                    <button type="button" className="rx-btn rx-btn-primary rx-btn-block" onClick={handleConfirm} disabled={!canSign}>
                      {busy ? "Waiting for your wallet…" : "Sign in wallet"}
                    </button>
                  </div>
                )}
                <Link href="/send" className="rx-btn rx-btn-quiet rx-btn-block mt-5">
                  Edit transfer
                </Link>
              </>
            ) : (
              hash && (
                <>
                  <Notice tone="positive">Confirmed on the Stellar network.</Notice>
                  <dl className="mt-4">
                    <LedgerStack label="Transaction hash" action={<CopyButton value={hash} label="Copy transaction hash" />}>
                      <span className="rx-mono" title={hash}>{truncateMiddle(hash, 12, 12)}</span>
                    </LedgerStack>
                  </dl>
                  <a href={explorerTxUrl(hash)} target="_blank" rel="noreferrer" className="rx-link mt-1 inline-flex items-center gap-1.5 text-[14px]">
                    View on Stellar Expert <ExternalLink size={13} aria-hidden="true" />
                  </a>
                  <Link href={`/verify?hash=${hash}`} className="rx-link mt-2 inline-flex text-[14px]">
                    Verify this transfer
                  </Link>
                  <div className="mt-6 flex flex-col gap-2">
                    <Link href="/activity" className="rx-btn rx-btn-primary rx-btn-block">View in Activity</Link>
                    <Link href="/send" className="rx-btn rx-btn-secondary rx-btn-block">Send another</Link>
                  </div>
                </>
              )
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={null}>
      <ReviewInner />
    </Suspense>
  );
}
