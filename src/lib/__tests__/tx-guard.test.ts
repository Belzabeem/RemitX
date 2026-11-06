import { describe, it, expect } from "vitest";
import { Account, Asset, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { assertSignedXdrMatches, TxMismatchError } from "../tx-guard";

const source = Keypair.random();
const recipient = Keypair.random().publicKey();
const passphrase = Networks.TESTNET;

function build(opts: { sendAmount?: string; destination?: string; signer?: Keypair; ops?: number } = {}) {
  const b = new TransactionBuilder(new Account(source.publicKey(), "1"), { fee: "100", networkPassphrase: passphrase });
  for (let i = 0; i < (opts.ops ?? 1); i++) {
    b.addOperation(
      Operation.pathPaymentStrictSend({
        sendAsset: Asset.native(),
        sendAmount: opts.sendAmount ?? "10",
        destination: opts.destination ?? recipient,
        destAsset: Asset.native(),
        destMin: "1",
      })
    );
  }
  const tx = b.setTimeout(60).build();
  if (opts.signer ?? source) tx.sign(opts.signer ?? source);
  return tx.toXDR();
}
const expected = { source: source.publicKey(), recipient, fromAmount: "10", networkPassphrase: passphrase };

describe("assertSignedXdrMatches", () => {
  it("accepts the transfer we created, signed by its owner", () => {
    expect(() => assertSignedXdrMatches(build(), expected)).not.toThrow();
  });
  it("rejects a different recipient", () => {
    expect(() => assertSignedXdrMatches(build({ destination: Keypair.random().publicKey() }), expected)).toThrow(TxMismatchError);
  });
  it("rejects a different amount", () => {
    expect(() => assertSignedXdrMatches(build({ sendAmount: "11" }), expected)).toThrow(/Amount/);
  });
  it("rejects a transaction signed by someone else", () => {
    expect(() => assertSignedXdrMatches(build({ signer: Keypair.random() }), expected)).toThrow(/not signed/);
  });
  it("rejects multi-operation transactions", () => {
    expect(() => assertSignedXdrMatches(build({ ops: 2 }), expected)).toThrow(/exactly one/);
  });
  it("rejects unparseable input", () => {
    expect(() => assertSignedXdrMatches("garbage", expected)).toThrow(TxMismatchError);
  });
});
