# Stellar Asset Issuers — RemitX

## Overview

XLM is Stellar's native asset and needs no issuer. Every other asset
(USD, NGN, PHP, GBP, USDC, EURC, etc.) requires a **real Stellar issuing
account** configured via `STELLAR_<CODE>_ISSUER` in `.env`.

On Stellar, an asset is identified by `(code, issuer)`, not code alone.
Without a configured issuer, `resolveAsset()` in `src/lib/stellar.ts`
throws and the corridor cannot go live.

## Testnet setup (drips wave)

1. Open [Stellar Laboratory — Testnet](https://laboratory.stellar.org/?network=testnet)
2. **Create Account** → generate one issuing account per asset
3. **Fund with Friendbot** for each public key
4. Copy the **Public Key** (starts with `G...`) into `.env`:

   ```
   STELLAR_USD_ISSUER=GB...your-usd-issuer
   STELLAR_NGN_ISSUER=GB...your-ngn-issuer
   STELLAR_PHP_ISSUER=GB...your-php-issuer
   STELLAR_GBP_ISSUER=GB...your-gbp-issuer
   ```

5. Restart the dev server (`npm run dev`) and verify at
   `GET /api/stellar/assets` — all four codes should appear alongside XLM.

## Trustlines (testnet)

For actual path payments, the sender's account must establish a trustline
to each issuing account. On testnet you can add trustlines via Stellar
Laboratory → **Change Trust** → enter asset code + issuer public key.

## Mainnet (post-audit)

Mainnet is not supported until after a security audit
(see `contracts#security-audit`). For mainnet, use real anchor-issued
assets:
- USDC: Circle's testnet/mainnet issuer (see Circle docs)
- NGNT / PHP / GBP: your corridor anchor's issuing account
- Consider wrapping assets in a **Stellar Asset Contract (SAC)**
  (`contracts#sac-issuance`) for use in Soroban escrow / exchange.

## Issue candidates

Create GitHub issues from these TODOs across the repo:

**Frontend (`frontend#`)**
- `frontend#rpc-migration` — Migrate Horizon calls to Stellar RPC
- `frontend#varial-wallet` — Add Varial wallet support
- `frontend#smart-accounts` — Add Smart Accounts (passkeys)
- `frontend#wallet-switch-network` — Testnet/mainnet network switch UI

**Backend (`backend#`)**
- `backend#sac-endpoints` — SAC issuance / redemption API routes
- `backend#sep-24` — Full SEP-24 deposit/withdraw flow
- `backend#sep-6` — SEP-6 anchor integration
- `backend#rate-limiting` — Per-IP / per-user API rate limiting

**Contracts (`contracts#`)**
- `contracts#sac-issuance` — SAC support in Soroban contracts
- `contracts#security-audit` — Pre-mainnet security audit
- `contracts#local-quickstart` — Local Quickstart for contract testing
- `contracts#upgradeability` — Upgradeable escrow / exchange
- `contracts#rate-limiting` — Per-address deposit rate limiting