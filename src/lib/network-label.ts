/**
 * Which Stellar network the UI should describe. Defaults to testnet, which is
 * the only network the contracts and README support today. Set
 * NEXT_PUBLIC_STELLAR_NETWORK=public when the app is pointed at mainnet.
 */
export const NETWORK: "testnet" | "public" =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === "public" ? "public" : "testnet";

export const NETWORK_LABEL = NETWORK === "public" ? "Mainnet" : "Testnet";

export function explorerTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/${NETWORK}/tx/${hash}`;
}
