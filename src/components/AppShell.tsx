"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import WalletChip from "./wallet/WalletChip";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-sidebar">
        <header className="sticky top-0 z-30 flex h-topbar items-center justify-between border-b border-rule bg-paper/95 px-4 backdrop-blur sm:px-8">
          <button className="btn btn-quiet lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <span className="pill pill-pending hidden sm:inline-flex" title="No real money moves on this network">Stellar testnet</span>
          <WalletChip />
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
