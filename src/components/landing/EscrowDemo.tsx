"use client";

import { useEffect, useState } from "react";
import { useInView, usePrefersReducedMotion } from "./hooks";

/**
 * Optional escrow, shown as a thing the visitor can try: pick what happens
 * and watch the funds move. Nothing here animates until it is on screen.
 */

type Outcome = "release" | "refund";

const NODE_X = [60, 260, 460];
const PHASE_TEXT = [
  "The sender deposits the transfer into the escrow contract.",
  "The funds are locked on-chain until they are released or the expiry passes.",
];
const END_TEXT: Record<Outcome, string> = {
  release: "Released in time: the recipient receives the funds.",
  refund: "The expiry passed with no release: the sender can reclaim the funds.",
};

export default function EscrowDemo() {
  const [outcome, setOutcome] = useState<Outcome>("release");
  const [run, setRun] = useState(0);
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const reduced = usePrefersReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>(0.4);

  useEffect(() => {
    if (!inView) return;
    const refund = outcome === "refund";
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    at(0, () => { setPos(0); setPhase(0); setElapsed(0); });
    at(350, () => setPos(1));
    at(1500, () => { setPhase(1); setElapsed(refund ? 100 : 38); });
    at(refund ? 4300 : 3000, () => { setPhase(2); setPos(refund ? 0 : 2); });

    return () => timers.forEach(clearTimeout);
  }, [outcome, run, inView]);

  const choose = (o: Outcome) => {
    setOutcome(o);
    setRun((r) => r + 1);
  };

  const shownPhase = reduced ? 2 : phase;
  const text = shownPhase === 2 ? END_TEXT[outcome] : PHASE_TEXT[shownPhase];
  const x = NODE_X[reduced ? (outcome === "release" ? 2 : 0) : pos] ?? NODE_X[0];

  return (
    <div ref={ref} className="lp-escrow">
      <div className="rx-seg" role="group" aria-label="Choose what happens to the escrow">
        <button type="button" aria-pressed={outcome === "release"} onClick={() => choose("release")}>
          Released in time
        </button>
        <button type="button" aria-pressed={outcome === "refund"} onClick={() => choose("refund")}>
          Expires unreleased
        </button>
      </div>

      <svg viewBox="0 0 520 130" className="lp-svg" role="img" aria-label="Funds move from the sender into escrow, then to the recipient or back to the sender">
        <line x1={NODE_X[0]} y1={58} x2={NODE_X[1]} y2={58} className="lp-wire" />
        <line x1={NODE_X[1]} y1={58} x2={NODE_X[2]} y2={58} className="lp-wire" />

        <circle cx={NODE_X[0]} cy={58} r={8} fill="#111" />
        <circle cx={NODE_X[2]} cy={58} r={8} fill={shownPhase === 2 && outcome === "release" ? "#17603c" : "#111"} style={{ transition: "fill .3s" }} />
        <rect x={NODE_X[1] - 26} y={32} width={52} height={52} rx={12} fill="#fff" stroke="#111" strokeWidth={1.5} />
        <path d="M250 62v-7a10 10 0 0 1 20 0v7M247 62h26v14h-26z" fill="none" stroke="#111" strokeWidth={1.6} strokeLinejoin="round" transform="translate(0 -1)" />

        <text x={NODE_X[0]} y={98} textAnchor="middle" className="lp-svg-label lp-svg-strong">Sender</text>
        <text x={NODE_X[1]} y={106} textAnchor="middle" className="lp-svg-label lp-svg-strong">Escrow contract</text>
        <text x={NODE_X[2]} y={98} textAnchor="middle" className="lp-svg-label lp-svg-strong">Recipient</text>

        <g style={{ transform: `translateX(${x}px)`, transition: reduced ? "none" : "transform .95s cubic-bezier(.65,0,.35,1)" }}>
          <circle cx={0} cy={58} r={14} fill="#111" opacity={0.12} />
          <circle cx={0} cy={58} r={5.5} fill="#111" />
        </g>
      </svg>

      <div className="lp-expiry">
        <span className="rx-small">Locked</span>
        <span className="lp-expiry-track" aria-hidden="true">
          <span
            className="lp-expiry-fill"
            data-outcome={outcome}
            style={{
              width: `${reduced ? (outcome === "refund" ? 100 : 38) : elapsed}%`,
              transitionDuration: reduced ? "0s" : outcome === "refund" ? "2.6s" : "1.3s",
            }}
          />
        </span>
        <span className="rx-small">Expiry</span>
      </div>

      <p className="lp-escrow-text" aria-live="polite">{text}</p>
    </div>
  );
}
