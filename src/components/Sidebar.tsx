"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftRight, History, Landmark, LayoutDashboard, LifeBuoy, LineChart, LogOut, Send, ShieldCheck, X } from "lucide-react";
import BrandMark from "./BrandMark";
import { useWallet } from "@/lib/wallet-context";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/send", icon: Send, label: "Send money" },
  { href: "/routes", icon: ArrowLeftRight, label: "Compare routes" },
  { href: "/anchors", icon: Landmark, label: "Anchors" },
  { href: "/rates", icon: LineChart, label: "Rates" },
  { href: "/activity", icon: History, label: "Activity" },
];
const SECONDARY = [
  { href: "/verify", icon: ShieldCheck, label: "Verify a transfer" },
  { href: "/support", icon: LifeBuoy, label: "Support" },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { disconnect } = useWallet();

  const active = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));
  const link = (item: (typeof NAV)[number]) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={onClose}
      aria-current={active(item.href) ? "page" : undefined}
      className={`flex items-center gap-3 border-l-2 px-5 py-2 text-[0.9375rem] transition-colors ${
        active(item.href) ? "border-accent bg-surface font-semibold text-ink" : "border-transparent text-muted hover:text-ink"
      }`}
    >
      <item.icon size={17} aria-hidden /> {item.label}
    </Link>
  );

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-sidebar flex-col border-r border-rule bg-paper py-4 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Main"
      >
        <div className="mb-6 flex items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
            <BrandMark size={20} className="text-ink" /> RemitX
          </Link>
          <button className="btn btn-quiet lg:hidden" onClick={onClose} aria-label="Close menu"><X size={18} /></button>
        </div>
        <nav className="flex-1">{NAV.map(link)}</nav>
        <nav className="border-t border-rule pt-3">
          {SECONDARY.map(link)}
          <button
            className="flex w-full items-center gap-3 border-l-2 border-transparent px-5 py-2 text-[0.9375rem] text-muted hover:text-ink"
            onClick={async () => { await disconnect(); router.push("/login"); router.refresh(); }}
          >
            <LogOut size={17} aria-hidden /> Sign out
          </button>
        </nav>
      </aside>
    </>
  );
}
