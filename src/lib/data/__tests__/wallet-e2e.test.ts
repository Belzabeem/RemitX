import type { NextRequest } from "next/server";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Keypair, Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import { resetMemoryStore, createMemoryRepositories } from "../memory/memory-adapter";

const cookieStore = new Map<string, { value: string }>();
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: (k: string) => cookieStore.get(k),
    set: (k: string, v: string) => cookieStore.set(k, { value: v }),
    delete: (k: string) => cookieStore.delete(k),
  }),
}));

import { POST as challengePost } from "@/app/api/auth/wallet/challenge/route";
import { POST as verifyPost } from "@/app/api/auth/wallet/verify/route";
import { POST as loginPost } from "@/app/api/auth/login/route";

const post = (url: string, body: unknown) =>
  new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;

async function signIn(kp: Keypair) {
  const ch = await (await challengePost(post("/api/auth/wallet/challenge", { account: kp.publicKey() }))).json();
  const tx = TransactionBuilder.fromXDR(ch.data.transaction, Networks.TESTNET);
  tx.sign(kp);
  return verifyPost(post("/api/auth/wallet/verify", { transaction: tx.toXDR() }));
}

describe("wallet sign-in end to end (no database, no email, no password)", () => {
  beforeEach(() => {
    resetMemoryStore();
    cookieStore.clear();
  });

  it("creates a wallet-only account and a session on first sign-in", async () => {
    const kp = Keypair.random();
    const res = await signIn(kp);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.user.stellarPublicKey).toBe(kp.publicKey());
    expect(json.data.user.passwordHash).toBeUndefined();
    expect(cookieStore.get("remitx_session")?.value).toBeTruthy();
  });

  it("signs the same wallet back into the same account", async () => {
    const kp = Keypair.random();
    const first = (await (await signIn(kp)).json()).data.user.id;
    const second = (await (await signIn(kp)).json()).data.user.id;
    expect(second).toBe(first);
    expect((await createMemoryRepositories().users.list()).filter((u) => u.stellarPublicKey === kp.publicKey())).toHaveLength(1);
  });

  it("rejects a challenge signed by a different wallet", async () => {
    const victim = Keypair.random();
    const ch = await (await challengePost(post("/api/auth/wallet/challenge", { account: victim.publicKey() }))).json();
    const tx = TransactionBuilder.fromXDR(ch.data.transaction, Networks.TESTNET);
    tx.sign(Keypair.random());
    const res = await verifyPost(post("/api/auth/wallet/verify", { transaction: tx.toXDR() }));
    expect(res.status).toBe(401);
    expect(cookieStore.has("remitx_session")).toBe(false);
  });

  it("refuses an invalid public key at the challenge step", async () => {
    const res = await challengePost(post("/api/auth/wallet/challenge", { account: "GNOTAKEY" }));
    expect(res.status).toBe(400);
  });

  it("wallet-only accounts cannot be logged into with any password", async () => {
    const kp = Keypair.random();
    const email = (await (await signIn(kp)).json()).data.user.email;
    const res = await loginPost(post("/api/auth/login", { email, password: "", turnstileToken: "t" }));
    expect(res.status).not.toBe(200);
  });
});
