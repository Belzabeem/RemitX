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

// Minimal Database type for Supabase client type parameter.
// The app runs in memory mode by default; this is only used when Supabase
// env vars are configured (production). Replace with Prisma-generated types
// when connecting a real Supabase project.
export type Database = {
  public: {
    Tables: {
      users: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      transactions: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      rates: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      escrows: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
