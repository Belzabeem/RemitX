import type { User, Transaction, Rate, Escrow } from "./types";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByStellarPublicKey(publicKey: string): Promise<User | null>;
  create(
    data: Omit<User, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
      createdAt?: string;
      updatedAt?: string;
    }
  ): Promise<User>;
  update(
    id: string,
    data: Partial<Omit<User, "id" | "createdAt">>
  ): Promise<User | null>;
  list(): Promise<User[]>;
}

export interface TransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ transactions: Transaction[]; total: number }>;
  create(
    data: Omit<Transaction, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
      createdAt?: string;
      updatedAt?: string;
    }
  ): Promise<Transaction>;
  update(
    id: string,
    data: Partial<Omit<Transaction, "id" | "createdAt">>
  ): Promise<Transaction | null>;
  list(): Promise<Transaction[]>;
}

export interface RateRepository {
  findRate(fromAsset: string, toAsset: string): Promise<Rate | null>;
  upsertRate(fromAsset: string, toAsset: string, rate: string): Promise<Rate>;
  list(): Promise<Rate[]>;
}

export interface EscrowRepository {
  findById(id: string): Promise<Escrow | null>;
  findByTransactionId(transactionId: string): Promise<Escrow | null>;
  findByUserId(userId: string): Promise<Escrow[]>;
  findBySenderAddress(senderAddress: string): Promise<Escrow[]>;
  findByRecipientAddress(recipientAddress: string): Promise<Escrow[]>;
  create(
    data: Omit<Escrow, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
      createdAt?: string;
      updatedAt?: string;
    }
  ): Promise<Escrow>;
  update(
    id: string,
    data: Partial<Omit<Escrow, "id" | "createdAt">>
  ): Promise<Escrow | null>;
  list(): Promise<Escrow[]>;
}

export interface DataRepositories {
  users: UserRepository;
  transactions: TransactionRepository;
  rates: RateRepository;
  escrows: EscrowRepository;
}

