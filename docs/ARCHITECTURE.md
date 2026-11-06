# Architecture

```
Browser ── wallet kit ──► Wallet (Albedo, xBull, Freighter, ...)
   │  fetch
   ▼
Next.js route handlers (src/app/api/*)  ── Zod validation, rate limits
   │
   ├── src/lib/routing.ts ─► Horizon (strict-send paths, fee stats)   [TTL cache 15 s, 8 s timeout]
   ├── src/lib/stellar.ts ─► build unsigned tx / submit signed tx
   ├── src/lib/tx-guard.ts   verifies signed XDR matches the quote
   ├── src/lib/wallet-auth.ts  SEP-10 challenge/verify
   ├── src/lib/sep24.ts ───► anchor stellar.toml + /info
   ├── src/lib/indexer.ts ─► Soroban RPC getEvents (escrow)
   └── src/lib/data/  repository layer
          ├── memory adapter (default, seeded, resets on restart)
          └── prisma adapter (stub, throws "not enabled in this build")
```

## Repository layer

`src/lib/data/repositories.ts` defines `UserRepository`, `TransactionRepository`, `RateRepository`, `EscrowRepository` and `MetaRepository` (key/value, used for the indexer cursor). `src/lib/data/index.ts` selects an adapter from `DATA_MODE` and logs the choice at startup. Monetary amounts are strings everywhere; arithmetic uses BigInt stroops (`src/lib/amounts.ts`). Rate history uses an in-memory TTL cache (`rate-cache.ts`).

Adding a real database means implementing these interfaces; no route or page imports an adapter directly.

## Send flow

1. `GET /api/stellar/routes` or `POST /api/stellar/send` runs `discoverRoutes` and returns the best route, alternatives and cost.
2. `send` builds an unsigned `pathPaymentStrictSend` with `destMin` (quote minus 1%), returns XDR.
3. The wallet signs. The server never has the key.
4. `POST /api/stellar/submit` runs `assertSignedXdrMatches` (source, single path-payment op, recipient, amount, valid source signature), then submits to Horizon.

## Auth

Sessions are JWT cookies. Email/password users are hashed (see `src/lib/auth.ts`). Wallet users sign in via SEP-10: challenge tx bound to the app's home domain, signed by server key and client, single-use. `JWT_SECRET` and `SEP10_SERVER_SECRET` are required in production.

## Persistence limits

Memory mode is for development. Rate limiting, SEP-10 used-challenge tracking and caches are per-process, so multiple instances need shared storage first.
