"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Notice from "@/components/ui/Notice";
import Modal from "@/components/ui/Modal";
import CopyButton from "@/components/ui/CopyButton";
import { Ledger, LedgerRow } from "@/components/ui/Ledger";
import TransactionTable, { type TransactionRow } from "@/components/ui/TransactionTable";
import { useCurrentUser } from "@/components/app/user-context";
import { formatAmount, formatTime } from "@/lib/format";
import { NETWORK_LABEL } from "@/lib/network-label";

interface Balance {
  asset: string;
  balance: string;
}

interface NetworkStatus {
  ledgerSequence: number;
  baseFeeStroops: number;
  closedAt: string;
}

const FIRST_TRANSFER_STEPS = [
  "Enter the amount and the recipient's Stellar address.",
  "RemitX looks for the cheapest route for that corridor.",
  "Check the rate, fees and arrival time before anything is signed.",
  "Send with a Stellar path payment.",
  "The recipient is paid in about five seconds.",
];

export default function OverviewPage() {
  const { user, refresh } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [activated, setActivated] = useState(false);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [network, setNetwork] = useState<NetworkStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [keySaved, setKeySaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const [balanceRes, txRes, statusRes] = await Promise.all([
        fetch("/api/stellar/balance"),
        fetch("/api/transactions?limit=5"),
        fetch("/api/stellar/status"),
      ]);
      if (balanceRes.ok) {
        const json = await balanceRes.json();
        setActivated(json.data.activated);
        setBalances(json.data.balances);
      }
      if (txRes.ok) setTransactions((await txRes.json()).data.transactions);
      if (statusRes.ok) setNetwork((await statusRes.json()).data);
      setError(null);
    } catch {
      setError("Couldn't reach the server. Check your connection and refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  const activateWallet = async () => {
    setActivating(true);
    setError(null);
    try {
      const res = await fetch("/api/stellar/account", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setKeySaved(false);
        setSecretKey(json.data.secretKey);
      } else {
        setError(json.error || "Couldn't create the wallet.");
      }
    } catch {
      setError("Couldn't create the wallet. Check your connection and try again.");
    } finally {
      setActivating(false);
    }
  };

  const finishActivation = async () => {
    setSecretKey(null);
    setLoading(true);
    await Promise.all([load(), refresh()]);
  };

  const xlm = balances.find((b) => b.asset === "XLM");
  const others = balances.filter((b) => b.asset !== "XLM");

  return (
    <div className="rx-page">
      <PageHeader
        title="Overview"
        description={`Your balance and latest transfers on Stellar ${NETWORK_LABEL.toLowerCase()}.`}
        actions={
          <Link href="/send" className="rx-btn rx-btn-primary">
            Send money
          </Link>
        }
      />

      {error && (
        <div className="mb-8">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
        <div>
          {/* Balance */}
          {loading ? (
            <div aria-busy="true">
              <span className="rx-skel" style={{ width: 80, height: 14 }} />
              <span className="rx-skel mt-4" style={{ width: 280, height: 52 }} />
            </div>
          ) : !activated ? (
            <div className="rx-sheet rx-sheet-pad">
              <h2 className="rx-h2">Create your {NETWORK_LABEL.toLowerCase()} wallet</h2>
              <p className="mt-2 max-w-[52ch] text-[14.5px] leading-[22px] text-muted">
                RemitX opens a Stellar account for you and funds it through Friendbot. You&apos;ll be shown the secret key once,
                and it isn&apos;t stored anywhere on our side.
              </p>
              <button type="button" className="rx-btn rx-btn-primary mt-5" onClick={activateWallet} disabled={activating}>
                {activating ? "Creating wallet…" : "Create wallet"}
              </button>
            </div>
          ) : (
            <div>
              <p className="rx-small">XLM balance</p>
              <p className="rx-figure mt-1 text-[44px] md:text-[56px]">
                {formatAmount(xlm?.balance ?? "0", "XLM")}
                <span className="ml-2 text-[20px] font-normal tracking-normal text-muted">XLM</span>
              </p>
              {others.length > 0 ? (
                <div className="mt-6 max-w-[420px]">
                  <Ledger>
                    {others.map((b) => (
                      <LedgerRow key={b.asset} label={b.asset}>
                        {formatAmount(b.balance, b.asset)}
                      </LedgerRow>
                    ))}
                  </Ledger>
                </div>
              ) : (
                <p className="rx-small mt-3">No other assets on this account yet.</p>
              )}
            </div>
          )}

          {/* Recent transfers */}
          <section className="rx-section" aria-labelledby="recent-heading">
            <div className="rx-sectionhead">
              <h2 id="recent-heading" className="rx-h2">Recent transfers</h2>
              {transactions.length > 0 && (
                <Link href="/activity" className="rx-link text-[14px]">
                  All activity
                </Link>
              )}
            </div>
            {loading ? (
              <div className="space-y-3" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="rx-skel" style={{ height: 52 }} />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div>
                <p className="text-[15px] font-medium">No transfers yet</p>
                <p className="rx-small mt-1">Your first one takes five steps.</p>
                <ol className="mt-5 max-w-[52ch]">
                  {FIRST_TRANSFER_STEPS.map((step, i) => (
                    <li key={step} className="flex gap-4 border-t border-line py-3 text-[14.5px] leading-5 first:border-t-0">
                      <span className="w-4 flex-none text-muted">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="rx-tablewrap">
                <TransactionTable transactions={transactions} />
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-10" aria-label="Network and wallet">
          <section>
            <h2 className="rx-h2">Stellar network</h2>
            {network ? (
              <Ledger>
                <LedgerRow label="Latest ledger">#{network.ledgerSequence.toLocaleString("en")}</LedgerRow>
                <LedgerRow label="Base fee">{network.baseFeeStroops} stroops</LedgerRow>
                <LedgerRow label="Closed at">{formatTime(network.closedAt)}</LedgerRow>
              </Ledger>
            ) : (
              <p className="rx-small mt-2">{loading ? "Reading the latest ledger…" : "Network status is unavailable right now."}</p>
            )}
          </section>

          {user?.stellarPublicKey && (
            <section>
              <h2 className="rx-h2">Your address</h2>
              <div className="mt-2 flex items-start justify-between gap-2">
                <span className="rx-mono">{user.stellarPublicKey}</span>
                <CopyButton value={user.stellarPublicKey} label="Copy your Stellar address" />
              </div>
              <p className="rx-small mt-2">Share this to receive payments.</p>
            </section>
          )}
        </aside>
      </div>

      {secretKey && (
        <Modal title="Save your secret key">
          <p className="text-[14.5px] leading-[22px] text-ink-2">
            This is the only time it will be shown. Anyone who has it controls the wallet, so keep it somewhere private.
          </p>
          <div className="mt-4 flex items-start justify-between gap-2 rounded-[10px] border border-line-strong bg-paper p-3">
            <span className="rx-mono" data-testid="secret-key">{secretKey}</span>
            <CopyButton value={secretKey} label="Copy secret key" />
          </div>
          <label className="mt-5 flex cursor-pointer items-start gap-3 text-[14.5px] leading-5">
            <input
              type="checkbox"
              checked={keySaved}
              onChange={(e) => setKeySaved(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#111]"
            />
            I&apos;ve saved it somewhere safe.
          </label>
          <button type="button" className="rx-btn rx-btn-primary rx-btn-block mt-5" disabled={!keySaved} onClick={finishActivation}>
            Continue
          </button>
        </Modal>
      )}
    </div>
  );
}
