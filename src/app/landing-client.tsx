"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldCheck, Shield, Landmark, Gauge, PiggyBank, Menu, X } from "lucide-react";
import DotHands from "@/components/DotHands";
import BrandMark from "@/components/BrandMark";

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
  const [menuOpen, setMenuOpen] = useState(false);

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
          <a href="#corridors" className="lnk">Corridors</a>
          <a href="#infrastructure" className="lnk">Security</a>
          <Link href="/legal/privacy" className="lnk">Legal</Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="signin">Sign In</Link>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex md:hidden items-center justify-center w-9 h-9 rounded-full bg-white/80 border border-black/10 text-primary hover:bg-white transition-colors"
              aria-label={menuOpen ? "Close menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Menu */}
        {menuOpen && (
          <div className="absolute top-[72px] inset-x-4 z-40 md:hidden bg-white/95 backdrop-blur-md border border-black/10 rounded-2xl p-4 shadow-lg animate-slide-blur">
            <nav className="flex flex-col gap-1 text-[15px] font-medium text-ink">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg hover:bg-black/5 transition-colors"
              >
                Personal
              </Link>
              <a
                href="#corridors"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg hover:bg-black/5 transition-colors"
              >
                Corridors
              </a>
              <a
                href="#infrastructure"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg hover:bg-black/5 transition-colors"
              >
                Security &amp; Infrastructure
              </a>
              <Link
                href="/legal/privacy"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg hover:bg-black/5 transition-colors"
              >
                Legal &amp; Privacy
              </Link>
              <div className="pt-2 mt-1 border-t border-black/5">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block text-center py-2.5 rounded-full bg-ink text-white font-medium"
                >
                  Sign In / Create Account
                </Link>
              </div>
            </nav>
          </div>
        )}

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
        {/* Corridors */}
        <section id="corridors" className="py-20 px-4 lg:px-8" style={{ background: "#f7f7f5" }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl lg:text-4xl font-medium tracking-[-0.035em] text-primary">
                <span className="text-[#9a9a9a]">Supported</span> Corridors
              </h2>
              <p className="mt-3 text-sm text-[#7b7b7b] flex items-center justify-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${ratesLoading ? "bg-amber-400" : "bg-[#111]"} animate-pulse`}></span>
                Live rates, refreshing every {LIVE_RATE_POLL_MS / 1000}s
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
              {LIVE_CURRENCIES.map((currency) => (
                <div key={currency.code} className="bg-white border border-black/5 p-4 sm:p-6 rounded-2xl text-center transition-transform hover:-translate-y-0.5">
                  <p className="text-base sm:text-lg font-medium tracking-tight text-primary">{currency.code}</p>
                  <p className="text-[11px] sm:text-xs text-[#7b7b7b]">{currency.name}</p>
                  <p className="text-[11px] sm:text-xs font-medium text-[#111] mt-2.5 sm:mt-3 break-words sm:break-normal">
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

        {/* Infrastructure */}
        <section id="infrastructure" className="pb-16 sm:pb-20 px-4 lg:px-8" style={{ background: "#f7f7f5" }}>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
            <div className="md:col-span-2 bg-white border border-black/5 p-6 sm:p-8 rounded-2xl relative overflow-hidden">
              <h3 className="text-lg sm:text-xl font-medium tracking-tight text-primary mb-2 sm:mb-3">Institutional-grade infrastructure</h3>
              <p className="text-xs sm:text-sm text-[#7b7b7b] max-w-md">The same level of security and compliance expected by major financial institutions.</p>
              <div className="mt-5 sm:mt-6 flex flex-wrap gap-4 sm:gap-5 text-xs font-medium text-[#3a3a3a]">
                <span className="flex items-center gap-1.5"><ShieldCheck size={14} />Encryption</span>
                <span className="flex items-center gap-1.5"><Landmark size={14} />Regulated anchors</span>
                <span className="flex items-center gap-1.5"><Shield size={14} />Bank-grade security</span>
              </div>
            </div>
            <div className="bg-[#111] text-white p-6 sm:p-8 rounded-2xl">
              <Gauge size={22} className="mb-3" />
              <h3 className="text-base sm:text-lg font-medium mb-1">Sub-5 second</h3>
              <p className="text-xs sm:text-sm text-white/70">Transactions finalized in seconds, not days.</p>
            </div>
            <div className="bg-white border border-black/5 p-6 sm:p-8 rounded-2xl md:col-span-3 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <PiggyBank size={24} className="text-primary shrink-0" />
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-primary">Zero hidden fees</h3>
                  <p className="text-xs sm:text-sm text-[#7b7b7b]">Exact amounts, total transparency.</p>
                </div>
              </div>
              <div className="cta !mt-2 sm:!mt-0">
                <Link href="/login">Join RemitX</Link>
              </div>
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
        <p className="max-w-6xl mx-auto px-4 lg:px-8 mt-3 text-[10px] text-[#9a9a9a] text-center md:text-left">
          RemitX Technologies Ltd. · 14B Admiralty Way, Lekki Phase 1, Lagos 105102, Nigeria
        </p>
      </footer>
    </>
  );
}
