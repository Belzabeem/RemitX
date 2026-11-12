"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DotHands from "@/components/DotHands";
import BrandMark from "@/components/BrandMark";
import TransferStage from "@/components/landing/TransferStage";
import EscrowDemo from "@/components/landing/EscrowDemo";

const LIVE_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "GBP", name: "British Pound" },
  { code: "PHP", name: "Philippine Peso" },
];

const LIVE_RATE_POLL_MS = 15_000;

export default function LandingClient() {
  const [cardRates, setCardRates] = useState<Record<string, number>>({});
  const [ratesLoading, setRatesLoading] = useState(true);

  // Real, always-live currency rates - no static/example numbers.
  useEffect(() => {
    let ignore = false;

    const loadLiveRates = async () => {
      try {
        const results = await Promise.all(
          LIVE_CURRENCIES.filter((c) => c.code !== "USD").map(async (c) => {
            const res = await fetch(`/api/public/rate?from=USD&to=${c.code}`);
            const json = await res.json();
            return { code: c.code, rate: res.ok ? parseFloat(json.data.rate) : null };
          })
        );
        if (ignore) return;

        const next: Record<string, number> = {};
        for (const r of results) {
          if (r.rate !== null) next[r.code] = r.rate;
        }
        setCardRates(next);
      } catch {
        // Keep last known values on a transient failure
      } finally {
        if (!ignore) setRatesLoading(false);
      }
    };

    loadLiveRates();
    const interval = setInterval(loadLiveRates, LIVE_RATE_POLL_MS);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  const ticker = LIVE_CURRENCIES.filter((c) => c.code !== "USD");

  return (
    <>
      <section className="hero">
        <DotHands />

        <nav className="hero-nav">
          <Link href="/" className="hero-brand">
            <BrandMark size={18} />
            RemitX
          </Link>
          <Link href="/login" className="lnk">Personal</Link>
          <a href="#how-it-works" className="lnk">How it works</a>
          <a href="#corridors" className="lnk">Corridors</a>
          <a href="#infrastructure" className="lnk">Security</a>
          <Link href="/legal/privacy" className="lnk">Legal</Link>
          <Link href="/login" className="signin">Sign In</Link>
        </nav>

        <div className="hero-copy">
          <h1>
            <span>Moving Money</span>
            Across Borders.
          </h1>
          <p>Instant cross-border settlements on Stellar, with 99% lower fees than banks.</p>
          <div className="cta">
            <Link href="/login">Get started</Link>
          </div>
        </div>

        <div className="hero-logos">
          {ticker.map((c) => (
            <div key={c.code}>
              <span>USD → {c.code}</span>
              <span style={{ color: "#111" }}>
                {cardRates[c.code]
                  ? cardRates[c.code].toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : "…"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <main>
        {/* What RemitX is, and what is wrong with the usual way */}
        <section id="what" className="py-24 px-4 lg:px-8" style={{ background: "#f7f7f5" }}>
          <div className="lp-wrap">
            <h2 className="lp-h2">
              <span>The old way hides the cost.</span>
              This way shows it first.
            </h2>
            <p className="lp-lede">
              RemitX is a cross-border payments app built on Stellar, a public ledger designed for moving value between
              currencies. You pick an amount and a destination currency. RemitX finds the best path through Stellar&rsquo;s
              markets, shows you every cost, and sends the payment from your own wallet.
            </p>

            <dl className="lp-compare">
              <div className="lp-compare-head" aria-hidden="true">
                <span />
                <span>Through a typical bank</span>
                <span>Through RemitX</span>
              </div>
              {[
                ["Exchange rate", "Often marked up, with the margin folded into the rate.", "Taken from live Stellar markets and shown before you sign."],
                ["Fees", "Several banks in a chain can each take a cut.", "One network fee, and no RemitX platform fee on direct payments."],
                ["Time", "Commonly one to several business days.", "One ledger close, about five seconds."],
                ["Custody", "Your money sits with intermediaries along the way.", "Your wallet signs the payment. Your keys never leave it."],
              ].map(([term, old, now]) => (
                <div key={term} className="lp-compare-row">
                  <dt>{term}</dt>
                  <dd className="old m-0">{old}</dd>
                  <dd className="new m-0">{now}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* How a transfer works: the animated stage */}
        <section id="how-it-works" className="pb-24 px-4 lg:px-8" style={{ background: "#f7f7f5" }}>
          <div className="lp-wrap">
            <h2 className="lp-h2 mb-12">
              <span>Follow one transfer</span>
              from your wallet to theirs.
            </h2>
            <TransferStage rate={cardRates.NGN} />
          </div>
        </section>

        {/* Corridors */}
        <section id="corridors" className="py-20 px-4 lg:px-8" style={{ background: "#efeee9" }}>
          <div className="lp-wrap">
            <h2 className="lp-h2">
              <span>Supported</span>
              Corridors
            </h2>
            <p className="mt-4 text-sm text-[#6b6b66] flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${ratesLoading ? "bg-amber-400" : "bg-[#111]"} animate-pulse`}></span>
              Live rates, refreshing every {LIVE_RATE_POLL_MS / 1000}s
            </p>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
              {LIVE_CURRENCIES.map((currency) => (
                <div key={currency.code} className="bg-white border border-black/5 p-6 rounded-2xl">
                  <p className="text-lg font-medium tracking-tight text-primary">{currency.code}</p>
                  <p className="text-xs text-[#7b7b7b]">{currency.name}</p>
                  <p className="text-xs font-medium text-[#111] mt-3">
                    {currency.code === "USD"
                      ? "Base currency"
                      : cardRates[currency.code]
                      ? `1 USD = ${cardRates[currency.code].toLocaleString(undefined, { maximumFractionDigits: 4 })}`
                      : "Loading…"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Beyond a straight transfer: escrow and anchors */}
        <section id="escrow" className="py-24 px-4 lg:px-8" style={{ background: "#f7f7f5" }}>
          <div className="lp-wrap grid gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <h2 className="lp-h2">
                <span>Optional escrow.</span>
                A safety net for the sender.
              </h2>
              <p className="lp-lede">
                For transfers that need one, funds can be locked in a Soroban smart contract with an expiry time instead of
                going straight to the recipient. If the transfer is not released before the deadline, the sender can refund
                it. A wrong address or a failed delivery stops being a lost payment.
              </p>
              <p className="mt-4 text-[13px] leading-relaxed text-[#6b6b66] max-w-[54ch]">
                The escrow contract is written and tested. Its testnet deployment is still pending.
              </p>
            </div>
            <div className="bg-white border border-[#e4e4df] rounded-2xl p-6 md:p-8">
              <EscrowDemo />
            </div>
          </div>

          <div className="lp-wrap mt-24 max-w-3xl lg:mx-0">
            <h3 className="text-2xl font-medium tracking-[-0.03em] text-primary">Cash in and cash out through anchors</h3>
            <p className="lp-lede" style={{ marginTop: 12 }}>
              Anchors are the businesses that turn local money into Stellar assets and back. RemitX reads each anchor&rsquo;s
              published details over the SEP-24 standard, lists their corridors, fees and settlement times side by side,
              and fails gracefully when one of them is down.
            </p>
          </div>
        </section>

        {/* Why you can trust it */}
        <section id="infrastructure" className="pb-24 px-4 lg:px-8" style={{ background: "#f7f7f5" }}>
          <div className="lp-wrap">
            <h2 className="lp-h2">
              <span>Built so you never have to</span>
              hand us your keys.
            </h2>
            <dl className="lp-facts">
              <div className="lp-fact">
                <dt>Your keys stay in your wallet</dt>
                <dd>Sign-in is a challenge your wallet signs, and every payment is signed there too. The server never sees a secret key. Albedo, xBull, Freighter, Rabet, Hana, LOBSTR and more connect through Stellar Wallets Kit.</dd>
              </div>
              <div className="lp-fact">
                <dt>A guaranteed minimum on every transfer</dt>
                <dd>Each payment carries a floor, 1% under the quote, written into the transaction itself. If the market moves past it, the payment does not go through at a worse price.</dd>
              </div>
              <div className="lp-fact">
                <dt>Checked before it is submitted</dt>
                <dd>The signed payment is compared with your quote before it reaches the network: the source, the recipient, the amount, and that it is a single payment operation.</dd>
              </div>
              <div className="lp-fact">
                <dt>Receipts anyone can verify</dt>
                <dd>Every transfer can be looked up by transaction hash on a public page. Your own history exports as CSV or JSON.</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Honest status */}
        <section id="status" className="pb-24 px-4 lg:px-8" style={{ background: "#f7f7f5" }}>
          <div className="lp-wrap">
            <h2 className="lp-h2">
              <span>Where RemitX is today.</span>
              A testnet prototype.
            </h2>
            <p className="lp-lede">
              RemitX runs on the Stellar test network. The smart contracts have not been externally audited, so please do
              not use real funds. Mainnet comes only after an audit.
            </p>
            <div className="lp-status">
              <div className="done">
                <h3>Built</h3>
                <ul>
                  <li>Wallet sign-in and non-custodial sending</li>
                  <li>Route discovery with a full cost breakdown</li>
                  <li>SEP-24 anchor lookup</li>
                  <li>Public receipt verification, CSV and JSON export</li>
                  <li>Escrow, exchange, staking and governance contracts, with tests</li>
                </ul>
              </div>
              <div>
                <h3>Next</h3>
                <ul>
                  <li>Verify routing and sending end to end on live testnet</li>
                  <li>Deploy the contracts to testnet</li>
                  <li>Production database</li>
                  <li>Real SEP-24 deposit and withdrawal flows</li>
                  <li>External security audit, then mainnet</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Close */}
        <section className="lp-band py-24 px-4 lg:px-8">
          <div className="lp-wrap">
            <h2 className="lp-h2">
              <span>See the cost before you commit.</span>
              Send your first transfer.
            </h2>
            <div className="cta">
              <Link href="/login">Join RemitX</Link>
            </div>
          </div>
        </section>
      </main>


      <footer className="w-full py-6 border-t border-black/5" style={{ background: "#f7f7f5" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center px-4 lg:px-8 gap-3 text-xs text-[#9a9a9a]">
          <span>© 2026 RemitX. Powered by Stellar.</span>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link href="/legal/privacy" className="hover:text-black transition-colors">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-black transition-colors">Terms</Link>
            <Link href="/legal/compliance" className="hover:text-black transition-colors">Compliance</Link>
            <Link href="/legal/security" className="hover:text-black transition-colors">Security</Link>
          </div>
        </div>
        
      </footer>
    </>
  );
}
