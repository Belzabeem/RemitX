# Security notes

Status of known findings. Nothing here is hidden: if a scanner reports it, it is listed.
RemitX has **not been externally audited** and is testnet only.

## Persistence is not production-ready

All data (users, transactions, escrows, rate history, indexer cursor) lives in an
in-memory store (`DATA_MODE=memory`). It resets on every restart and is not shared
between server instances. Sessions are JWTs, so they survive until expiry, but the
users they point to do not. `DATA_MODE=prisma` is a stub that throws
"not enabled in this build". Production needs a real Postgres adapter behind
`src/lib/data/` (see the roadmap item "Production persistence").

Related in-process state with the same limit: rate limiting, SEP-10 single-use
challenge tracking, and the rate/route caches. Multiple instances need a shared store.

## npm audit (checked 2026-11-05)

`npm audit fix` (no `--force`) was applied, and `next` was bumped to 16.4.5, which
cleared the critical Next.js middleware/proxy advisory.

Remaining, after that:

| Area | Severity | Why it remains | Exposure |
| --- | --- | --- | --- |
| `@creit.tech/stellar-wallets-kit` → `@reown/appkit`, `@coinbase/cdp-sdk`, `abitype`, `viem`, `zod@3.22` (transitive) | high / moderate / low (about 29 prod) | Upstream dependency tree of the wallet kit; the only suggested fix downgrades the kit to 1.x, which loses the wallet modules we use. | The kit is loaded in the browser only. RemitX uses the Stellar wallet modules (Albedo, xBull, Freighter, Rabet, Hana) and does not use WalletConnect, Reown or the EVM modules. Re-check on each kit release. |
| `vitest` / `tinypool` | critical | Fix requires vitest 5.1, which conflicts with the current peer set (`ERESOLVE`). | Dev dependency only; never ships. Do not run the test runner against untrusted code. |
| `zod` (our direct dependency) | high | Audit flags memory use on oversized constrained collections. | Our schemas validate small objects and cap string lengths. Request bodies are size-limited by the platform. Revisit when a non-breaking fix exists. |

## cargo audit (contracts/, core/)

- `contracts/`: RUSTSEC-2026-0387 (`crypto-bigint 0.5.5`, timing variability). Transitive through `soroban-sdk`. Fix needs a `soroban-sdk` release that updates it. Contracts do not do secret-dependent big-integer arithmetic themselves. Warnings: `derivative` (RUSTSEC-2024-0388) and `paste` (RUSTSEC-2024-0436) are unmaintained, also transitive.
- `core/`: no findings at the time of checking.

## Known application caveats

- Password reset: the endpoint exists but no mailer is configured, so no email is delivered.
- `/api/auth/demo-login` exists for local demos. Disable it (or gate it) before any shared deployment: a GET that signs you in is a login-CSRF surface.
- Anchor fee figures on the Anchors page are estimates, not live anchor quotes. Live data comes only from each anchor's SEP-24 `/info`.
- CSP allows `unsafe-inline` and `unsafe-eval` because of Next.js and Turnstile. Tightening it needs nonces.
- Wallet popups (Albedo, xBull) and the CSP entries added for them have not been tested live from this build environment.
