import type { User, Transaction, Rate, Escrow } from "../types";

/**
 * Deterministic seed data for local development and review.
 * Data resets to this initial state on server restart.
 *
 * Demo credentials:
 *   Email: alice@remitx.dev
 *   Password: Password123!
 */
export const SEED_USERS: User[] = [
  {
    id: "usr_alice_demo_001",
    email: "alice@remitx.dev",
    firstName: "Alice",
    lastName: "Johnson",
    // bcrypt hash of "Password123!" with cost 12
    passwordHash: "$2b$12$vNRfIL9F3evHa5ZnHh9mxOaVMm8.UpBgcDbLkS3Ty88EXhusnYaoO",
    stellarPublicKey: "GBRPYHIL2C3T2DTB24CVN2F4Q3S5P7JQZ6WFHVN3J2X2X2X2X2X2X2X",
    kycStatus: "verified",
    sessionVersion: 1,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: "2026-01-01T12:00:00.000Z",
    updatedAt: "2026-01-01T12:00:00.000Z",
  },
  {
    id: "usr_bob_demo_002",
    email: "bob@remitx.dev",
    firstName: "Bob",
    lastName: "Okonkwo",
    passwordHash: "$2b$12$vNRfIL9F3evHa5ZnHh9mxOaVMm8.UpBgcDbLkS3Ty88EXhusnYaoO",
    stellarPublicKey: "GCKF7V32L2X2CVN2F4Q3S5P7JQZ6WFHVN3J2X2X2X2X2X2X2X2X2X2X2",
    kycStatus: "pending",
    sessionVersion: 1,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-15T10:00:00.000Z",
  },
];

export const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: "tx_demo_001",
    userId: "usr_alice_demo_001",
    fromAsset: "USDC",
    toAsset: "NGN",
    fromAmount: "250.00",
    toAmount: "375000.00",
    recipientAddress: "GCKF7V32L2X2CVN2F4Q3S5P7JQZ6WFHVN3J2X2X2X2X2X2X2X2X2X2X2",
    stellarTxHash: "4f7a29e1f57b6d1c8c9a3e2b4f6d8a0c2e4f6a8b0d2e4f6a8b0d2e4f6a8b0d2e",
    escrowId: null,
    status: "confirmed",
    createdAt: "2026-02-01T08:30:00.000Z",
    confirmedAt: "2026-02-01T08:30:06.000Z",
    updatedAt: "2026-02-01T08:30:06.000Z",
  },
  {
    id: "tx_demo_002",
    userId: "usr_alice_demo_001",
    fromAsset: "XLM",
    toAsset: "PHP",
    fromAmount: "500.00",
    toAmount: "3250.00",
    recipientAddress: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3IF2WS7UKLZ5",
    stellarTxHash: "8a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
    escrowId: "escrow_demo_001",
    status: "confirmed",
    createdAt: "2026-02-10T14:15:00.000Z",
    confirmedAt: "2026-02-10T14:15:05.000Z",
    updatedAt: "2026-02-10T14:15:05.000Z",
  },
  {
    id: "tx_demo_003",
    userId: "usr_alice_demo_001",
    fromAsset: "USDC",
    toAsset: "GBP",
    fromAmount: "100.00",
    toAmount: "78.50",
    recipientAddress: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    stellarTxHash: null,
    escrowId: null,
    status: "pending",
    createdAt: "2026-02-20T19:00:00.000Z",
    confirmedAt: null,
    updatedAt: "2026-02-20T19:00:00.000Z",
  },
];

export const SEED_ESCROWS: Escrow[] = [
  {
    id: "escrow_demo_001",
    userId: "usr_alice_demo_001",
    transactionId: "tx_demo_002",
    contractAddress: "CA3D5KRYMCMCZWAPGQ74GMNDKKEP4LU6TYVO55XBHPGMBW5GDRWD2TSS",
    senderAddress: "GBRPYHIL2C3T2DTB24CVN2F4Q3S5P7JQZ6WFHVN3J2X2X2X2X2X2X2X",
    recipientAddress: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3IF2WS7UKLZ5",
    amount: "500.00",
    asset: "XLM",
    status: "locked",
    depositTxHash: "8a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
    releaseTxHash: null,
    createdAt: "2026-02-10T14:15:00.000Z",
    expiresAt: "2026-02-17T14:15:00.000Z",
    updatedAt: "2026-02-10T14:15:00.000Z",
  },
];

export const SEED_RATES: Rate[] = [
  {
    id: "rate_usdc_ngn",
    fromAsset: "USDC",
    toAsset: "NGN",
    rate: "1500.00",
    fetchedAt: "2026-02-20T00:00:00.000Z",
  },
  {
    id: "rate_usdc_php",
    fromAsset: "USDC",
    toAsset: "PHP",
    rate: "56.50",
    fetchedAt: "2026-02-20T00:00:00.000Z",
  },
  {
    id: "rate_usdc_gbp",
    fromAsset: "USDC",
    toAsset: "GBP",
    rate: "0.785",
    fetchedAt: "2026-02-20T00:00:00.000Z",
  },
  {
    id: "rate_xlm_usd",
    fromAsset: "XLM",
    toAsset: "USD",
    rate: "0.125",
    fetchedAt: "2026-02-20T00:00:00.000Z",
  },
];

