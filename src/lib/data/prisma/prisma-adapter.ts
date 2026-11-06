import type { DataRepositories } from "../repositories";

/**
 * Production Prisma Adapter Stub.
 *
 * Full production Postgres persistence via Prisma is tracked on the roadmap.
 * In this build, DATA_MODE defaults to "memory" for zero-credential local runs.
 */
export function createPrismaRepositories(): DataRepositories {
  const notEnabled = (operation: string) => {
    throw new Error(
      `[RemitX Data Layer] Production persistence via Prisma is not enabled in this build (${operation}). ` +
        `RemitX is running in zero-dependency development mode with DATA_MODE=memory. ` +
        `Set DATA_MODE=memory or run locally without database credentials.`
    );
  };

  return {
    users: {
      findById: () => notEnabled("users.findById"),
      findByEmail: () => notEnabled("users.findByEmail"),
      findByStellarPublicKey: () => notEnabled("users.findByStellarPublicKey"),
      create: () => notEnabled("users.create"),
      update: () => notEnabled("users.update"),
      list: () => notEnabled("users.list"),
    },
    transactions: {
      findById: () => notEnabled("transactions.findById"),
      findByUserId: () => notEnabled("transactions.findByUserId"),
      create: () => notEnabled("transactions.create"),
      update: () => notEnabled("transactions.update"),
      list: () => notEnabled("transactions.list"),
    },
    rates: {
      findRate: () => notEnabled("rates.findRate"),
      upsertRate: () => notEnabled("rates.upsertRate"),
      list: () => notEnabled("rates.list"),
    },
    escrows: {
      findById: () => notEnabled("escrows.findById"),
      findByTransactionId: () => notEnabled("escrows.findByTransactionId"),
      findByUserId: () => notEnabled("escrows.findByUserId"),
      findBySenderAddress: () => notEnabled("escrows.findBySenderAddress"),
      findByRecipientAddress: () => notEnabled("escrows.findByRecipientAddress"),
      create: () => notEnabled("escrows.create"),
      update: () => notEnabled("escrows.update"),
      list: () => notEnabled("escrows.list"),
    },
    meta: {
      get: () => notEnabled("meta.get"),
      set: () => notEnabled("meta.set"),
    },
  };
}

