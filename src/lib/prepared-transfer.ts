/**
 * What POST /api/stellar/send returns: an unsigned transaction plus the full cost
 * breakdown. The Send page stores it for this browser tab only; Review reads it,
 * asks the wallet to sign, and submits the signed XDR.
 */
export interface PreparedTransfer {
  transactionId: string;
  xdr: string;
  networkPassphrase: string;
  fromAsset: string;
  toAsset: string;
  fromAmount: string;
  toAmount: string;
  /** Guaranteed minimum: the transaction fails on the network if the recipient would get less. */
  destMin: string;
  /** Asset codes traversed, source first, destination last. */
  route: string[];
  cost: {
    sendAmount: string;
    receiveAmount: string;
    effectiveRate: string;
    networkFeeStroops: number;
    platformFee: string;
    estimatedArrival: string;
  };
  recipientAddress: string;
}

const key = (id: string) => `remitx:tx:${id}`;

export function savePrepared(p: PreparedTransfer): void {
  try {
    sessionStorage.setItem(key(p.transactionId), JSON.stringify(p));
  } catch {
    // Storage can be blocked; Review then asks the person to start again.
  }
}

export function loadPrepared(id: string | null): PreparedTransfer | null {
  if (!id || typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key(id));
    return raw ? (JSON.parse(raw) as PreparedTransfer) : null;
  } catch {
    return null;
  }
}

export function clearPrepared(id: string): void {
  try {
    sessionStorage.removeItem(key(id));
  } catch {
    // ignore
  }
}
