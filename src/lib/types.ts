/**
 * Data model types for RemitX.
 * Kept aligned with prisma/schema.prisma and served by the data-access layer in @/lib/data.
 */

export type {
  KycStatus,
  TransactionStatus,
  EscrowStatus,
  User,
  Transaction,
  Rate,
  Escrow,
} from "./data/types";

// Re-export DataRepositories and repository interfaces
export type {
  UserRepository,
  TransactionRepository,
  RateRepository,
  EscrowRepository,
  DataRepositories,
} from "./data/repositories";

// Legacy Supabase Database type stub for any leftover imports
export type Database = {
  public: {
    Tables: Record<string, unknown>;
  };
};
