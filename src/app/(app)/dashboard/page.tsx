"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Notice from "@/components/ui/Notice";
import CopyButton from "@/components/ui/CopyButton";
import { Ledger, LedgerRow } from "@/components/ui/Ledger";
import TransactionTable, { type TransactionRow } from "@/components/ui/TransactionTable";
import { useWallet } from "@/lib/wallet-context";
import { formatAmount, formatTime } from "@/lib/format";
import { NETWORK_LABEL } from "@/lib/network-label";
import { api } from "@/lib/client-api";

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
  "Approve it in your wallet. It goes out as a Stellar path payment.",
  "The recipient is paid in about five seconds.",
];

export default function OverviewPage() {
  const { address, loaded: walletLoaded, openModal } = useWallet();
  const [loading, setLoading] = useState(true);
  const [activated, setActivated] = useState(false);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [network, setNetwork] = useState<NetworkStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [funding, setFunding] = useState(false);

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
  }, [load, address]);

  // Testnet only: Friendbot sends free test XLM to the connected wallet.
  const fundAccount = async () => {
    setFunding(true);
    setError(null);
    const res = await api("/api/stellar/fund", { method: "POST" });
    setFunding(false);
    if (!res.ok) return setError(res.error);
    await load();
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
          {loading || !walletLoaded ? (
            <div aria-busy="true">
              <span className="rx-skel" style={{ width: 80, height: 14 }} />
              <span className="rx-skel mt-4" style={{ width: 280, height: 52 }} />
            </div>
          ) : !address ? (
            <div className="rx-sheet rx-sheet-pad">
              <h2 className="rx-h2">Connect a Stellar wallet</h2>
              <p className="mt-2 max-w-[52ch] text-[14.5px] leading-[22px] text-muted">
                Your balance is read straight from the Stellar network once you connect. You approve every transfer in your own wallet, and RemitX never sees your secret key.
              </p>
              <button type="button" className="rx-btn rx-btn-primary mt-5" onClick={openModal}>
                Connect wallet
              </button>
            </div>
          ) : !activated ? (
            <div className="rx-sheet rx-sheet-pad">
              <h2 className="rx-h2">This account isn&apos;t funded yet</h2>
              <p className="mt-2 max-w-[52ch] text-[14.5px] leading-[22px] text-muted">
                A new Stellar account exists only after it receives its first XLM. On {NETWORK_LABEL.toLowerCase()}, Friendbot sends free test XLM.
              </p>
              <button type="button" className="rx-btn rx-btn-primary mt-5" onClick={fundAccount} disabled={funding}>
                {funding ? "Requesting…" : "Fund with test XLM"}
              </button>
            </div>
          ) : (
            <div>
              <p className="rx-small">XLM balance</p>
              <p className="rx-figure mt-1 text-[32px] sm:text-[44px] md:text-[56px] break-words">
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

          {address && (
            <section>
              <h2 className="rx-h2">Your address</h2>
              <div className="mt-2 flex items-start justify-between gap-2">
                <span className="rx-mono">{address}</span>
                <CopyButton value={address} label="Copy your Stellar address" />
              </div>
              <p className="rx-small mt-2">Share this to receive payments.</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
