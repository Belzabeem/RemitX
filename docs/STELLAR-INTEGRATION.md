# Stellar integration

- **Network:** testnet by default (`STELLAR_NETWORK`, `STELLAR_HORIZON_URL`). Mainnet is not supported until after an audit.
- **Assets:** XLM is native. Any other asset needs `STELLAR_<CODE>_ISSUER`; an unconfigured asset fails loudly instead of using a placeholder.
- **Route discovery:** Horizon `strictSendPaths`; results ranked by destination amount (ties prefer fewer hops). Fee estimate from `feeStats` p70, with a 10% buffer. Same-asset sends are direct 1:1 payments.
- **Sending:** `Operation.pathPaymentStrictSend` with `destMin`; signed in the user's wallet; checked by `tx-guard` before submit.
- **Wallet auth:** SEP-10 using `WebAuth` from `@stellar/stellar-sdk`. The challenge is never submitted to the network.
- **SEP-24:** `https://<home_domain>/.well-known/stellar.toml` -> `TRANSFER_SERVER_SEP0024` -> `/info`. Only discovery/info is implemented; there is no interactive deposit/withdraw flow yet.
- **Soroban:** `src/lib/indexer.ts` polls RPC `getEvents` for the escrow contract and updates escrow records; needs `ESCROW_CONTRACT_ID` and `SOROBAN_RPC_URL`. Not run against a live contract.
- **Wallets:** `@creit.tech/stellar-wallets-kit` v2; Albedo, xBull, Freighter, Rabet and Hana are offered. CSP allows Albedo and xBull hosts; not tested live.
