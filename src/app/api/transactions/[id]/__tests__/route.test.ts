import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTxFindById, mockEscrowFindByTxId } = vi.hoisted(() => ({
  mockTxFindById: vi.fn(),
  mockEscrowFindByTxId: vi.fn(),
}));

vi.mock("@/lib/data", () => ({
  data: {
    transactions: {
      findById: mockTxFindById,
    },
    escrows: {
      findByTransactionId: mockEscrowFindByTxId,
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

import { GET } from "../route";
import { getCurrentUser } from "@/lib/auth";

const OWNER_ID = "550e8400-e29b-41d4-a716-446655440000";
const TX_ID = "660e8400-e29b-41d4-a716-446655440000";

function makeRequest(id = TX_ID) {
  return new Request(`http://localhost/api/transactions/${id}`);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function fakeUser(id = OWNER_ID) {
  return {
    id,
    email: `${id}@example.com`,
    firstName: "Test",
    lastName: "User",
    stellarPublicKey: null,
    kycStatus: "pending" as const,
    sessionVersion: 1,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function fakeTx(userId = OWNER_ID) {
  return {
    id: TX_ID,
    userId,
    fromAsset: "USD",
    toAsset: "XLM",
    fromAmount: "100",
    toAmount: "50",
    recipientAddress: "GABC123",
    stellarTxHash: null,
    escrowId: null,
    status: "confirmed" as const,
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

describe("GET /api/transactions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTxFindById.mockReset();
    mockEscrowFindByTxId.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await GET(makeRequest(), makeParams(TX_ID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(fakeUser());
    const res = await GET(makeRequest("not-a-uuid"), makeParams("not-a-uuid"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid transaction ID");
  });

  it("returns 404 when transaction does not exist", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(fakeUser());
    mockTxFindById.mockResolvedValue(null);
    const res = await GET(makeRequest(TX_ID), makeParams(TX_ID));
    expect(res.status).toBe(404);
  });

  it("returns 404 when transaction belongs to another user (IDOR prevention)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(fakeUser(OWNER_ID));
    mockTxFindById.mockResolvedValue(fakeTx("other-user"));

    const res = await GET(makeRequest(TX_ID), makeParams(TX_ID));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Transaction not found");
  });

  it("returns 200 with transaction and escrow data when owner matches", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(fakeUser(OWNER_ID));
    const tx = fakeTx(OWNER_ID);
    const escrow = {
      id: "esc-1",
      transactionId: TX_ID,
      userId: OWNER_ID,
      contractAddress: "CADDR",
      senderAddress: "SADDR",
      recipientAddress: "RADDR",
      amount: "100",
      asset: "USDC",
      status: "locked" as const,
      depositTxHash: null,
      releaseTxHash: null,
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockTxFindById.mockResolvedValue(tx);
    mockEscrowFindByTxId.mockResolvedValue(escrow);

    const res = await GET(makeRequest(TX_ID), makeParams(TX_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.transaction.id).toBe(TX_ID);
    expect(body.data.escrow.id).toBe("esc-1");
  });

  it("returns 200 with null escrow when no escrow exists", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(fakeUser(OWNER_ID));
    mockTxFindById.mockResolvedValue(fakeTx(OWNER_ID));
    mockEscrowFindByTxId.mockResolvedValue(null);

    const res = await GET(makeRequest(TX_ID), makeParams(TX_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.escrow).toBeNull();
  });
});
