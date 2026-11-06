/**
 * Wallet authentication using SEP-10 (Stellar Web Authentication).
 *
 * Flow (same shape as a challenge/sign/verify login, built on the Stellar standard):
 *   1. POST /api/auth/wallet/challenge  { account }      -> challenge transaction (XDR)
 *   2. The wallet signs the challenge. It is NEVER submitted to the network.
 *   3. POST /api/auth/wallet/verify     { transaction }  -> session cookie
 *
 * Why SEP-10 instead of a bespoke "sign this nonce" message: every Stellar wallet
 * can sign a transaction, while message signing (SEP-43) is not universal. The
 * challenge is bound to the account, the app's home domain and a short time window,
 * and each challenge is single-use.
 */
import { Keypair, Networks, WebAuth } from "@stellar/stellar-sdk";

const CHALLENGE_TTL_SECONDS = 300;

const NETWORK_PASSPHRASE =
  (process.env.STELLAR_NETWORK || "testnet") === "public" ? Networks.PUBLIC : Networks.TESTNET;

const globalState = globalThis as unknown as {
  __remitxSep10Key?: Keypair;
  __remitxUsedChallenges?: Map<string, number>;
};

/** Domain the challenge is bound to (host only, no scheme). */
export function getHomeDomain(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    return new URL(url).host;
  } catch {
    return "localhost:3000";
  }
}

/**
 * The server key only signs challenges; it holds no funds. Production must supply
 * SEP10_SERVER_SECRET so challenges survive restarts and multiple instances. In
 * development a throwaway key is generated per process (nothing is persisted).
 */
export function getServerKeypair(): Keypair {
  const configured = process.env.SEP10_SERVER_SECRET;
  if (configured) return Keypair.fromSecret(configured);
  if (process.env.NODE_ENV === "production") {
    throw new Error("SEP10_SERVER_SECRET must be set in production.");
  }
  if (!globalState.__remitxSep10Key) globalState.__remitxSep10Key = Keypair.random();
  return globalState.__remitxSep10Key;
}

export function createChallenge(clientAccount: string): { transaction: string; networkPassphrase: string } {
  const domain = getHomeDomain();
  const transaction = WebAuth.buildChallengeTx(
    getServerKeypair(),
    clientAccount,
    domain,
    CHALLENGE_TTL_SECONDS,
    NETWORK_PASSPHRASE,
    domain
  );
  return { transaction, networkPassphrase: NETWORK_PASSPHRASE };
}

function usedChallenges(): Map<string, number> {
  if (!globalState.__remitxUsedChallenges) globalState.__remitxUsedChallenges = new Map();
  const map = globalState.__remitxUsedChallenges;
  const now = Date.now();
  for (const [hash, expires] of map) if (expires < now) map.delete(hash);
  return map;
}

export class WalletAuthError extends Error {}

/**
 * Verifies a signed challenge and returns the authenticated account.
 * Throws WalletAuthError for anything invalid (bad signature, wrong domain,
 * expired, tampered, or already used).
 */
export function verifyChallenge(signedTransaction: string): { account: string } {
  const domain = getHomeDomain();
  const server = getServerKeypair().publicKey();
  try {
    const { tx, clientAccountID } = WebAuth.readChallengeTx(
      signedTransaction,
      server,
      NETWORK_PASSPHRASE,
      domain,
      domain
    );
    // Requires the server's signature (proves we issued it) and the client's.
    WebAuth.verifyChallengeTxSigners(
      signedTransaction,
      server,
      NETWORK_PASSPHRASE,
      [clientAccountID],
      domain,
      domain
    );

    const hash = tx.hash().toString("hex");
    const used = usedChallenges();
    if (used.has(hash)) throw new WalletAuthError("Challenge already used");
    used.set(hash, Date.now() + CHALLENGE_TTL_SECONDS * 1000);

    return { account: clientAccountID };
  } catch (err) {
    if (err instanceof WalletAuthError) throw err;
    throw new WalletAuthError("Invalid or expired challenge");
  }
}

/** Placeholder identity for accounts created by wallet sign-in (reserved .invalid TLD). */
export function walletPlaceholderEmail(account: string): string {
  return `${account.toLowerCase()}@wallet.remitx.invalid`;
}
