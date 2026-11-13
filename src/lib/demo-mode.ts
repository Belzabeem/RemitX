import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { data } from "./data";
import { type User, type Transaction, type Escrow, type Rate } from "./data/types";

const DEMO_COOKIE = "remitx_demo";
const DEMO_USER_ID = "usr_demo_platform_000";
let DEMO_USER_CACHE: User | null = null;
let DEMO_ACTIVITY_CACHE: { transactions: Transaction[]; escrows: Escrow[]; rates: Rate[] } | null =
  null;

export async function isDemoRequest(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(DEMO_COOKIE)?.value === "1";
  } catch {
    return false;
  }
}

export function isDemoRequestFromReq(request: NextRequest): boolean {
  return request.cookies.get(DEMO_COOKIE)?.value === "1";
}

export function setDemoCookie(response: NextResponse): NextResponse {
  response.cookies.set(DEMO_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export function clearDemoCookie(response: NextResponse): NextResponse {
  response.cookies.set(DEMO_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function ensureDemoUser(): Promise<User> {
  if (DEMO_USER_CACHE) return DEMO_USER_CACHE;

  let user = await data.users.findById(DEMO_USER_ID);
  if (user) return (DEMO_USER_CACHE = user);

  user = await data.users.create({
    id: DEMO_USER_ID,
    email: "platform@remitx.demo",
    firstName: "RemitX",
    lastName: "Platform",
    passwordHash: "",
    stellarPublicKey: null,
    kycStatus: "verified",
    sessionVersion: 1,
    failedLoginAttempts: 0,
    lockedUntil: null,
  });
  return (DEMO_USER_CACHE = user);
}

const DEMO_ACTIVITY_COUNT = 100000;

/**
 * All corridors/routes that the demo platform exposes as "open".
 * Every page that lists corridors (rates, send, anchors) uses this to show
 * that the platform already has millions of users and open channels.
 */
const CORRIDORS: Array<{ from: string; to: string; rate: string }> = [
  // Core USD corridors
  { from: "USDC", to: "NGN", rate: "1500.00" },
  { from: "USDC", to: "PHP", rate: "56.50" },
  { from: "USDC", to: "GBP", rate: "0.785" },
  { from: "USDC", to: "EUR", rate: "0.920" },
  { from: "USDC", to: "USD", rate: "1.000" },
  { from: "USD", to: "NGN", rate: "1500.00" },
  { from: "USD", to: "PHP", rate: "56.50" },
  { from: "USD", to: "GBP", rate: "0.785" },
  { from: "USD", to: "EUR", rate: "0.920" },
  // XLM corridors
  { from: "XLM", to: "USD", rate: "0.125" },
  { from: "XLM", to: "NGN", rate: "1200.00" },
  { from: "XLM", to: "PHP", rate: "7.00" },
  { from: "XLM", to: "GBP", rate: "0.098" },
  { from: "XLM", to: "EUR", rate: "0.115" },
  // Reverse NGN + PHP + GBP + EUR to USD
  { from: "NGN", to: "USD", rate: "0.000667" },
  { from: "PHP", to: "USD", rate: "0.0177" },
  { from: "GBP", to: "USD", rate: "1.274" },
  { from: "EUR", to: "USD", rate: "1.087" },
  // Cross-stable and cross-asset corridors
  { from: "USDC", to: "EUR", rate: "0.920" },
  { from: "EUR", to: "USDC", rate: "1.087" },
  { from: "XLM", to: "PHP", rate: "7.00" },
  { from: "PHP", to: "XLM", rate: "0.1429" },
];

const _FIRST_NAMES = [
  "Amina", "Kwame", "Zara", "Tunde", "Fatima", "Jesse", "Maya", "Raj",
  "Ling", "Sofia", "Diego", "Aisha", "Carlos", "Priya", "Obi", "Nina",
];
const _LAST_NAMES = [
  "Diallo", "Okonkwo", "Al-Farsi", "Nguyen", "Singh", "Rossi", "Silva",
  "Kim", "Gomez", "Kowalski", "Müller", "Patel", "Yilmaz", "Dubois", "Sanogo",
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(): string {
  return (Math.random() * 9900 + 100).toFixed(2);
}

function randomTimestamp(daysBack = 30): string {
  const now = Date.now();
  const past = now - Math.random() * daysBack * 24 * 60 * 60 * 1000;
  return new Date(past).toISOString();
}

function randomStellarAddress(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let s = "G";
  for (let i = 0; i < 55; i++) s += randomPick([...alphabet]);
  return s;
}

export async function generateDemoActivity(): Promise<{
  transactions: Transaction[];
  escrows: Escrow[];
  rates: Rate[];
}> {
  if (DEMO_ACTIVITY_CACHE) return DEMO_ACTIVITY_CACHE;

  const demoUser = await ensureDemoUser();
  const transactions: Transaction[] = [];
  const escrows: Escrow[] = [];
  const rates: Rate[] = [];

  const now = new Date().toISOString();
  const statuses: Array<Transaction["status"]> = [
    "confirmed", "confirmed", "confirmed", "pending", "validating",
  ];

  for (let i = 0; i < DEMO_ACTIVITY_COUNT; i++) {
    const corridor = randomPick(CORRIDORS);
    const fromAmount = randomAmount();
    const rateNum = parseFloat(corridor.rate);
    const toAmount = (parseFloat(fromAmount) * rateNum).toFixed(2);
    const status = randomPick(statuses);
    const createdAt = randomTimestamp();
    const confirmedAt =
      status === "confirmed" || status === "validating"
        ? new Date(Date.parse(createdAt) + 5000).toISOString()
        : null;

    const txId = `tx_demo_sim_${i + 1}`;
    transactions.push({
      id: txId,
      userId: demoUser.id,
      fromAsset: corridor.from,
      toAsset: corridor.to,
      fromAmount,
      toAmount,
      recipientAddress: randomStellarAddress(),
      stellarTxHash: status === "confirmed" ? `hash_sim_${i + 1}` : null,
      escrowId: status === "validating" ? `escrow_sim_${i + 1}` : null,
      status,
      createdAt,
      confirmedAt,
      updatedAt: confirmedAt ?? createdAt,
    });

    if (status === "validating") {
      escrows.push({
        id: `escrow_sim_${i + 1}`,
        userId: demoUser.id,
        transactionId: txId,
        contractAddress: randomStellarAddress(),
        senderAddress: randomStellarAddress(),
        recipientAddress: randomStellarAddress(),
        amount: fromAmount,
        asset: corridor.from,
        status: "locked",
        depositTxHash: `hash_sim_${i + 1}`,
        releaseTxHash: null,
        createdAt,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: createdAt,
      });
    }
  }

  for (const c of CORRIDORS) {
    rates.push({
      id: `rate_demo_${c.from}_${c.to}`,
      fromAsset: c.from,
      toAsset: c.to,
      rate: c.rate,
      fetchedAt: now,
    });
  }

  DEMO_ACTIVITY_CACHE = { transactions, escrows, rates };
  return DEMO_ACTIVITY_CACHE;
}

export async function getDemoTransactions(): Promise<Transaction[]> {
  const { transactions } = await generateDemoActivity();
  return transactions;
}

export async function getDemoEscrows(): Promise<Escrow[]> {
  const { escrows } = await generateDemoActivity();
  return escrows;
}

export async function getDemoRates(): Promise<Rate[]> {
  const { rates } = await generateDemoActivity();
  return rates;
}

export async function getDemoCorridors(): Promise<
  Array<{ from: string; to: string; rate: string }>
> {
  return CORRIDORS;
}

export async function getDemoUserCount(): Promise<number> {
  // Demo simulates millions of active users so the UI can show "millions of
  // users" and "all channels open" without sacrificing a large payload.
  return 42000000;
}

export { DEMO_COOKIE, DEMO_USER_ID };

