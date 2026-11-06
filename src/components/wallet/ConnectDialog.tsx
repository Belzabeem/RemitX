"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";

function WalletIcon({ src, name, muted }: { src: string; name: string; muted?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return <span className="flex h-7 w-7 items-center justify-center rounded bg-paper text-sm font-semibold text-muted" aria-hidden>{name.charAt(0)}</span>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={28} height={28} className={`rounded ${muted ? "grayscale" : ""}`} onError={() => setFailed(true)} />;
}

export default function ConnectDialog() {
  const { modalOpen, closeModal, wallets, connect, phase, error } = useWallet();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (modalOpen && !el.open) el.showModal();
    if (!modalOpen && el.open) el.close();
  }, [modalOpen]);

  const busy = phase === "connecting" || phase === "signing-in";
  const available = wallets.filter((w) => w.isAvailable);
  const missing = wallets.filter((w) => !w.isAvailable);

  return (
    <dialog ref={ref} className="sheet" onClose={closeModal} onClick={(e) => e.target === ref.current && !busy && closeModal()} aria-labelledby="connect-title">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="connect-title" className="text-xl font-semibold">Connect a wallet</h2>
            <p className="mt-1 text-sm text-muted">
              You approve every transfer in your wallet. RemitX never sees your secret key.
            </p>
          </div>
          <button className="btn btn-quiet" onClick={closeModal} aria-label="Close" disabled={busy}>
            <X size={18} />
          </button>
        </div>

        <div className="mt-5" aria-live="polite">
          {busy && (
            <p className="rounded-md bg-accent-wash px-3 py-2 text-sm text-accent-ink">
              {phase === "connecting"
                ? "Waiting for your wallet. Approve the connection in its window."
                : "Sign the sign-in request in your wallet. It proves the account is yours and is never sent to the network."}
            </p>
          )}
          {error && !busy && <p role="alert" className="rounded-md bg-danger-wash px-3 py-2 text-sm text-danger">{error}</p>}
        </div>

        <ul className="mt-4 divide-y divide-rule border-y border-rule">
          {wallets.length === 0 && <li className="py-4 text-sm text-muted">Looking for wallets…</li>}
          {available.map((w) => (
            <li key={w.id}>
              <button className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-paper disabled:opacity-50" disabled={busy} onClick={() => connect(w.id)}>
                <WalletIcon src={w.icon} name={w.name} />
                <span className="flex-1 font-semibold">{w.name}</span>
                <span className="text-sm text-muted">Connect</span>
              </button>
            </li>
          ))}
          {missing.map((w) => (
            <li key={w.id} className="flex items-center gap-3 py-3 opacity-80">
              <WalletIcon src={w.icon} name={w.name} muted />
              <span className="flex-1">{w.name}</span>
              <a className="text-sm font-semibold text-accent underline-offset-2 hover:underline" href={w.url} target="_blank" rel="noreferrer">Get it</a>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm text-muted">
          New to Stellar wallets? Albedo runs in your browser with nothing to install. RemitX currently runs on the Stellar test network only, so set your wallet to Testnet.
        </p>
      </div>
    </dialog>
  );
}
