import { describe, it, expect } from "vitest";
import { Keypair, Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import { createChallenge, verifyChallenge, WalletAuthError } from "../wallet-auth";

function sign(xdr: string, kp: Keypair): string {
  const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  tx.sign(kp);
  return tx.toXDR();
}

describe("SEP-10 wallet authentication", () => {
  it("accepts a challenge signed by the requesting account", () => {
    const client = Keypair.random();
    const { transaction } = createChallenge(client.publicKey());
    expect(verifyChallenge(sign(transaction, client)).account).toBe(client.publicKey());
  });

  it("rejects a challenge that was never signed by the wallet", () => {
    const client = Keypair.random();
    const { transaction } = createChallenge(client.publicKey());
    expect(() => verifyChallenge(transaction)).toThrow(WalletAuthError);
  });

  it("rejects a challenge signed by a different key", () => {
    const client = Keypair.random();
    const attacker = Keypair.random();
    const { transaction } = createChallenge(client.publicKey());
    expect(() => verifyChallenge(sign(transaction, attacker))).toThrow(WalletAuthError);
  });

  it("rejects replay of an already-used challenge", () => {
    const client = Keypair.random();
    const signed = sign(createChallenge(client.publicKey()).transaction, client);
    verifyChallenge(signed);
    expect(() => verifyChallenge(signed)).toThrow(/already used/);
  });

  it("rejects garbage input", () => {
    expect(() => verifyChallenge("not-xdr")).toThrow(WalletAuthError);
  });
});
