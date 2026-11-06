"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import Notice from "@/components/ui/Notice";
import { useWallet } from "@/lib/wallet-context";

function WalletIcon({ src, name, muted }: { src: string; name: string; muted?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <span className="rx-walleticon grid place-items-center bg-line text-[13px] font-medium text-muted" aria-hidden="true">
        {name.charAt(0)}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={28} height={28} className={`rx-walleticon ${muted ? "grayscale" : ""}`} onError={() => setFailed(true)} />;
}

/** Choose a Stellar wallet. Every transfer is approved in the wallet; RemitX never sees a secret key. */
export default function ConnectDialog() {
  const { modalOpen, closeModal, wallets, connect, phase, error } = useWallet();
  const busy = phase === "connecting" || phase === "signing-in";

  // Keep the dialog from being dismissed while the wallet is mid-request.
  const busyRef = useRef(busy);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  const close = useCallback(() => {
    if (!busyRef.current) closeModal();
  }, [closeModal]);

  if (!modalOpen) return null;

  const available = wallets.filter((w) => w.isAvailable);
  const missing = wallets.filter((w) => !w.isAvailable);

  return (
    <Modal title="Connect a wallet" onClose={close}>
      <p className="text-[14.5px] leading-[22px] text-ink-2">
        You approve every transfer in your wallet. RemitX never sees your secret key.
      </p>

      <div className="mt-4 space-y-3" aria-live="polite">
        {busy && (
          <Notice tone="neutral" role="status">
            {phase === "connecting"
              ? "Waiting for your wallet. Approve the connection in its window."
              : "Sign the sign-in request in your wallet. It proves the account is yours and is never sent to the network."}
          </Notice>
        )}
        {error && !busy && <Notice tone="danger">{error}</Notice>}
      </div>

      <ul className="mt-4 border-b border-line">
        {wallets.length === 0 && <li className="rx-small border-t border-line py-4">Looking for wallets…</li>}
        {available.map((w) => (
          <li key={w.id} className="border-t border-line">
            <button type="button" className="rx-walletrow" disabled={busy} onClick={() => void connect(w.id)}>
              <WalletIcon src={w.icon} name={w.name} />
              <span className="flex-1 text-[15px] font-medium">{w.name}</span>
              <span className="rx-small">Connect</span>
            </button>
          </li>
        ))}
        {missing.map((w) => (
          <li key={w.id} className="rx-walletrow border-t border-line" data-missing="true">
            <WalletIcon src={w.icon} name={w.name} muted />
            <span className="flex-1 text-[15px] text-muted">{w.name}</span>
            <a className="rx-link text-[14px]" href={w.url} target="_blank" rel="noreferrer">
              Get it
            </a>
          </li>
        ))}
      </ul>

      <p className="rx-small mt-4">
        New to Stellar wallets? Albedo runs in your browser with nothing to install. RemitX runs on the Stellar test network only, so set your wallet to Testnet.
      </p>
      <button type="button" className="rx-btn rx-btn-quiet rx-btn-block mt-4" onClick={close} disabled={busy}>
        Cancel
      </button>
    </Modal>
  );
}
