"use client";

import { useState } from "react";
import { Check, Copy, LogOut, Wallet } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { shortAddress } from "@/lib/client-api";

export default function WalletChip({ onDisconnected }: { onDisconnected?: () => void }) {
  const { address, loaded, openModal, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);

  if (!loaded) return <div className="h-10 w-36" aria-hidden />;
  if (!address) {
    return (
      <button className="btn btn-primary" onClick={openModal}>
        <Wallet size={16} /> Connect wallet
      </button>
    );
  }
  return (
    <details className="relative">
      <summary className="btn btn-outline cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="h-2 w-2 rounded-full bg-settled" aria-hidden />
        <span className="mono">{shortAddress(address)}</span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-64 rounded-md border border-rule bg-surface p-2 shadow-sm">
        <p className="px-2 py-1 text-xs text-muted">Signed in with Stellar testnet account</p>
        <p className="mono break-all px-2 pb-2 text-xs">{address}</p>
        <button
          className="btn btn-quiet w-full justify-start"
          onClick={async () => {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy address"}
        </button>
        <button className="btn btn-quiet w-full justify-start" onClick={async () => { await disconnect(); onDisconnected?.(); }}>
          <LogOut size={16} /> Disconnect
        </button>
      </div>
    </details>
  );
}
