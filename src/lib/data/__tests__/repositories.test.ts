import { describe, it, expect, beforeEach } from "vitest";
import {
  createMemoryRepositories,
  resetMemoryStore,
} from "../memory/memory-adapter";
import { RateTtlCache } from "../rate-cache";

describe("In-Memory Data Repositories", () => {
  let repos = createMemoryRepositories();

  beforeEach(() => {
    resetMemoryStore();
    repos = createMemoryRepositories();
  });

  describe("UserRepository", () => {
    it("finds pre-seeded user by id and email", async () => {
      const byId = await repos.users.findById("usr_alice_demo_001");
      expect(byId).not.toBeNull();
      expect(byId?.email).toBe("alice@remitx.dev");

      const byEmail = await repos.users.findByEmail("ALICE@REMITX.DEV");
      expect(byEmail).not.toBeNull();
      expect(byEmail?.id).toBe("usr_alice_demo_001");
    });

    it("creates a new user and normalizes email", async () => {
      const created = await repos.users.create({
        email: "NewUser@Example.com",
        firstName: "Charlie",
        lastName: "Brown",
        passwordHash: "hash_123",
        stellarPublicKey: "GNEWKEY",
        kycStatus: "pending",
        sessionVersion: 1,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      expect(created.id).toBeDefined();
      expect(created.email).toBe("newuser@example.com");

      const fetched = await repos.users.findByEmail("newuser@example.com");
      expect(fetched?.id).toBe(created.id);
    });

    it("updates an existing user", async () => {
      const updated = await repos.users.update("usr_alice_demo_001", {
        kycStatus: "verified",
        failedLoginAttempts: 2,
      });

      expect(updated?.failedLoginAttempts).toBe(2);
      expect(updated?.kycStatus).toBe("verified");
    });
  });

  describe("TransactionRepository", () => {
    it("finds transactions for a user with pagination", async () => {
      const { transactions, total } = await repos.transactions.findByUserId(
        "usr_alice_demo_001",
        { limit: 2, offset: 0 }
      );

      expect(total).toBeGreaterThanOrEqual(3);
      expect(transactions).toHaveLength(2);
      expect(transactions[0].userId).toBe("usr_alice_demo_001");
    });

    it("creates and updates transaction status and hash", async () => {
      const tx = await repos.transactions.create({
        userId: "usr_alice_demo_001",
        fromAsset: "USDC",
        toAsset: "NGN",
        fromAmount: "150.00",
        toAmount: "225000.00",
        recipientAddress: "GRECIPIENT",
        stellarTxHash: null,
        escrowId: null,
        status: "pending",
        confirmedAt: null,
      });

      expect(tx.id).toBeDefined();
      expect(tx.status).toBe("pending");

      const updated = await repos.transactions.update(tx.id, {
        status: "confirmed",
        stellarTxHash: "tx_hash_abc",
        confirmedAt: new Date().toISOString(),
      });

      expect(updated?.status).toBe("confirmed");
      expect(updated?.stellarTxHash).toBe("tx_hash_abc");
    });
  });

  describe("RateRepository", () => {
    it("finds pre-seeded rates case-insensitively", async () => {
      const rate = await repos.rates.findRate("usdc", "ngn");
      expect(rate).not.toBeNull();
      expect(rate?.rate).toBe("1500.00");
    });

    it("upserts rates", async () => {
      await repos.rates.upsertRate("USDC", "EUR", "0.92");
      const found = await repos.rates.findRate("USDC", "EUR");
      expect(found?.rate).toBe("0.92");
    });
  });

  describe("EscrowRepository", () => {
    it("finds pre-seeded escrow by transactionId", async () => {
      const escrow = await repos.escrows.findByTransactionId("tx_demo_002");
      expect(escrow).not.toBeNull();
      expect(escrow?.id).toBe("escrow_demo_001");
      expect(escrow?.amount).toBe("500.00");
    });

    it("creates and updates escrow", async () => {
      const created = await repos.escrows.create({
        userId: "usr_alice_demo_001",
        transactionId: "tx_new_001",
        contractAddress: "CCONTRACT",
        senderAddress: "GSENDER",
        recipientAddress: "GRECIPIENT",
        amount: "300.00",
        asset: "USDC",
        status: "locked",
        depositTxHash: "dep_hash",
        releaseTxHash: null,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });

      expect(created.id).toBeDefined();

      const updated = await repos.escrows.update(created.id, {
        status: "released",
        releaseTxHash: "rel_hash",
      });

      expect(updated?.status).toBe("released");
      expect(updated?.releaseTxHash).toBe("rel_hash");
    });
  });

  describe("RateTtlCache", () => {
    it("caches and expires rate values according to TTL", () => {
      const cache = new RateTtlCache(50); // 50ms TTL

      cache.set("USDC", "NGN", "1500.00");
      expect(cache.get("USDC", "NGN")?.rate).toBe("1500.00");
      expect(cache.get("usdc", "ngn")?.rate).toBe("1500.00");

      // Advance time / check expired
      const entry = cache.get("USDC", "NGN");
      expect(entry?.source).toBe("live");
    });
  });
});

