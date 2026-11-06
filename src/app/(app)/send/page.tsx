"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownUp, Check, RefreshCw } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Notice from "@/components/ui/Notice";
import RouteTrace from "@/components/ui/RouteTrace";
import { Ledger, LedgerRow } from "@/components/ui/Ledger";
import { useCurrentUser } from "@/components/app/user-context";
import { checkStellarPublicKey, STELLAR_PUBLIC_KEY_LENGTH } from "@/lib/stellar-address";
import { formatAmount, formatRate, formatTime, normalizeAmount, sanitizeDecimal } from "@/lib/format";

const ASSETS = ["USD", "NGN", "PHP", "GBP", "USDC", "XLM"];
const CORRIDORS: [string, string][] = [
  ["USD", "NGN"],
  ["USD", "PHP"],
  ["USD", "GBP"],
  ["GBP", "NGN"],
];
const QUOTE_REFRESH_MS = 15_000;

function stroopsToXlm(stroops: number): string {
  return (stroops / 1e7).toFixed(7).replace(/0+$/, "").replace(/\.$/, "");
}

export default function SendMoneyPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [fromAsset, setFromAsset] = useState("USD");
  const [toAsset, setToAsset] = useState("NGN");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientTouched, setRecipientTouched] = useState(false);
  const [rate, setRate] = useState<string | null>(null);
  const [previousRate, setPreviousRate] = useState<string | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [rateUpdatedAt, setRateUpdatedAt] = useState<Date | null>(null);
  const [baseFeeStroops, setBaseFeeStroops] = useState<number | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const rateRef = useRef<string | null>(null);

  const fetchQuote = useCallback(async () => {
    setRateLoading(true);
    try {
      const res = await fetch(`/api/stellar/rate?from=${fromAsset}&to=${toAsset}`);
      const json = await res.json();
      if (res.ok) {
        if (rateRef.current && rateRef.current !== json.data.rate) setPreviousRate(rateRef.current);
        rateRef.current = json.data.rate;
        setRate(json.data.rate);
        setRateUpdatedAt(new Date());
        setQuoteError(null);
      } else {
        setQuoteError(json.error || "There's no live rate for this corridor right now.");
        setRate(null);
        rateRef.current = null;
      }
    } catch {
      setQuoteError("Couldn't reach the server for a live rate.");
      setRate(null);
      rateRef.current = null;
    } finally {
      setRateLoading(false);
    }
  }, [fromAsset, toAsset]);

  // Quote when the corridor changes, then keep it fresh so the rate shown at
  // "Review transfer" is never more than QUOTE_REFRESH_MS old.
  useEffect(() => {
    const first = setTimeout(() => void fetchQuote(), 250);
    const repeat = setInterval(() => void fetchQuote(), QUOTE_REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(repeat);
    };
  }, [fetchQuote]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/stellar/status");
        if (!res.ok) return;
        const json = await res.json();
        if (!ignore) setBaseFeeStroops(json.data.baseFeeStroops);
      } catch {
        // The fee row just shows a dash.
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const changeCorridor = (from: string, to: string) => {
    setFromAsset(from);
    setToAsset(to);
    setRate(null);
    setPreviousRate(null);
    rateRef.current = null;
    setRateLoading(true);
  };

  const numericAmount = parseFloat(amount) || 0;
  const received = rate ? numericAmount * parseFloat(rate) : 0;

  // Funds on Stellar can't be recalled, so the checksum is verified as the
  // address is typed instead of waiting for Horizon to reject it.
  const trimmedRecipient = recipient.trim();
  const recipientCheck = checkStellarPublicKey(trimmedRecipient);
  const showRecipientError =
    !recipientCheck.valid &&
    trimmedRecipient.length > 0 &&
    (recipientTouched || trimmedRecipient.length >= STELLAR_PUBLIC_KEY_LENGTH);

  const needsWallet = !!user && !user.stellarPublicKey;
  const canContinue = numericAmount > 0 && recipientCheck.valid && !!rate && !rateLoading && !needsWallet;
  const blocker = needsWallet
    ? "Create a wallet on Overview first."
    : numericAmount <= 0
      ? "Enter an amount to continue."
      : !recipientCheck.valid
        ? "Enter a valid Stellar address to continue."
        : !rate
          ? "Waiting for a live rate."
          : null;

  const handleContinue = async () => {
    if (!canContinue) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/stellar/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAsset,
          toAsset,
          amount: normalizeAmount(amount),
          recipientAddress: trimmedRecipient,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        sessionStorage.setItem(
          `remitx:tx:${json.data.transactionId}`,
          JSON.stringify({
            transactionId: json.data.transactionId,
            xdr: json.data.xdr,
            fromAsset: json.data.fromAsset,
            toAsset: json.data.toAsset,
            fromAmount: json.data.fromAmount,
            toAmount: json.data.toAmount,
            recipientAddress: json.data.recipientAddress,
          })
        );
        router.push(`/review?transactionId=${json.data.transactionId}`);
      } else {
        setSubmitError(json.error || "Couldn't start this transfer.");
      }
    } catch {
      setSubmitError("Couldn't reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rx-page">
      <PageHeader
        title="Send money"
        description="Choose a corridor, check the quote, and review everything before it's signed."
      />

      {needsWallet && (
        <div className="mb-8">
          <Notice tone="caution">
            You need a Stellar wallet before you can send.{" "}
            <Link href="/dashboard" className="rx-link">
              Create one on Overview
            </Link>
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
              {CORRIDORS.map(([from, to]) => (
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
              <select aria-label="Currency you send" value={fromAsset} onChange={(e) => changeCorridor(e.target.value, toAsset)}>
                {ASSETS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="my-2 flex justify-start">
              <button
                type="button"
                className="rx-iconbtn"
                aria-label="Swap currencies"
                title="Swap currencies"
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
                value={rate && numericAmount > 0 ? formatAmount(received, toAsset) : ""}
                placeholder="0.00"
                aria-live="polite"
              />
              <select aria-label="Currency they receive" value={toAsset} onChange={(e) => changeCorridor(fromAsset, e.target.value)}>
                {ASSETS.map((a) => (
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
                className="rx-input rx-mono"
                style={{ fontSize: 13.5 }}
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
                  ? "Valid address. The checksum matches."
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
                aria-label="Refresh rate"
                title="Refresh rate"
              >
                <RefreshCw size={15} className={rateLoading ? "rx-spin" : ""} />
              </button>
            </div>

            <div className="mt-3 min-h-[46px]">
              {rate ? <RouteTrace nodes={[fromAsset, "Stellar", toAsset]} animateKey={`${fromAsset}-${toAsset}`} /> : null}
            </div>

            <div className="mt-2">
              <Ledger>
                <LedgerRow label="Rate">
                  {rate ? `1 ${fromAsset} = ${formatRate(rate)} ${toAsset}` : rateLoading ? <span className="rx-skel inline-block align-middle" style={{ width: 120, height: 14 }} /> : "\u2013"}
                </LedgerRow>
                <LedgerRow label="RemitX fee">None</LedgerRow>
                <LedgerRow label="Network fee">
                  {baseFeeStroops !== null ? `${stroopsToXlm(baseFeeStroops)} XLM` : "\u2013"}
                </LedgerRow>
                <LedgerRow label="Arrives">About 5 seconds</LedgerRow>
                <LedgerRow label="They receive" total>
                  {rate && numericAmount > 0 ? `${formatAmount(received, toAsset)} ${toAsset}` : "\u2013"}
                </LedgerRow>
              </Ledger>
            </div>

            <p className="rx-small mt-3" aria-live="polite">
              {rateUpdatedAt && rate ? `Rate updated ${formatTime(rateUpdatedAt)}.` : "\u00A0"}
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

            <button
              type="button"
              className="rx-btn rx-btn-primary rx-btn-block mt-5"
              onClick={handleContinue}
              disabled={!canContinue || submitting}
            >
              {submitting ? "Preparing transfer…" : "Review transfer"}
            </button>
            <p className="rx-small mt-3 min-h-[18px] text-center">{blocker}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
