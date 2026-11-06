# RemitX

Cross-border remittances on Stellar: compare routes, see the full cost before you sign, settle in one ledger close. Optional on-chain escrow with expiry and refund.

> **Status: testnet prototype.** The Soroban contracts are **not externally audited** and **not deployed** (see [docs/DEPLOYMENTS.md](docs/DEPLOYMENTS.md)). Do not use real funds. Data in the app is in-memory and resets on restart.

## What works today

- **Wallet sign-in** with Albedo, xBull, Freighter, Rabet or Hana via Stellar Wallets Kit. Login is a SEP-10 challenge your wallet signs; the server never sees a secret key.
- **Route discovery** against Horizon strict-send path finding, ranked by amount received, with network fee and a guaranteed minimum (1% slippage) enforced in the transaction itself.
- **Non-custodial sending:** the server builds an unsigned path payment, your wallet signs it, the server checks the signed XDR matches what was quoted, then submits it.
- **SEP-24 anchor lookup** from each anchor's `stellar.toml` and `/info`, failing gracefully when an anchor is down.
- **Public receipt verification** at `/verify` by transaction hash, plus CSV/JSON export of your history.
- **Escrow event indexer** for a deployed escrow contract (Soroban RPC `getEvents`, ledger cursor).
- Rust workspace in `contracts/` (escrow, exchange, staking, governance) and `core/` with tests, `cargo fmt` and clippy clean.

Not verified in the authoring environment (network access to Horizon, Soroban RPC and Friendbot was blocked): live testnet routing, live wallet popups, and any deployment. Unit tests use mocked Horizon responses.

## Development mode (no database)

```bash
npm install
npm run dev
```

No `.env`, no database, no credentials. The app starts with `DATA_MODE=memory`: a deterministic, seeded in-memory store behind the repository layer in `src/lib/data/`. Everything resets when the server restarts. `GET /api/health` reports `dataMode`, and the server logs the active mode at startup.

`DATA_MODE=prisma` is a documented stub that throws "not enabled in this build". `prisma/schema.prisma` documents the intended production model; nothing reads a `DATABASE_URL`.

To use testnet features (balances, Friendbot funding, routes) you only need network access to Horizon. Non-XLM assets need an issuer, e.g. `STELLAR_USDC_ISSUER`; see `.env.example`.

## Checks

```bash
npm run lint && npx tsc --noEmit && npm run test:coverage && npm run build
cd contracts && cargo fmt --all -- --check && cargo clippy --workspace --all-targets -- -D warnings && cargo test --workspace
cd ../core && cargo test
```

CI runs the same checks plus `cargo audit` and `npm audit` (the latter two report known, documented findings; see [docs/SECURITY-NOTES.md](docs/SECURITY-NOTES.md)). Current JS statement coverage is about 49%; the data layer, auth, routing, tx guard and indexer are covered, UI components are not.

## Layout

| Path | What |
| --- | --- |
| `src/app` | Next.js 16 pages and API routes |
| `src/lib/data` | Repository interfaces, memory adapter, Prisma stub |
| `src/lib` | Routing, Stellar helpers, SEP-10, SEP-24, indexer, tx guard |
| `contracts/` | Soroban contracts (Rust) |
| `core/` | Shared Rust security helpers |
| `docs/` | Architecture, threat model, Stellar integration, contracts, security notes |

## Docs

[Architecture](docs/ARCHITECTURE.md) · [Threat model](docs/THREAT-MODEL.md) · [Stellar integration](docs/STELLAR-INTEGRATION.md) · [Contracts](docs/CONTRACTS.md) · [Deployments](docs/DEPLOYMENTS.md) · [Security notes](docs/SECURITY-NOTES.md) · [Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md)

## Roadmap

- [x] Wallet sign-in (SEP-10) and non-custodial send flow
- [x] Horizon path-finding route discovery (unit-tested with mocks)
- [x] SEP-24 anchor info lookup
- [x] Repository layer with in-memory adapter (no DB needed to develop)
- [x] Escrow event indexer (not run against a live contract)
- [x] Escrow, Exchange, Staking, Governance contracts with tests
- [ ] Verify routing and sending end to end on live testnet
- [ ] Deploy contracts to testnet (see docs/DEPLOYMENTS.md)
- [ ] Production persistence (Postgres via Prisma adapter)
- [ ] Real SEP-24 interactive deposit/withdraw flow
- [ ] Email delivery for password reset
- [ ] External security audit
- [ ] Mainnet (not before the audit)

## License

See [LICENSE](LICENSE).
