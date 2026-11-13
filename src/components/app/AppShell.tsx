"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeftRight,
  Gauge,
  Landmark,
  LifeBuoy,
  LineChart,
  LogOut,
  MoreHorizontal,
  Send,
  ShieldCheck,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import BrandMark from "@/components/BrandMark";
import CopyButton from "@/components/ui/CopyButton";
import { NETWORK_LABEL } from "@/lib/network-label";
import { truncateMiddle } from "@/lib/format";
import { useWallet } from "@/lib/wallet-context";
import { UserContext, type CurrentUser } from "./user-context";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const OVERVIEW: NavItem = { href: "/dashboard", label: "Overview", icon: Gauge };
const TRANSFERS: NavItem[] = [
  { href: "/send", label: "Send money", icon: Send },
  { href: "/activity", label: "Activity", icon: Activity },
];
const VERIFY: NavItem = { href: "/verify", label: "Verify", icon: ShieldCheck };
const COMPARE: NavItem[] = [
  { href: "/routes", label: "Routes", icon: ArrowLeftRight },
  { href: "/anchors", label: "Anchors", icon: Landmark },
  { href: "/rates", label: "Rates", icon: LineChart },
];
const SUPPORT: NavItem = { href: "/support", label: "Support", icon: LifeBuoy };

const isPlaceholderEmail = (email: string) => email.endsWith("@wallet.remitx.invalid");

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const { address, openModal, disconnect } = useWallet();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return;
      const json = await res.json();
      setUser(json.data.user);
    } catch {
      // The shell still works without a profile; account details just stay blank.
    }
  }, []);

  useEffect(() => {
    // Defer one tick so the fetch result is the only thing that sets state.
    const id = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(id);
  }, [refresh, address]);

  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));

  const signOut = async () => {
    try {
      if (address) await disconnect();
      else await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const link = (item: NavItem, onNavigate?: () => void) => (
    <Link
      key={item.href}
      href={item.href}
      className="rx-navlink"
      aria-current={isActive(item.href) ? "page" : undefined}
      onClick={onNavigate}
    >
      <item.icon size={17} aria-hidden="true" />
      {item.label}
    </Link>
  );

  return (
    <UserContext.Provider value={{ user, refresh }}>
      <div className="rx-app">
        <a href="#content" className="rx-skip">Skip to content</a>

        {/* Desktop rail */}
        <aside className="rx-rail" aria-label="Sidebar">
          <div>
            <Link href="/dashboard" className="rx-brand">
              <BrandMark size={18} />
              RemitX
            </Link>
            <p className="rx-small mt-1 px-[10px]">Stellar {NETWORK_LABEL.toLowerCase()}</p>
          </div>

          <nav aria-label="Main">
            <div className="rx-navgroup">{link(OVERVIEW)}</div>
            <div className="rx-navgroup">
              <p className="rx-navlabel">Transfers</p>
              {TRANSFERS.map((i) => link(i))}
              {link(VERIFY)}
            </div>
            <div className="rx-navgroup">
              <p className="rx-navlabel">Compare</p>
              {COMPARE.map((i) => link(i))}
            </div>
          </nav>

          <div className="rx-account">
            {user ? (
              <>
                <p className="text-[14.5px] font-medium leading-5">
                  {user.firstName} {user.lastName}
                </p>
                <p className="rx-small mt-0.5">Identity check: {user.kycStatus}</p>
                {user.stellarPublicKey && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className="rx-mono" title={user.stellarPublicKey}>
                      {truncateMiddle(user.stellarPublicKey, 5, 5)}
                    </span>
                    <CopyButton value={user.stellarPublicKey} label="Copy your Stellar address" />
                  </div>
                )}
                {!user.stellarPublicKey && (
                  <button type="button" className="rx-btn rx-btn-secondary rx-btn-sm mt-2" onClick={openModal}>
                    <Wallet size={15} aria-hidden="true" /> Connect wallet
                  </button>
                )}
              </>
            ) : (
              <span className="rx-skel" style={{ width: 120, height: 14 }} />
            )}
            <div className="-mx-2.5 mt-3">
              {link(SUPPORT)}
              <button type="button" className="rx-navlink w-full text-left" onClick={signOut}>
                <LogOut size={17} aria-hidden="true" />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="rx-topbar">
          <Link href="/dashboard" className="rx-brand !px-0">
            <BrandMark size={17} />
            RemitX
          </Link>
          <span className="rx-small">{NETWORK_LABEL}</span>
        </header>

        <main id="content" className="rx-main" tabIndex={-1}>
          {children}
        </main>

        {/* Mobile tab bar */}
        <nav className="rx-tabbar" aria-label="Main">
          {[OVERVIEW, TRANSFERS[0], COMPARE[0], TRANSFERS[1]].map((item) => (
            <Link key={item.href} href={item.href} className="rx-tab" aria-current={isActive(item.href) ? "page" : undefined}>
              <item.icon size={20} aria-hidden="true" />
              {item.label === "Send money" ? "Send" : item.label}
            </Link>
          ))}
          <button type="button" className="rx-tab" onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
            <MoreHorizontal size={20} aria-hidden="true" />
            More
          </button>
        </nav>

        {moreOpen && (
          <div className="rx-overlay" onMouseDown={(e) => e.target === e.currentTarget && setMoreOpen(false)}>
            <div className="rx-dialog" role="dialog" aria-modal="true" aria-label="More">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {user && (
                    <>
                      <p className="text-[16px] font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="rx-small">{isPlaceholderEmail(user.email) ? "Signed in with a wallet" : user.email}</p>
                    </>
                  )}
                </div>
                <button type="button" className="rx-iconbtn" onClick={() => setMoreOpen(false)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div className="-mx-2.5 mt-4">
                {[COMPARE[2], COMPARE[1], VERIFY, SUPPORT].map((i) => link(i, () => setMoreOpen(false)))}
                <button type="button" className="rx-navlink w-full text-left" onClick={signOut}>
                  <LogOut size={17} aria-hidden="true" />
                  Sign out
                </button>
              </div>
              {user && !user.stellarPublicKey && (
                <div className="mt-4 border-t border-line pt-4">
                  <button
                    type="button"
                    className="rx-btn rx-btn-secondary rx-btn-block"
                    onClick={() => {
                      setMoreOpen(false);
                      openModal();
                    }}
                  >
                    <Wallet size={16} aria-hidden="true" /> Connect wallet
                  </button>
                </div>
              )}
              {user?.stellarPublicKey && (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="rx-small">Your Stellar address</p>
                  <div className="mt-1 flex items-start justify-between gap-2">
                    <span className="rx-mono">{user.stellarPublicKey}</span>
                    <CopyButton value={user.stellarPublicKey} label="Copy your Stellar address" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </UserContext.Provider>
  );
}
