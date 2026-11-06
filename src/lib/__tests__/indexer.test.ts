import { describe, it, expect, beforeEach, vi } from "vitest";
import { Keypair, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { createMemoryRepositories, resetMemoryStore } from "../data/memory/memory-adapter";
import { syncEscrowEvents, decodeEscrowEvent, type EventSource, type RpcEvent } from "../indexer";

const CONTRACT = "CCONTRACTIDEXAMPLE";
const sender = Keypair.random().publicKey();
const recipient = Keypair.random().publicKey();
const escrowHex = "ab".repeat(32);
const sym = (s: string) => nativeToScVal(s, { type: "symbol" });
const idScVal = () => nativeToScVal(Buffer.from(escrowHex, "hex"));
const tuple = (...vals: xdr.ScVal[]) => xdr.ScVal.scvVec(vals);
const i128 = (n: number) => nativeToScVal(BigInt(n), { type: "i128" });
const addr = (a: string) => nativeToScVal(a, { type: "address" });

let n = 0;
function ev(action: string, value: xdr.ScVal, ledger = 100 + n): RpcEvent {
  n++;
  return { id: `evt-${n}`, ledger, txHash: `tx${n}`, topic: [sym("escrow"), sym(action), idScVal()], value };
}
const deposit = (amount = 1000) =>
  ev("deposit", tuple(addr(sender), addr(recipient), i128(amount), addr(Keypair.random().publicKey()), nativeToScVal(BigInt(2_000_000_000), { type: "u64" })));
const release = (out: number, fee: number) => ev("release", tuple(addr(recipient), i128(out), i128(fee)));

function source(pages: RpcEvent[][]): EventSource & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    calls,
    getLatestLedger: async () => ({ sequence: 5000 }),
    getEvents: vi.fn(async (req) => {
      calls.push(req);
      return { events: pages.shift() ?? [] };
    }),
  };
}

describe("escrow event indexer", () => {
  let repos: ReturnType<typeof createMemoryRepositories>;
  beforeEach(async () => {
    resetMemoryStore();
    n = 0;
    repos = createMemoryRepositories();
    await repos.users.create({
      firstName: "S", lastName: "W", email: "s@example.com", passwordHash: "", stellarPublicKey: sender,
      kycStatus: "pending", sessionVersion: 1, failedLoginAttempts: 0, lockedUntil: null,
    });
  });
  const run = (pages: RpcEvent[][]) => syncEscrowEvents({ rpc: source(pages), repos, contractId: CONTRACT });

  it("creates a locked escrow for a known user's deposit", async () => {
    const r = await run([[deposit(1000)]]);
    expect(r.processed).toBe(1);
    const e = await repos.escrows.findById(escrowHex);
    expect(e).toMatchObject({ status: "locked", amount: "1000", senderAddress: sender, recipientAddress: recipient });
  });

  it("ignores deposits from wallets that are not our users", async () => {
    await repos.users.update((await repos.users.findByStellarPublicKey(sender))!.id, { stellarPublicKey: null });
    const r = await run([[deposit()]]);
    expect(r.skipped).toBe(1);
    expect(await repos.escrows.findById(escrowHex)).toBeNull();
  });

  it("keeps the escrow locked after a partial release and releases once fully settled", async () => {
    await run([[deposit(1000)]]);
    await run([[release(390, 10)]]);
    expect((await repos.escrows.findById(escrowHex))?.status).toBe("locked");
    await run([[release(580, 20)]]);
    const e = await repos.escrows.findById(escrowHex);
    expect(e?.status).toBe("released");
    expect(e?.releaseTxHash).toBeTruthy();
  });

  it("marks refunds and cancels as refunded", async () => {
    await run([[deposit(500)]]);
    await run([[ev("refund", tuple(addr(sender), i128(500)))]]);
    expect((await repos.escrows.findById(escrowHex))?.status).toBe("refunded");
  });

  it("applies expiry extensions", async () => {
    await run([[deposit()]]);
    await run([[ev("extend", tuple(addr(sender), nativeToScVal(BigInt(3_000_000_000), { type: "u64" })))]]);
    expect((await repos.escrows.findById(escrowHex))?.expiresAt).toBe(new Date(3_000_000_000 * 1000).toISOString());
  });

  it("skips events for unknown escrows and malformed events without crashing", async () => {
    const bad: RpcEvent = { id: "x", ledger: 1, txHash: "t", topic: [sym("other")], value: i128(1) };
    const r = await run([[release(1, 0), bad]]);
    expect(r.processed).toBe(0);
    expect(r.skipped).toBe(2);
  });

  it("resumes from the saved cursor instead of re-reading history", async () => {
    await run([[deposit()]]);
    const src = source([[]]);
    await syncEscrowEvents({ rpc: src, repos, contractId: CONTRACT });
    expect(src.calls[0]).toMatchObject({ cursor: expect.stringMatching(/^evt-/) });
    expect(src.calls[0]).not.toHaveProperty("startLedger");
  });

  it("starts from a recent ledger on the first run", async () => {
    const src = source([[]]);
    await syncEscrowEvents({ rpc: src, repos, contractId: CONTRACT });
    expect(src.calls[0]).toMatchObject({ startLedger: 4000 });
  });

  it("decodes only escrow events", () => {
    expect(decodeEscrowEvent(deposit())?.action).toBe("deposit");
    expect(decodeEscrowEvent({ id: "1", ledger: 1, txHash: "t", topic: [sym("nope")], value: i128(1) })).toBeNull();
  });
});
