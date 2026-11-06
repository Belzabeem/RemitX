import { createMemoryRepositories, resetMemoryStore } from "./memory/memory-adapter";
import { createPrismaRepositories } from "./prisma/prisma-adapter";
import { rateCache } from "./rate-cache";
import type { DataRepositories } from "./repositories";

export type {
  User,
  Transaction,
  Rate,
  Escrow,
  KycStatus,
  TransactionStatus,
  EscrowStatus,
} from "./types";

export type {
  UserRepository,
  TransactionRepository,
  RateRepository,
  EscrowRepository,
  MetaRepository,
  DataRepositories,
} from "./repositories";

export { rateCache, resetMemoryStore };

export const DATA_MODE = (process.env.DATA_MODE || "memory").toLowerCase();

let logged = false;
function logActiveMode() {
  if (!logged && typeof window === "undefined") {
    logged = true;
    if (DATA_MODE === "memory") {
      console.log(
        "[RemitX Data Layer] Active DATA_MODE: memory (Development mode — in-memory store pre-seeded with sample data; resets on restart)"
      );
    } else {
      console.log(
        `[RemitX Data Layer] Active DATA_MODE: ${DATA_MODE} (Prisma production adapter selected)`
      );
    }
  }
}

logActiveMode();

export const data: DataRepositories =
  DATA_MODE === "prisma"
    ? createPrismaRepositories()
    : createMemoryRepositories();

