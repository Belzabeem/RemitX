"use client";

/**
 * Wallet connection for RemitX.
 *
 * Connect -> the wallet reveals its public key -> the wallet signs a SEP-10
 * challenge (never submitted to the network) -> the server starts a session.
 * Transfers are signed in the wallet; RemitX never sees a secret key.
 *
 * Supported wallets (Stellar Wallets Kit): Albedo, xBull, Freighter, Rabet,
 * Hana. Filtered in loadKit() below.
 *
 * Roadmap / issue candidates:
 *   - frontend#varial-wallet — Add Varial wallet support
 *     (https://github.com/stellar/varial) alongside Stellar Wallets Kit.
 *   - frontend#smart-accounts — Add Smart Accounts (passkeys) support for
 *     passwordless wallet onboarding per Stellar best practices.
 *   - frontend#wallet-switch-network — Add UI to switch wallet between
 *     testnet and mainnet when mainnet is enabled.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./client-api";

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const LAST_WALLET_KEY = "remitx.lastWallet";

export interface WalletOption {
  id: string;
  name: string;
  icon: string;
  url: string;
  isAvailable: boolean;
}

type Phase = "idle" | "connecting" | "signing-in" | "error";

interface WalletContextValue {
  /** Public key of the signed-in wallet, or null. */
  address: string | null;
  walletName: string | null;
  phase: Phase;
  error: string | null;
  wallets: WalletOption[];
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  connect: (walletId: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  signTransaction: (xdr: string, networkPassphrase: string) => Promise<string>;
  /** Re-reads the signed-in account (call after server-side changes). */
  refresh: () => Promise<void>;
  loaded: boolean;
}

const WalletContext = createContext<WalletContextValue | null>(null);

type Kit = (typeof import("@creit.tech/stellar-wallets-kit/sdk"))["StellarWalletsKit"];
let kitPromise: Promise<Kit> | null = null;

function loadKit(): Promise<Kit> {
  if (!kitPromise) {
    kitPromise = (async () => {
      const [{ StellarWalletsKit }, { defaultModules }] = await Promise.all([
        import("@creit.tech/stellar-wallets-kit/sdk"),
        import("@creit.tech/stellar-wallets-kit/modules/utils"),
      ]);
      // Browser/extension wallets that sign locally. Wallets that need a relay service
      // (WalletConnect) or hardware are left out until those origins are allowed.
      // TODO: frontend#varial-wallet — Add Varial as a first-class wallet option
      // (currently filtered in above; uncomment/add Varial module when ready).
      StellarWalletsKit.init({
        modules: defaultModules({ filterBy: (m) => /albedo|xbull|varial|freighter|rabet|hana/i.test(m.productId + m.productName) }),
      });
      return StellarWalletsKit;
    })();
  }
  return kitPromise;
}

function describeError(err: unknown): string {
  const message = typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : "";
  if (/reject|denied|declin|cancel|closed/i.test(message)) return "You closed the wallet before approving. Try again when you're ready.";
  if (/not (installed|found|available)|undefined/i.test(message)) return "That wallet isn't available in this browser. Install it, then try again.";
  return message || "The wallet didn't respond. Try again.";
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const activeWallet = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await api<{ user: { stellarPublicKey: string | null } }>("/api/auth/me");
    setAddress(res.ok ? res.data.user.stellarPublicKey : null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // Initial read of the existing session; setState happens after the awaited fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const loadWallets = useCallback(async () => {
    try {
      const kit = await loadKit();
      const list = await kit.refreshSupportedWallets();
      setWallets(list.map((w) => ({ id: w.id, name: /varial/i.test(w.name) ? "Freighter (Varial)" : w.name, icon: w.icon, url: w.url, isAvailable: w.isAvailable })));
    } catch {
      setWallets([]);
    }
  }, []);

  const openModal = useCallback(() => {
    setError(null);
    setPhase("idle");
    setModalOpen(true);
    void loadWallets();
  }, [loadWallets]);

  const closeModal = useCallback(() => setModalOpen(false), []);

  const connect = useCallback(async (walletId: string) => {
    setError(null);
    setPhase("connecting");
    try {
      const kit = await loadKit();
      kit.setWallet(walletId);
      const { address: pub } = await kit.fetchAddress();

      // Wallets that can report their network must be on testnet.
      try {
        const { networkPassphrase } = await kit.getNetwork();
        if (networkPassphrase && networkPassphrase !== TESTNET_PASSPHRASE) {
          throw new Error("Your wallet is on a different network. Switch it to Testnet, then connect again.");
        }
      } catch (e) {
        if (e instanceof Error && /Switch it to Testnet/.test(e.message)) throw e;
      }

      setPhase("signing-in");
      const challenge = await api<{ transaction: string; networkPassphrase: string }>("/api/auth/wallet/challenge", {
        method: "POST",
        body: JSON.stringify({ account: pub }),
      });
      if (!challenge.ok) throw new Error(challenge.error);

      const { signedTxXdr } = await kit.signTransaction(challenge.data.transaction, {
        networkPassphrase: challenge.data.networkPassphrase,
        address: pub,
      });
      const verified = await api<{ user: { stellarPublicKey: string | null } }>("/api/auth/wallet/verify", {
        method: "POST",
        body: JSON.stringify({ transaction: signedTxXdr }),
      });
      if (!verified.ok) throw new Error(verified.error);

      activeWallet.current = walletId;
      setWalletName(wallets.find((w) => w.id === walletId)?.name ?? walletId);
      setAddress(pub);
      try { localStorage.setItem(LAST_WALLET_KEY, walletId); } catch { /* storage may be unavailable */ }
      setPhase("idle");
      setModalOpen(false);
      return true;
    } catch (err) {
      setError(describeError(err));
      setPhase("error");
      return false;
    }
  }, [wallets]);

  const disconnect = useCallback(async () => {
    try { (await loadKit()).disconnect(); } catch { /* wallet may already be gone */ }
    await api("/api/auth/logout", { method: "POST" });
    activeWallet.current = null;
    setAddress(null);
    setWalletName(null);
    try { localStorage.removeItem(LAST_WALLET_KEY); } catch { /* ignore */ }
  }, []);

  const signTransaction = useCallback(async (xdr: string, networkPassphrase: string) => {
    const kit = await loadKit();
    if (!activeWallet.current) {
      // After a page reload the session is alive but the wallet must be re-selected.
      let last: string | null = null;
      try { last = localStorage.getItem(LAST_WALLET_KEY); } catch { /* ignore */ }
      if (!last) throw new Error("Connect your wallet to sign this transfer.");
      kit.setWallet(last);
      activeWallet.current = last;
    }
    const { address: current } = await kit.fetchAddress();
    if (address && current !== address) {
      throw new Error("The wallet is showing a different account than the one you signed in with. Switch accounts in your wallet.");
    }
    const { signedTxXdr } = await kit.signTransaction(xdr, { networkPassphrase, address: current });
    return signedTxXdr;
  }, [address]);

  const value = useMemo<WalletContextValue>(
    () => ({ address, walletName, phase, error, wallets, modalOpen, openModal, closeModal, connect, disconnect, signTransaction, refresh, loaded }),
    [address, walletName, phase, error, wallets, modalOpen, openModal, closeModal, connect, disconnect, signTransaction, refresh, loaded]
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
