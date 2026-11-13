"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import RouteTrace from "@/components/ui/RouteTrace";
import { fmt, useCountUp, useInView, usePrefersReducedMotion, useTyped } from "./hooks";

/**
 * The one orchestrated moment on the landing page: five steps of a transfer,
 * each with its own small stage. Steps advance on their own once the section
 * is on screen, and stop for good the moment the visitor picks one.
 */

const STEPS = [
  {
    title: "Find the best route",
    body: "RemitX asks Stellar to search its order books and liquidity pools for every way to turn your currency into theirs, then ranks the results by what the recipient actually receives.",
  },
  {
    title: "See the whole cost first",
    body: "Before anything is signed you get a line-by-line breakdown: the rate, the network fee, and the minimum your recipient is guaranteed to get.",
  },
  {
    title: "Approve it in your wallet",
    body: "We build the payment, your own wallet signs it. Your secret key never reaches our servers, and we check that the signed payment matches your quote before it goes out.",
  },
  {
    title: "It settles in one ledger close",
    body: "Stellar confirms payments about every five seconds. There is no chain of correspondent banks in the middle and no waiting for the next business day.",
  },
  {
    title: "Check the receipt, anywhere",
    body: "Every transfer gets a public receipt you can look up by transaction hash, no account needed. Your own history exports to CSV or JSON.",
  },
] as const;

const STEP_MS = 7000;
const SEND_AMOUNT = 100;
const MIN_SLIPPAGE = 0.01; // matches destMin = quote minus 1% in the send flow

export default function TransferStage({ rate }: { rate?: number }) {
  const [active, setActive] = useState(0);
  const [run, setRun] = useState(0);
  const [auto, setAuto] = useState(true);
  const reduced = usePrefersReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>(0.35);

  const playing = auto && inView && !reduced;

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, active]);

  const pick = (i: number) => {
    setAuto(false);
    setActive(i);
    setRun((r) => r + 1);
  };

  return (
    <div ref={ref} className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
      <ol className="lp-steps" aria-label="How a RemitX transfer works">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              className="lp-step"
              aria-current={i === active ? "step" : undefined}
              data-playing={i === active && playing ? "true" : undefined}
              onClick={() => pick(i)}
              style={{ ["--dur" as string]: `${STEP_MS}ms` }}
            >
              <span className="lp-step-n">{i + 1}</span>
              <span className="lp-step-text">
                <span className="lp-step-title">{s.title}</span>
                <span className="lp-step-body">{s.body}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="lp-stage" role="group" aria-label={`Step ${active + 1}: ${STEPS[active].title}`}>
        <div key={`${active}-${run}`} className="lp-stage-inner">
          {active === 0 && <PathFinding />}
          {active === 1 && <CostBreakdown rate={rate} reduced={reduced} />}
          {active === 2 && <WalletSigning />}
          {active === 3 && <Settlement />}
          {active === 4 && <Receipt rate={rate} reduced={reduced} />}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Path-finding                                                            */
/* -------------------------------------------------------------------------- */

type Pt = [number, number];

function dotsAlong(points: Pt[], gap = 9) {
  const out: { x: number; y: number }[] = [];
  for (let s = 0; s < points.length - 1; s++) {
    const [x0, y0] = points[s];
    const [x1, y1] = points[s + 1];
    const n = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0) / gap));
    for (let k = s === 0 ? 0 : 1; k <= n; k++) {
      const t = k / n;
      out.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t });
    }
  }
  return out;
}

const FROM: Pt = [56, 150];
const TO: Pt = [464, 150];
const HOPS: { label: string; p: Pt }[] = [
  { label: "XLM", p: [260, 52] },
  { label: "USDC", p: [260, 150] },
  { label: "EURC", p: [260, 248] },
];
const WINNER = 0;

function PathFinding() {
  return (
    <>
      <svg viewBox="0 0 520 300" className="lp-svg" role="img" aria-label="Several possible routes from US dollars to Nigerian naira are explored, and the one that pays out most is kept">
        {HOPS.map((h, i) =>
          dotsAlong([FROM, h.p, TO]).map((d, k) => (
            <circle
              key={`${i}-${k}`}
              cx={d.x}
              cy={d.y}
              r={2}
              className={i === WINNER ? "lp-dot" : "lp-dot lp-lose"}
              style={{ ["--d" as string]: `${(i * 0.9 + k * 0.028).toFixed(3)}s` }}
            />
          ))
        )}
        {HOPS.map((h) => (
          <g key={h.label}>
            <circle cx={h.p[0]} cy={h.p[1]} r={6} fill="#fff" stroke="#111" strokeWidth={1.5} />
            <text x={h.p[0] + 14} y={h.p[1] + 4} className="lp-svg-label">{h.label}</text>
          </g>
        ))}
        {[FROM, TO].map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={7} fill="#111" />
        ))}
        <text x={FROM[0]} y={FROM[1] + 28} textAnchor="middle" className="lp-svg-label lp-svg-strong">USD</text>
        <text x={TO[0]} y={TO[1] + 28} textAnchor="middle" className="lp-svg-label lp-svg-strong">NGN</text>
        <text x={260} y={20} textAnchor="middle" className="lp-svg-label lp-fade" style={{ ["--d" as string]: "3.9s", fill: "#17603c" }}>
          Pays the recipient the most
        </text>
      </svg>
      <p className="lp-caption">
        Illustration. RemitX explores the paths through Stellar&rsquo;s markets and keeps whichever pays out the most at that moment.
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Cost breakdown                                                          */
/* -------------------------------------------------------------------------- */

function CostBreakdown({ rate, reduced }: { rate?: number; reduced: boolean }) {
  const receive = rate ? SEND_AMOUNT * rate : undefined;
  const counted = useCountUp(receive ?? 0, 1100, 1100, reduced);
  const minimum = receive ? receive * (1 - MIN_SLIPPAGE) : undefined;

  const rows: { k: string; v: React.ReactNode; total?: boolean; muted?: boolean }[] = [
    { k: "You send", v: `${fmt(SEND_AMOUNT)} USD` },
    { k: "Rate", v: rate ? `1 USD = ${fmt(rate)} NGN` : "Loading live rate…" },
    { k: "Network fee", v: "0.00001 XLM" },
    { k: "RemitX fee", v: "None" },
    { k: "Recipient gets", v: receive ? `${fmt(counted)} NGN` : "—", total: true },
    { k: "Guaranteed minimum", v: minimum ? `${fmt(minimum)} NGN` : "—", muted: true },
  ];

  return (
    <>
      <dl className="rx-ledger">
        {rows.map((r, i) => (
          <div
            key={r.k}
            className="rx-leader rx-tnum lp-reveal"
            data-total={r.total ? "true" : undefined}
            style={{ ["--i" as string]: i }}
          >
            <dt style={r.muted ? { color: "var(--color-faint)" } : undefined}>{r.k}</dt>
            <dd style={r.muted ? { color: "var(--color-muted)" } : undefined}>{r.v}</dd>
          </div>
        ))}
      </dl>
      <p className="lp-caption">
        Example for {fmt(SEND_AMOUNT)} USD at the live rate. The minimum is written into the transaction itself: if the market moves past it, the payment does not go through at a worse price. Anchors that handle cash in or out charge their own fees, shown separately.
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Wallet signing                                                          */
/* -------------------------------------------------------------------------- */

function WalletSigning() {
  return (
    <>
      <svg viewBox="0 0 520 250" className="lp-svg" role="img" aria-label="RemitX sends an unsigned payment to your wallet, the wallet signs it, and RemitX checks the signature matches your quote">
        <rect x={16} y={62} width={150} height={112} rx={14} fill="#fff" stroke="#cfcfc7" />
        <rect x={354} y={62} width={150} height={112} rx={14} fill="#fff" stroke="#111" strokeWidth={1.5} />
        <text x={91} y={106} textAnchor="middle" className="lp-svg-label lp-svg-strong">RemitX</text>
        <text x={91} y={128} textAnchor="middle" className="lp-svg-label">builds the payment</text>
        <text x={429} y={96} textAnchor="middle" className="lp-svg-label lp-svg-strong">Your wallet</text>

        {/* signature that draws itself */}
        <path
          d="M384 138 q9 -20 16 0 t16 0 t16 0 t16 0"
          fill="none"
          stroke="#111"
          strokeWidth={2}
          strokeLinecap="round"
          pathLength={100}
          className="lp-draw"
        />

        {/* unsigned out, signed back */}
        <line x1={178} y1={96} x2={342} y2={96} className="lp-wire" />
        <line x1={342} y1={140} x2={178} y2={140} className="lp-wire" />
        <text x={260} y={84} textAnchor="middle" className="lp-svg-small">Unsigned payment</text>
        <text x={260} y={162} textAnchor="middle" className="lp-svg-small">Signed payment</text>
        <circle cx={178} cy={96} r={4.5} fill="#111" className="lp-fly lp-fly-r" />
        <circle cx={342} cy={140} r={4.5} fill="#111" className="lp-fly lp-fly-l" />

        <text x={429} y={204} textAnchor="middle" className="lp-svg-small">Secret key never leaves it</text>
        <g className="lp-pop" style={{ ["--d" as string]: "4.2s" }}>
          <circle cx={91} cy={198} r={9} fill="#e8f1ea" />
          <path d="M86.5 198.2l3.2 3.2 6-6.4" fill="none" stroke="#17603c" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <text x={108} y={202} className="lp-svg-small" style={{ fill: "#17603c" }}>Matches your quote</text>
        </g>
      </svg>
      <p className="lp-caption">
        Sign-in works the same way: a SEP-10 challenge that your wallet signs. Albedo, xBull, Freighter, Rabet, Hana and others are supported.
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Settlement                                                              */
/* -------------------------------------------------------------------------- */

function Settlement() {
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setConfirmed(true), 3300);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <div className="lp-trace">
        <RouteTrace nodes={["USD", "XLM", "NGN"]} />
      </div>
      <div className="lp-settle-row">
        <svg viewBox="0 0 44 44" width={44} height={44} aria-hidden="true">
          <circle cx={22} cy={22} r={18} fill="none" stroke="#e4e4df" strokeWidth={3} />
          <circle cx={22} cy={22} r={18} fill="none" stroke="#111" strokeWidth={3} strokeLinecap="round" pathLength={100} className="lp-ring" transform="rotate(-90 22 22)" />
        </svg>
        <p className="lp-settle-text">A Stellar ledger closes roughly every five seconds. Your payment lands in the next one.</p>
        <span className="rx-status" data-state={confirmed ? "confirmed" : "validating"}>
          {confirmed ? "Confirmed" : "Validating"}
        </span>
      </div>
      <p className="lp-caption">
        That is the on-chain leg. Cashing out to a bank or mobile wallet through a local anchor can take longer, depending on the anchor.
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Receipt                                                                 */
/* -------------------------------------------------------------------------- */

const SAMPLE_HASH = "5d1b9c07e3a4f28b61c0";

function Receipt({ rate, reduced }: { rate?: number; reduced: boolean }) {
  const { shown, done } = useTyped(SAMPLE_HASH, 500, 70, reduced);
  const received = rate ? `${fmt(SEND_AMOUNT * rate)} NGN` : "—";

  return (
    <>
      <div className="lp-verify" aria-label="Verify a transaction by hash">
        <span className="rx-small">Transaction hash</span>
        <span className="rx-mono rx-mono-nowrap lp-verify-input">
          {shown}
          {!done && <span className="lp-caret" aria-hidden="true" />}
        </span>
      </div>
      <div className="lp-receipt" data-open={done ? "true" : undefined}>
        <div className="lp-receipt-flag">
          <span className="lp-receipt-check"><Check size={14} strokeWidth={2.4} /></span>
          Found on the Stellar ledger
        </div>
        <dl className="rx-ledger rx-tnum">
          <div className="rx-leader"><dt>Status</dt><dd><span className="rx-status" data-state="confirmed">Confirmed</span></dd></div>
          <div className="rx-leader"><dt>Sent</dt><dd>{fmt(SEND_AMOUNT)} USD</dd></div>
          <div className="rx-leader"><dt>Received</dt><dd>{received}</dd></div>
          <div className="rx-leader"><dt>Network fee</dt><dd>0.00001 XLM</dd></div>
        </dl>
      </div>
      <p className="lp-caption">
        Example hash and amounts. Receipts are public by design and show the transfer, never a key.
      </p>
    </>
  );
}
