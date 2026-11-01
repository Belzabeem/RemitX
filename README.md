# RemitX

**Cross-border remittance protocol on Stellar.**

RemitX enables fast, low-cost, non-custodial money transfers between Nigeria (NGN), the Philippines (PHP), the United Kingdom (GBP) and the United States (USD). A sender picks an amount and a recipient, RemitX finds the cheapest path across Stellar's anchor and liquidity network, and the funds settle in seconds, optionally held in a Soroban escrow until release conditions are met. Built on Soroban smart contracts with native Stellar path payments and anchor integration.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-000000?logo=next.js)](https://nextjs.org)
[![Stellar](https://img.shields.io/badge/Stellar-Network-7B00FF?logo=stellar)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Soroban-Runtime-000000?logo=stellar)](https://soroban.stellar.org)
[![Rust](https://img.shields.io/badge/Rust-1.97-dea584?logo=rust)](https://rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Table of contents

- [Why RemitX](#why-remitx)
- [How it works](#how-it-works)
- [Supported corridors](#supported-corridors)
- [Architecture](#architecture)
- [Routing and rates](#routing-and-rates)
- [Contract interface](#contract-interface)
- [Escrow mechanics](#escrow-mechanics)
- [Staking and governance](#staking-and-governance)
- [Fee structure](#fee-structure)
- [Security model](#security-model)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Running tests](#running-tests)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Resources](#resources)
- [License](#license)

---

## Why RemitX

Cross-border remittance is a $700+ billion annual market, and the people who depend on it most are served worst. A nurse in the UK sending money to family in Lagos, a gig worker in the US supporting parents in Manila: all of them lose money and time to the same three problems.

**Exorbitant fees.** Traditional providers charge 5–10% per transfer. On a $200 monthly remittance, that is $10–$20 lost every single time.

**Slow settlement.** International wires take 3–5 business days. When a family needs money for a medical bill or school fees, waiting is not an option.

**Opaque pricing.** Exchange rates are buried in the spread. Users rarely know the true cost until the transfer is done, and there is no side-by-side comparison of what each route actually charges.

RemitX puts the whole flow on Stellar. Settlement takes seconds, routes are compared in real time across anchors, and the full cost is shown before the sender confirms. When a transfer needs extra safety, an on-chain escrow holds the funds with a fixed expiry, so money is never stuck in limbo.

---

## How it works

### 1. Transfer initiation

The sender enters an amount and a recipient Stellar address. The app validates the input with Zod and the recipient key against Stellar's strkey format before anything touches the network.

### 2. Route and rate discovery

RemitX queries Stellar Horizon for liquidity paths and compares anchor fees and exchange rates for the chosen corridor. The best route and its full cost breakdown are shown up front. Rates are cached in the database to keep the UI fast.

### 3. Confirmation

The sender reviews the final amount, fees, rate and estimated arrival time, then confirms. No hidden spread.

### 4. Escrow or direct send

The sender chooses between two paths:

- **Direct:** a Stellar path payment sends funds to the recipient in one step.
- **Escrow:** the `Escrow` contract locks the funds on-chain with an expiry timestamp.

### 5. Settlement

For direct sends, the recipient receives funds in their asset via path payment, typically in under 5 seconds. For escrow, the platform authority calls `release()` before expiry to pay the recipient, minus the configured fee.

### 6. Refund safety net

If an escrow is never released and passes its expiry, the funds can be refunded to the sender. Nothing stays locked forever.

### 7. Indexing and history

Every state change emits an on-chain event. Transactions and escrows are tracked in Postgres so users get a full activity history with status updates.

---

## Supported corridors

| Currency | Region | Role |
|---|---|---|
| NGN | Nigeria | Receiving and sending |
| PHP | Philippines | Receiving |
| GBP | United Kingdom | Sending |
| USD | United States | Sending and settlement |

Corridors are served through Stellar anchors and on-chain liquidity. Multi-asset support for every corridor pair is in progress (see the [roadmap](#roadmap)).

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         RemitX Platform                          │
│                                                                  │
│  ┌──────────────────────┐        ┌───────────────────────────┐   │
│  │  Next.js 16 frontend │        │  Soroban contracts        │   │
│  │  TypeScript / Tailwind│       │                           │   │
│  │                      │        │  ┌─────────────────────┐  │   │
│  │  send · rates ·      │        │  │ Escrow              │  │   │
│  │  routes · activity · │        │  │ deposit/release/    │  │   │
│  │  anchors · review    │        │  │ refund              │  │   │
│  └──────────┬───────────┘        │  ├─────────────────────┤  │   │
│             │                    │  │ Exchange (CPMM)     │  │   │
│  ┌──────────▼───────────┐        │  │ swap · liquidity    │  │   │
│  │  API routes          │◄──────►│  ├─────────────────────┤  │   │
│  │  /api/stellar/*      │        │  │ Staking             │  │   │
│  │  /api/auth/*         │        │  │ stake · rewards     │  │   │
│  │  /api/transactions   │        │  ├─────────────────────┤  │   │
│  └──────────┬───────────┘        │  │ Governance          │  │   │
│             │                    │  │ propose · vote      │  │   │
│  ┌──────────▼───────────┐        │  └─────────────────────┘  │   │
│  │  remitx-core (Rust)  │        └─────────────┬─────────────┘   │
│  │  auth · jwt · rates  │                      │                 │
│  │  anchors · security  │                      │                 │
│  └──────────┬───────────┘                      │                 │
│             │                                  │                 │
│  ┌──────────▼───────────┐        ┌─────────────▼─────────────┐   │
│  │  Supabase (Postgres) │        │  Stellar Network + Horizon│   │
│  │  users · transactions│        │  path payments · anchors  │   │
│  │  rates · escrows     │        └───────────────────────────┘   │
│  └──────────────────────┘                                        │
└──────────────────────────────────────────────────────────────────┘
         ▲                                        ▼
   Sender wallet                           Recipient wallet
   (funds out)                             (funds in)
```

### Core components

**`EscrowContract`** — Holds transfers on-chain until release or expiry. Generates deterministic escrow IDs, collects a configurable fee, supports partial release, and emits events for off-chain indexing.

**`ExchangeContract`** — Constant product market maker (CPMM) for currency pairs. Manages pair creation, liquidity pools, LP shares, swaps with slippage protection, and per-pair fees in basis points.

**`StakingContract`** — Token staking with an APR-based reward pool. Tracks stake positions, pending rewards and claims.

**`GovernanceContract`** — Token-weighted proposals and voting with a quorum requirement, so protocol parameters can be changed by the community.

**`remitx-core`** — A Rust crate compiled to native and WebAssembly. It holds the security-sensitive business logic shared with the frontend: password hashing, JWT handling, input validation, strkey checks, CSRF and reset tokens, Turnstile verification, and rate and anchor helpers.

**Next.js app and API routes** — The web interface and the backend layer for user accounts, rates, Stellar account lookups, and transaction submission, backed by Supabase Postgres through Prisma.

---

## Routing and rates

RemitX does not hardcode a single provider. For every transfer it:

1. Queries Horizon for available liquidity paths between the source and destination asset.
2. Compares anchor fees and exchange rates for the corridor.
3. Surfaces the cheapest route with the full cost shown before confirmation.
4. Caches recent rates in the `rates` table to avoid refetching on every page load.

Relevant API routes live under `/api/stellar/` (`rate`, `routes`, `liquidity`, `send`, `submit`, `sign-and-submit`, `status`, `balance`, `account`) plus `/api/anchors` and `/api/public/rate`.

---

## Contract interface

All contracts are written in Rust with the Soroban SDK, one per folder under `contracts/`.

### Escrow

```rust
pub fn __constructor(
    env: Env,
    platform: Address,       // release authority
    fee_treasury: Address,
    fee_bps: u32,            // max 500 (5%)
);

pub fn deposit(
    env: Env,
    sender: Address,
    recipient: Address,
    amount: i128,
    asset: Address,
    expires_at: u64,
) -> BytesN<32>;             // escrow_id

pub fn release(env: Env, escrow_id: BytesN<32>, amount: Option<i128>) -> ReleaseResult;
pub fn refund(env: Env, escrow_id: BytesN<32>, amount: Option<i128>);
pub fn cancel(env: Env, escrow_id: BytesN<32>);
pub fn extend_expiry(env: Env, escrow_id: BytesN<32>, new_expires_at: u64);

pub fn get_escrow(env: Env, escrow_id: BytesN<32>) -> EscrowState;
pub fn get_escrow_count(env: Env) -> u32;
pub fn get_escrows_by_sender(env: Env, sender: Address) -> Vec<BytesN<32>>;
pub fn get_escrows_by_recipient(env: Env, recipient: Address) -> Vec<BytesN<32>>;
```

Admin functions: `set_fee_bps`, `set_fee_treasury`, `set_paused`, with getters `get_fee_bps`, `get_fee_treasury`, `is_paused`.

### Exchange

```rust
pub fn create_pair(env: Env, base: Address, quote: Address, fee_bps: u32) -> BytesN<32>;

pub fn add_liquidity(
    env: Env,
    provider: Address,
    pair_id: BytesN<32>,
    base_amount: i128,
    quote_amount: i128,
    min_shares: i128,
) -> i128;

pub fn remove_liquidity( /* provider, pair_id, shares, min amounts */ ) -> RemoveLiquidityResult;

pub fn swap(
    env: Env,
    sender: Address,
    pair_id: BytesN<32>,
    from_token: Address,
    amount_in: i128,
    min_amount_out: i128,    // slippage protection
) -> SwapResult;

pub fn get_rate(env: Env, base: Address, quote: Address) -> i128;
pub fn get_pair(env: Env, pair_id: BytesN<32>) -> ExchangePair;
pub fn get_pairs(env: Env) -> Vec<BytesN<32>>;
pub fn get_shares(env: Env, pair_id: BytesN<32>, provider: Address) -> i128;
```

Admin functions: `pause_pair`, `unpause_pair`, `set_fee_treasury`, `set_protocol_fee_bps`.

### Staking

```rust
pub fn __constructor(env: Env, admin: Address, token: Address);

pub fn stake(env: Env, staker: Address, amount: i128) -> StakeResult;
pub fn withdraw(env: Env, staker: Address, amount: i128) -> UnstakeResult;
pub fn claim_rewards(env: Env, staker: Address) -> ClaimResult;

pub fn get_stake(env: Env, staker: Address) -> StakePosition;
pub fn get_total_staked(env: Env) -> i128;
pub fn get_reward_pool(env: Env) -> i128;
pub fn get_apr(env: Env) -> u32;
```

Admin functions: `set_apr`, `fund_rewards`, `set_paused`, `slash`.

### Governance

```rust
pub fn __constructor(env: Env, admin: Address, token: Address, total_supply: i128);

pub fn propose(
    env: Env,
    proposer: Address,
    title: Symbol,
    description: Bytes,
    action_hash: BytesN<32>,
    voting_period: u64,
) -> u32;                    // proposal id

pub fn vote(env: Env, voter: Address, id: u32, support: bool) -> VoteResult;
pub fn execute(env: Env, id: u32) -> ExecuteResult;
pub fn cancel(env: Env, caller: Address, id: u32);

pub fn get_proposal(env: Env, id: u32) -> Proposal;
pub fn get_status(env: Env, id: u32) -> ProposalStatus;
pub fn has_voted(env: Env, id: u32, voter: Address) -> bool;
pub fn get_voting_power(env: Env, voter: Address) -> i128;
```

Admin functions: `extend_voting`, `set_quorum`.

### Key types

```rust
pub struct EscrowState {
    pub sender: Address,
    pub recipient: Address,
    pub amount: i128,
    pub asset: Address,
    pub status: EscrowStatus,
    pub created_at: u64,
    pub expires_at: u64,
    pub released_at: Option<u64>,
    pub refunded_at: Option<u64>,
    pub cancelled_at: Option<u64>,
    pub fee_collected: i128,
    pub release_count: u32,
}

pub enum EscrowStatus { Locked, Released, Refunded, Cancelled }

pub struct ExchangePair {
    pub base: Address,
    pub quote: Address,
    pub base_reserve: i128,
    pub quote_reserve: i128,
    pub total_shares: i128,
    pub fee_bps: u32,
    pub created_at: u64,
    pub last_update: u64,
    pub paused: bool,
}

pub struct StakePosition {
    pub amount: i128,
    pub pending_rewards: i128,
    pub last_update: u64,
    pub staked_at: u64,
    pub last_reward_claim: u64,
    pub total_rewards_claimed: i128,
}

pub enum ProposalStatus { Pending, Active, Passed, Rejected, Executed, Cancelled }
```

---

## Escrow mechanics

An escrow follows a simple lifecycle:

```
deposit() ──► Locked ──┬──► release()  ──► Released   (platform authority, before expiry)
                       ├──► refund()   ──► Refunded   (back to sender, after expiry)
                       └──► cancel()   ──► Cancelled
```

- **Deterministic IDs.** Each escrow ID is derived with SHA-256 on-chain, so IDs cannot be forged or collided.
- **Time-locked.** `expires_at` must be in the future at deposit. All time checks use the ledger timestamp.
- **Partial release.** `release()` accepts an optional `amount`. If it is less than the escrowed balance, the escrow stays `Locked` with the remainder intact.
- **Fee on release.** A fee in basis points (capped at 500) is deducted and sent to the fee treasury.
- **Pausable.** The platform can pause new activity in an emergency.

---

## Staking and governance

**Staking.** Holders stake the platform token to earn rewards from a funded reward pool at a configurable APR (basis points). Stake positions track pending rewards and lifetime claims, and rewards can be claimed without unstaking.

**Governance.** Token holders create proposals and vote yes or no, weighted by voting power. A proposal passes only if it meets the configured quorum (basis points of total supply). Passed proposals are executed on-chain, and each voter can vote once per proposal.

---

## Fee structure

| Cost | Who pays | Amount |
|---|---|---|
| Stellar network fee | Sender | Fractions of a cent per transaction |
| Escrow release fee | Deducted from escrowed amount | Configurable, `0`–`500` bps (default `0`) |
| Swap fee | Swapper | Per-pair `fee_bps` |
| Protocol swap fee | Swapper | Configurable `protocol_fee_bps` |
| Anchor deposit/withdrawal fee | Sender or recipient | Set by each anchor, compared in the app before confirming |

RemitX shows the total cost of every route before the sender confirms.

---

## Security model

### What RemitX can do

- Release escrowed funds to the named recipient, minus the configured fee
- Refund escrowed funds to the original sender after expiry
- Pause escrow and exchange pairs in an emergency

### What RemitX cannot do

- Release escrowed funds to anyone other than the recipient set at deposit
- Charge an escrow fee above 5% (hard cap in the contract)
- Release before a valid, unreleased escrow exists (state is checked on every call)
- Move user funds without the user's authorization (`require_auth` on all user actions)

### Application security

- Passwords hashed with bcrypt, sessions via JWT in httpOnly cookies
- CSRF tokens and signed password-reset tokens (HMAC-SHA256)
- Cloudflare Turnstile on auth flows (see [CLOUDFLARE_TURNSTILE_SETUP.md](CLOUDFLARE_TURNSTILE_SETUP.md))
- All API inputs validated with Zod, Stellar keys validated against strkey format
- Prompt-injection detection and input sanitisation in `remitx-core`
- Monetary amounts stored as strings in the database to avoid precision loss

### Compliance

KYC and AML hooks are handled by the backend API, with a `kycStatus` on every user (`pending`, `verified`, `rejected`). The document upload and verification flow is on the roadmap.

### Audit status

- [ ] Internal review: in progress
- [ ] External smart contract audit: planned pre-mainnet
- [ ] Bug bounty: planned post-audit

The contracts compile with overflow checks and have unit tests, but they have **not** been externally audited. Do not use them with real funds yet.

---

## Tech stack

| Layer | Technology |
|---|---|
| Smart contracts | Rust + Soroban SDK (escrow, exchange, staking, governance) |
| Core logic | `remitx-core` Rust crate (native + WebAssembly) |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| API | Next.js route handlers, Zod validation |
| Database | Supabase (PostgreSQL) via Prisma |
| Auth | bcrypt + JWT (httpOnly cookies), Cloudflare Turnstile |
| Blockchain | Stellar Network, Horizon, Soroban runtime, `@stellar/stellar-sdk` |

---

## Getting started

### Prerequisites

- Node.js 18+
- Rust 1.97+ with the `wasm32-unknown-unknown` target
- Soroban CLI (optional, for deployment)

### Install

```bash
git clone https://github.com/Northgate-Systems/RemitX.git
cd RemitX
npm install
```

### Configure

```bash
cp .env.example .env
# Fill in your values. Set STELLAR_NETWORK=testnet for testnet.
```

### Run the app

```bash
npm run dev
```

### Build the contracts

```bash
rustup target add wasm32-unknown-unknown
cd contracts
cargo build --release
```

---

## Running tests

```bash
# Frontend
npm run lint
npm run build

# Contracts
cd contracts/escrow     && cargo test
cd contracts/exchange   && cargo test
cd contracts/staking    && cargo test
cd contracts/governance && cargo test
```

Before opening a PR, make sure the Rust code passes formatting and lint checks:

```bash
cargo fmt --all -- --check
cargo clippy --workspace -- -D warnings
```

---

## Roadmap

### v0.1: Foundation
- [x] Database schema (Supabase / Prisma)
- [x] User authentication (bcrypt + JWT)
- [x] Next.js frontend scaffold

### v0.2: Smart contracts
- [x] Escrow contract
- [x] Exchange contract
- [x] Staking contract
- [x] Governance contract
- [ ] Multi-asset support for all corridors

### v0.3: Integration
- [ ] Backend API wired to contracts
- [ ] Path payment implementation
- [ ] Live Horizon rate fetching with database caching

### v0.4: User experience
- [ ] KYC document upload and verification flow
- [ ] Transaction history
- [ ] Staking dashboard
- [ ] Voting interface

### v1.0: Mainnet
- [ ] External security audit
- [ ] Bug bounty program
- [ ] Mainnet deployment
- [ ] Live anchor integrations for NGN, PHP, GBP and USD

---

## Contributing

RemitX is open source and welcomes developers, designers and community builders. Start with [CONTRIBUTING.md](CONTRIBUTING.md) for the claim flow, expected turnaround, PR checklist and bounty notes.

```bash
git clone https://github.com/<your-username>/RemitX.git
cd RemitX
git checkout -b feature/your-feature
```

### Guidelines

- Rust for all new smart contracts, TypeScript for all new app code
- Follow the existing component and file structure
- Run `npm run lint` before committing
- Validate all API inputs with Zod
- Test on desktop and mobile viewports
- Keep `.env.example` up to date

### Where to start

Check [FOUNDATION.md](FOUNDATION.md) for the intentionally stubbed areas and the full list of `// TODO(contributor)` markers, including real Stellar transaction building, live Horizon rate fetching, KYC upload, and wiring frontend pages to the API routes.

---

## Resources

- [FOUNDATION.md](FOUNDATION.md): foundation build summary and contributor TODOs
- [contracts/escrow/README.md](contracts/escrow/README.md): escrow contract docs
- [CLOUDFLARE_TURNSTILE_SETUP.md](CLOUDFLARE_TURNSTILE_SETUP.md): Turnstile setup guide
- [.env.example](.env.example): environment variable template

---

## License

MIT, see [LICENSE](./LICENSE).

---

*Built on [Stellar](https://stellar.org) and [Soroban](https://soroban.stellar.org).*
