import { Keypair, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { toStroops } from "./amounts";

export class TxMismatchError extends Error {}

/**
 * Checks that a wallet-signed XDR is the transfer we created: right source,
 * a single path-payment-strict-send to the stored recipient for the stored
 * amount, and a valid signature from the source account. Without this a user
 * could submit any signed transaction and have the record marked "confirmed".
 */
export function assertSignedXdrMatches(
  signedXdr: string,
  expected: { source: string; recipient: string; fromAmount: string; networkPassphrase: string }
): void {
  let tx;
  try {
    tx = TransactionBuilder.fromXDR(signedXdr, expected.networkPassphrase);
  } catch {
    throw new TxMismatchError("Signed transaction could not be parsed");
  }
  if ("innerTransaction" in tx) throw new TxMismatchError("Fee-bump transactions are not accepted");
  if (tx.source !== expected.source) throw new TxMismatchError("Transaction source does not match your account");
  if (tx.operations.length !== 1) throw new TxMismatchError("Transaction must contain exactly one operation");

  const op = tx.operations[0] as Operation.PathPaymentStrictSend;
  if (op.type !== "pathPaymentStrictSend") throw new TxMismatchError("Unexpected operation type");
  if (op.destination !== expected.recipient) throw new TxMismatchError("Recipient does not match the transfer");
  if (toStroops(op.sendAmount) !== toStroops(expected.fromAmount)) {
    throw new TxMismatchError("Amount does not match the transfer");
  }

  const hash = tx.hash();
  const keypair = Keypair.fromPublicKey(expected.source);
  const signed = tx.signatures.some((s) => {
    try {
      return keypair.verify(hash, s.signature());
    } catch {
      return false;
    }
  });
  if (!signed) throw new TxMismatchError("Transaction is not signed by your account");
}
