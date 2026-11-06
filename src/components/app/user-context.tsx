"use client";

import { createContext, useContext } from "react";

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  stellarPublicKey: string | null;
  kycStatus: "pending" | "verified" | "rejected";
}

export interface UserState {
  user: CurrentUser | null;
  /** Re-read the signed-in user, e.g. after a wallet is created. */
  refresh: () => Promise<void>;
}

export const UserContext = createContext<UserState>({ user: null, refresh: async () => {} });

export function useCurrentUser(): UserState {
  return useContext(UserContext);
}
