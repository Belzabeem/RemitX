"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownUp, Check, RefreshCw } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Notice from "@/components/ui/Notice";
import RouteTrace from "@/components/ui/RouteTrace";
import { Ledger, LedgerRow } from "@/components/ui/Ledger";
import { useWallet } from "@/lib/wallet-context";
import { useAssets } from "@/lib/use-assets";
import { api } from "@/lib/client-api";
import { explainNoRoute } from "@/lib/route-diagnosis";
import { savePrepared, type PreparedTransfer } from "@/lib/prepared-transfer";
import { checkStellarPublicKey, STELLAR_PUBLIC_KEY_LENGTH } from "@/lib/stellar-address";
import { formatAmount, formatRate, formatTime, formatXlmFee, normalizeAmount, sanitizeDecimal } from "@/lib/format";

const QUOTE_REFRESH_MS = 15_000;

interface Quote {
  hops: string[];
  sendAmount: string;
  receiveAmount: string;
  effectiveRate: string;
}
interface Discovery {
  from: string;
  to: string;
  best: (Quote & { cost: PreparedTransfer["cost"] }) | null;
}

export default function SendMoneyPage() {
  const router = useRouter();
  const { address, loaded: walletLoaded, openModal } = useWallet();
  const assets = useAssets();

  // Pairs offered as one-tap corridors. With a single enabled asset it is a direct payment.
  const corridors = useMemo<[string, string][]>(() => {
    if (assets.length < 2) return [[assets[0] ?? "XLM", assets[0] ?? "XLM"]];
    const pairs: [string, string][] = [];
    for (const a of assets) for (const b of assets) if (a !== b) pairs.push([a, b]);
    return pairs.slice(0, 6);
  }, [assets]);

  // What the person picked; anything not (or no longer) available falls back to a sensible default.
  const [pick, setPick] = useState<{ from?: string; to?: string }>({});
  const fromAsset = pick.from && assets.includes(pick.from) ? pick.from : (assets[0] ?? "XLM");
  const toAsset = pick.to && assets.includes(pick.to) ? pick.to : (assets[1] ?? assets[0] ?? "XLM");

  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientTouched, setRecipientTouched] = useState(false);
  const [best, setBest] = useState<Discovery["best"]>(null);
  const [previousRate, setPreviousRate] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quotedAt, setQuotedAt] = useState<Date | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const rateRef = useRef<string | null>(null);

  const numericAmount = parseFloat(amount) || 0;
  const rate = best?.cost.effectiveRate ?? null;

  const fetchQuote = useCallback(async () => {
    if (!(numericAmount > 0)) {
      setBest(null);
      setQuoteError(null);
      setQuoteLoading(false);
      rateRef.current = null;
      return;
    }
    setQuoteLoading(true);
    const res = await api<Discovery>(
      `/api/stellar/routes?from=${fromAsset}&to=${toAsset}&amount=${encodeURIComponent(normalizeAmount(amount))}`
    );
    if (res.ok && res.data.best) {
      const next = res.data.best;
      if (rateRef.current && rateRef.current !== next.cost.effectiveRate) setPreviousRate(rateRef.current);
      rateRef.current = next.cost.effectiveRate;
      setBest(next);
      setQuotedAt(new Date());
      setQuoteError(null);
    } else {
      setBest(null);
      rateRef.current = null;
      setQuoteError(res.ok ? await explainNoRoute(fromAsset, toAsset, normalizeAmount(amount)) : res.error);
    }
    setQuoteLoading(false);
  }, [fromAsset, toAsset, amount, numericAmount]);

  // Quote as the inputs settle, then keep it fresh so the figures shown at
  // "Review transfer" are never more than QUOTE_REFRESH_MS old.
  useEffect(() => {
    const first = setTimeout(() => void fetchQuote(), 450);
    const repeat = setInterval(() => void fetchQuote(), QUOTE_REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(repeat);
    };
  }, [fetchQuote]);

  const changeCorridor = (from: string, to: string) => {
    setPick({ from, to });
    setBest(null);
    setPreviousRate(null);
    rateRef.current = null;
    setQuoteError(null);
  };

  const received = best ? best.cost.receiveAmount : null;

  // Funds on Stellar can't be recalled, so the checksum is verified as the
  // address is typed instead of waiting for Horizon to reject it.
  const trimmedRecipient = recipient.trim();
  const recipientCheck = checkStellarPublicKey(trimmedRecipient);
  const showRecipientError =
    !recipientCheck.valid &&
    trimmedRecipient.length > 0 &&
    (recipientTouched || trimmedRecipient.length >= STELLAR_PUBLIC_KEY_LENGTH);

  const needsWallet = walletLoaded && !address;
  const canContinue = numericAmount > 0 && recipientCheck.valid && !!best && !quoteLoading && !needsWallet;
  const blocker = needsWallet
    ? "Connect a wallet to continue."
    : numericAmount <= 0
      ? "Enter an amount to continue."
      : !recipientCheck.valid
        ? "Enter a valid Stellar address to continue."
        : !best
          ? quoteLoading
            ? "Finding the best route."
            : "Waiting for a route."
          : null;

  const handleContinue = async () => {
    if (!canContinue) return;
    setSubmitting(true);
    setSubmitError(null);
    const res = await api<PreparedTransfer>("/api/stellar/send", {
      method: "POST",
      body: JSON.stringify({
        fromAsset,
        toAsset,
        amount: normalizeAmount(amount),
        recipientAddress: trimmedRecipient,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setSubmitError(res.error || "Couldn't start this transfer.");
      return;
    }
    savePrepared(res.data);
    router.push(`/review?transactionId=${res.data.transactionId}`);
  };

  const traceNodes = best ? (best.hops.length >= 2 ? best.hops : [fromAsset, "Stellar", toAsset]) : null;

  return (
    <div className="rx-page">
      <PageHeader
        title="Send money"
        description="Choose a corridor, check the quote, and review everything before it's signed."
      />

      {needsWallet && (
        <div className="mb-8">
          <Notice tone="caution">
            You need to connect a Stellar wallet before you can send.{" "}
            <button type="button" className="rx-link" onClick={openModal}>
              Connect a wallet
            </button>
            .
          </Notice>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
        {/* Form */}
        <div className="space-y-8">
          <div>
            <span className="rx-label" id="corridor-label">Corridor</span>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="corridor-label">
              {corridors.map(([from, to]) => (
                <button
                  key={`${from}-${to}`}
                  type="button"
                  className="rx-chip"
                  aria-pressed={fromAsset === from && toAsset === to}
                  onClick={() => changeCorridor(from, to)}
                >
                  {from} to {to}
                </button>
              ))}
            </div>
            {assets.length === 1 && (
              <p className="rx-small mt-2">
                Only XLM is enabled. Set STELLAR_USDC_ISSUER in your environment to add USDC. See the README.
              </p>
            )}
          </div>

          <div>
            <label className="rx-label" htmlFor="send-amount">You send</label>
            <div className="rx-amountfield">
              <input
                id="send-amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(sanitizeDecimal(e.target.value))}
              />
              <select aria-label="Asset you send" value={fromAsset} onChange={(e) => changeCorridor(e.target.value, toAsset)}>
                {assets.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="my-2 flex justify-start">
              <button
                type="button"
                className="rx-iconbtn"
                aria-label="Swap assets"
                title="Swap assets"
                onClick={() => changeCorridor(toAsset, fromAsset)}
              >
                <ArrowDownUp size={16} />
              </button>
            </div>

            <label className="rx-label" htmlFor="receive-amount">Recipient gets</label>
            <div className="rx-amountfield" data-readonly="true">
              <input
                id="receive-amount"
                readOnly
                tabIndex={-1}
                value={received && numericAmount > 0 ? formatAmount(received, toAsset) : ""}
                placeholder="0.00"
                aria-live="polite"
              />
              <select aria-label="Asset they receive" value={toAsset} onChange={(e) => changeCorridor(fromAsset, e.target.value)}>
                {assets.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="rx-label" htmlFor="recipient-address">Recipient&apos;s Stellar address</label>
            <div className="rx-field-icon">
              <input
                id="recipient-address"
                className="rx-input rx-mono text-[16px] sm:text-[13.5px]"
                placeholder="G…"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                onBlur={() => setRecipientTouched(true)}
                aria-invalid={showRecipientError}
                aria-describedby="recipient-status"
              />
              {recipientCheck.valid && (
                <span aria-hidden="true" className="grid h-[34px] w-[34px] place-items-center text-positive">
                  <Check size={17} />
                </span>
              )}
            </div>
            <p
              id="recipient-status"
              role="status"
              className="rx-hint"
              data-tone={showRecipientError ? "danger" : recipientCheck.valid ? "positive" : undefined}
            >
              {showRecipientError
                ? recipientCheck.message
                : recipientCheck.valid
                  ? "Valid address. The checksum matches. The account must already exist on the network."
                  : "A public key starting with G, 56 characters long."}
            </p>
          </div>
        </div>

        {/* Quote */}
        <aside className="lg:sticky lg:top-8" aria-label="Quote">
          <div className="rx-sheet rx-sheet-pad">
            <div className="flex items-center justify-between">
              <h2 className="rx-h2">Quote</h2>
              <button
                type="button"
                className="rx-iconbtn"
                onClick={() => void fetchQuote()}
                aria-label="Refresh quote"
                title="Refresh quote"
              >
                <RefreshCw size={15} className={quoteLoading ? "rx-spin" : ""} />
              </button>
            </div>

            <div className="mt-3 min-h-[46px]">
              {traceNodes ? <RouteTrace nodes={traceNodes} animateKey={traceNodes.join("-")} /> : null}
            </div>

            <div className="mt-2">
              <Ledger>
                <LedgerRow label="Rate">
                  {rate ? (
                    `1 ${fromAsset} = ${formatRate(rate)} ${toAsset}`
                  ) : quoteLoading ? (
                    <span className="rx-skel inline-block align-middle" style={{ width: 120, height: 14 }} />
                  ) : (
                    "\u2013"
                  )}
                </LedgerRow>
                <LedgerRow label="Route">
                  {best ? (best.hops.length > 1 ? best.hops.join(" > ") : "Direct payment") : "\u2013"}
                </LedgerRow>
                <LedgerRow label="RemitX fee">None</LedgerRow>
                <LedgerRow label="Network fee">{best ? formatXlmFee(best.cost.networkFeeStroops) : "\u2013"}</LedgerRow>
                <LedgerRow label="Arrives">{best ? "About 5 seconds" : "\u2013"}</LedgerRow>
                <LedgerRow label="They receive" total>
                  {received && numericAmount > 0 ? `${formatAmount(received, toAsset)} ${toAsset}` : "\u2013"}
                </LedgerRow>
              </Ledger>
            </div>

            <p className="rx-small mt-3" aria-live="polite">
              {quotedAt && best ? `Quote updated ${formatTime(quotedAt)}.` : "\u00A0"}
              {previousRate && rate && previousRate !== rate ? ` It moved from ${formatRate(previousRate)}.` : ""}
            </p>

            {quoteError && (
              <div className="mt-4">
                <Notice tone="danger">{quoteError}</Notice>
              </div>
            )}
            {submitError && (
              <div className="mt-4">
                <Notice tone="danger">{submitError}</Notice>
              </div>
            )}

            <div className="mt-5">
              <Notice tone="caution">Stellar payments can&apos;t be reversed. Check the address before you continue.</Notice>
            </div>

            {needsWallet ? (
              <button type="button" className="rx-btn rx-btn-primary rx-btn-block mt-5" onClick={openModal}>
                Connect wallet
              </button>
            ) : (
              <button
                type="button"
                className="rx-btn rx-btn-primary rx-btn-block mt-5"
                onClick={handleContinue}
                disabled={!canContinue || submitting}
              >
                {submitting ? "Preparing transfer…" : "Review transfer"}
              </button>
            )}
            <p className="rx-small mt-3 min-h-[18px] text-center">{blocker}</p>
            <p className="rx-small text-center">
              Want to see every path? <Link href="/routes" className="rx-link">Compare routes</Link>.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
