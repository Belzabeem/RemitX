<div align="center">

# RemitX

**Send money across borders in seconds, not days.**

Fast, low-cost, transparent remittances on Stellar, with optional on-chain escrow.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://nextjs.org)
[![Stellar](https://img.shields.io/badge/Stellar-Soroban-7B00FF?logo=stellar)](https://stellar.org)
[![Rust](https://img.shields.io/badge/Rust-Contracts-dea584?logo=rust)](https://rust-lang.org)
[![CI](https://github.com/Northgate-Systems/RemitX/actions/workflows/ci.yml/badge.svg)](https://github.com/Northgate-Systems/RemitX/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/Contributions-Welcome-brightgreen.svg)](CONTRIBUTING.md)

[Live demo](https://remitx.app) (coming soon) · [Contract docs](docs/CONTRACTS.md) · [Contributing](CONTRIBUTING.md)

</div>

---

## Why RemitX

Remittances are a $700+ billion market, yet the people who rely on them most pay the most.

- **High fees:** providers take 5–10% per transfer. On $200 a month, that is up to $20 gone every time.
- **Slow settlement:** international wires take 3–5 business days.
- **Hidden pricing:** the real cost is buried in the exchange-rate spread.

RemitX fixes this on Stellar. It finds the cheapest route across anchors in real time, shows the full cost before you confirm, and settles in about 5 seconds.

**Corridors:** Nigeria (NGN) · Philippines (PHP) · United Kingdom (GBP) · United States (USD)

---

## How it works

1. **Enter** an amount and the recipient's Stellar address.
2. **Compare** routes. RemitX queries Stellar for liquidity paths and anchor fees and picks the cheapest.
3. **Confirm** with the final rate, fees and arrival time shown upfront.
4. **Send** directly via path payment, or lock the funds in an on-chain escrow for extra safety.
5. **Settle.** The recipient is paid in seconds. An unreleased escrow can always be refunded after it expires.

---

## Features

- **Best-route finding** across Stellar anchors and liquidity pools
- **Transparent pricing** with no hidden spread
- **On-chain escrow** with expiry, partial release and automatic refund path
- **Built-in exchange** using a constant product market maker for currency pairs
- **Staking and governance** so the community can earn rewards and shape the protocol
- **Mobile-first** interface with full activity history

---

## Architecture

```
  Sender wallet ──► Next.js app ──► API routes ──► Stellar Horizon ──► Recipient wallet
                        │               │
                        │               └──► Supabase (users, transactions, rates)
                        │
                        └──► Soroban contracts: Escrow · Exchange · Staking · Governance
```

| Contract | Purpose |
|---|---|
| **Escrow** | Locks transfers until release or expiry, with fee collection |
| **Exchange** | Currency swaps and liquidity pools |
| **Staking** | Stake tokens and earn rewards |
| **Governance** | Proposals and token-weighted voting |

Full function reference: [docs/CONTRACTS.md](docs/CONTRACTS.md)

---

## Tech stack

| | |
|---|---|
| **Contracts** | Rust, Soroban SDK |
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS |
| **Backend** | Next.js API routes, Prisma, Supabase (Postgres) |
| **Blockchain** | Stellar, Horizon, `@stellar/stellar-sdk` |

---

## Getting started

**Prerequisites:** Node.js 18+, Rust with the `wasm32-unknown-unknown` target.

```bash
git clone https://github.com/Northgate-Systems/RemitX.git
cd RemitX
npm install
cp .env.example .env     # set STELLAR_NETWORK=testnet
npm run dev
```

Build the contracts:

```bash
rustup target add wasm32-unknown-unknown
cd contracts && cargo build --release
```

### Tests

```bash
npm run lint && npm run build          # app
cd contracts && cargo test --workspace   # escrow, exchange, staking, governance
```

---

## Roadmap

- [x] Database schema and authentication
- [x] Escrow, Exchange, Staking and Governance contracts
- [ ] Multi-asset support for all corridors
- [ ] Backend wired to contracts, with live path payments and rate caching
- [ ] KYC flow, transaction history, staking dashboard, voting interface
- [ ] External security audit and bug bounty
- [ ] Mainnet launch with live NGN, PHP, GBP and USD anchors

---

## Security

The contracts use overflow checks and have 44 unit tests, but they have **not yet been externally audited**. Do not use them with real funds. To report a vulnerability, see [SECURITY.md](SECURITY.md).

---

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then check [FOUNDATION.md](FOUNDATION.md) for open `TODO(contributor)` items such as live Horizon rate fetching, real transaction building and KYC upload.

1. Fork the repo and create a branch: `git checkout -b feature/your-feature`
2. Run `npm run lint` (and `cargo fmt` / `cargo clippy` for Rust) before committing
3. Open a pull request

---

## License

MIT, see [LICENSE](LICENSE).

<div align="center">

Built on [Stellar](https://stellar.org) and [Soroban](https://soroban.stellar.org)

</div>
