# RemitX

**Cross-border remittance routing protocol on Stellar.**

RemitX is a mobile-first dApp built on Stellar and Soroban that finds the cheapest route for every transfer, shows the full cost before you confirm, and settles in about five seconds. Senders can optionally lock funds in an on-chain escrow with a built-in expiry, so money is never stuck in limbo and never leaves the sender's control until it should. Route discovery uses Stellar DEX liquidity and SEP-24 anchors, with real-time exchange rate tracking.

Think of it as a price-comparison engine and a settlement layer in one: you pick an amount, RemitX picks the path.

Live app: [remitxx.vercel.app](https://remitxx.vercel.app)

---

## Table of contents

- [Why RemitX](#why-remitx)
- [How it works](#how-it-works)
- [Supported corridors](#supported-corridors)
- [Architecture](#architecture)
- [Routing layer](#routing-layer)
- [Contract interface](#contract-interface)
- [Escrow lifecycle](#escrow-lifecycle)
- [Settlement mechanics](#settlement-mechanics)
- [API reference](#api-reference)
- [Fee structure](#fee-structure)
- [Security model](#security-model)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Why RemitX

Traditional remittance fails the people who rely on it most. A family in Nigeria, a nurse's relatives in the Philippines, a gig worker sending earnings home from the UK — all of them lose a slice of every transfer and wait days for it to arrive. The barriers are structural: providers charge 5–10% per transfer, international wires take 3–5 business days, and the real cost hides inside the exchange-rate spread.

Remittances are a $700+ billion market, and the cost of moving money is paid almost entirely by the senders who can least afford it. On a $200 transfer, up to $20 disappears before the money arrives.

RemitX puts a better model on Stellar. Routes are compared across anchors and liquidity pools and the cheapest wins. Rate, fees and arrival time are shown upfront, before you confirm. Stellar settles in about five seconds. And when sending to someone you can't fully trust with a lump sum, optional on-chain escrow holds the funds and refunds the sender automatically if they are never released.

| Problem | RemitX's fix |
|---|---|
| Providers charge 5–10% per transfer, up to $20 lost on every $200 sent | Routes are compared across Stellar anchors and liquidity pools, and the cheapest wins |
| International wires take 3–5 business days | Stellar settles in about 5 seconds |
| The real cost hides in the exchange-rate spread | Rate, fees and arrival time are shown upfront, before you confirm |
| Sending to a stranger means trusting them with a lump sum | Optional escrow holds funds on-chain and refunds the sender automatically if they are never released |

### Common use cases

- **Family support:** send money home to loved ones, monthly or in emergencies
- **Diaspora and gig workers:** move earnings across borders without losing a chunk to fees
- **School fees and bills:** pay with escrow so funds only release when the work is confirmed
- **Liquidity providers:** add liquidity to currency pairs and earn swap fees

---

## How it works

### 1. Enter

The sender enters the amount and the recipient's Stellar address. No account at the destination anchor is needed beforehand.

### 2. Compare

RemitX queries Stellar Horizon for liquidity paths and gathers anchor fees and exchange rates for the corridor. It ranks every available route by total cost and picks the cheapest.

### 3. Confirm

The sender sees the final rate, fees and estimated arrival time. There is no hidden spread. Nothing is signed until the sender confirms.

### 4. Send

The transfer goes out one of two ways:

- **Direct:** a Stellar path payment that converts and delivers in one transaction.
- **Escrow:** the sender calls `deposit()` on the `Escrow` contract, locking funds with an expiry.

### 5. Settle

The recipient is paid in seconds. An escrow that is never released can be refunded to the sender after it expires.

---

## Supported corridors

### Nigeria
- **Currency:** NGN
- **Typical flows:** inbound family support, diaspora transfers, school fees
- **Route sources:** Stellar DEX liquidity, SEP-24 anchors

### Philippines
- **Currency:** PHP
- **Typical flows:** inbound family support, worker remittances
- **Route sources:** Stellar DEX liquidity, SEP-24 anchors

### United Kingdom
- **Currency:** GBP
- **Typical flows:** outbound diaspora and gig-worker transfers
- **Route sources:** Stellar DEX liquidity, SEP-24 anchors

### United States
- **Currency:** USD
- **Typical flows:** outbound diaspora and gig-worker transfers
- **Route sources:** Stellar DEX liquidity, SEP-24 anchors

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         RemitX Protocol                          │
│                                                                  │
│  ┌─────────────────┐    ┌──────────────────┐                    │
│  │   Next.js App   │    │   remitx-core    │                    │
│  │                 │    │   (Rust + WASM)  │                    │
│  │  send / review  │◄───│  auth, jwt, csrf │                    │
│  │  rates / routes │    │  validation      │                    │
│  │  anchors / feed │    │  strkey checks   │                    │
│  └────────┬────────┘    └──────────────────┘                    │
│           │                                                     │
│  ┌────────▼────────┐    ┌──────────────────┐                    │
│  │   API Routes    │───►│  Prisma / Postgres│                   │
│  │                 │    │                  │                    │
│  │  auth, stellar  │    │  users, rates    │                    │
│  │  transactions   │    │  transactions    │                    │
│  └────────┬────────┘    │  escrows         │                    │
│           │             └──────────────────┘                    │
│  ┌────────▼────────────────────────────────┐                    │
│  │          Soroban Contracts              │                    │
│  │                                         │                    │
│  │  Escrow · Exchange · Staking · Governance                    │
│  └────────┬────────────────────────────────┘                    │
│           │                                                     │
│  ┌────────▼────────┐                                            │
│  │ Stellar Network │                                            │
│  │ Horizon · DEX   │                                            │
│  │ SEP-24 anchors  │                                            │
│  └─────────────────┘                                            │
└──────────────────────────────────────────────────────────────────┘
         ▲                                      ▼
   Sender wallet                         Recipient wallet
   (funds out)                           (funds in)
```

### Core components

**`Escrow`** — Soroban contract that locks transfers until release or expiry. Escrow IDs are deterministic (SHA-256), releases support partial amounts, and a configurable fee (hard-capped at 5%) is sent to a treasury. Can be paused in an emergency. Emits an event on every state change.

**`Exchange`** — Constant product market maker (CPMM) for currency pairs. Handles pair creation, liquidity pools with LP shares, and swaps with slippage protection (`min_amount_out`). Fees are set per pair in basis points.

**`Staking`** — Lets token holders stake to earn rewards from a funded reward pool at a configurable APR.

**`Governance`** — Token-weighted voting on protocol changes, with a quorum requirement (4% by default) and double-vote protection.

**`remitx-core`** — Shared Rust crate compiled natively and to WebAssembly. Handles password hashing, JWT sessions, CSRF tokens, input validation and Stellar key checks, written once and shared with the frontend.

**`src/`** — Next.js 16 + TypeScript app. Finds routes, shows the cost breakdown, builds Stellar transactions and tracks activity history.

**`prisma/`** — Database schema for users, transactions, cached rates and escrow records. Monetary amounts are stored as strings to avoid precision loss.

---

## Routing layer

The routing layer is the most important component of RemitX. A single hardcoded provider is a pricing trap. Comparing every available path per transfer is the solution.

### Route sources

**Liquidity paths:** Stellar Horizon path-finding across DEX orderbooks and liquidity pools.

**Anchor routes:** SEP-24 anchors for each corridor, including their fees and quoted exchange rates.

**Rate cache:** Recent rates are cached in the database so the UI stays fast between live Horizon fetches.

### Route selection

For each transfer, RemitX builds a candidate list of routes and compares them on:

```
rate:           effective exchange rate after spread
fees:           anchor fees + network fees + escrow fee (if used)
arrival_time:   estimated settlement time
```

The route with the lowest total cost for the recipient is surfaced as the default. The full breakdown is displayed before the sender confirms.

---

## Contract interface

> Full interface: [docs/CONTRACTS.md](./docs/CONTRACTS.md)

### `deposit`

```rust
pub fn deposit(
    env: Env,
    sender: Address,
    recipient: Address,
    token: Address,
    amount: i128,
    expiry: u64,
) -> BytesN<32>;   // deterministic escrow ID (SHA-256)
```

---

### `release`

```rust
pub fn release(
    env: Env,
    escrow_id: BytesN<32>,
    amount: i128,       // partial releases supported
) -> ();
```

---

### `refund`

```rust
pub fn refund(
    env: Env,
    escrow_id: BytesN<32>,
) -> ();
```

---

### `cancel`

```rust
pub fn cancel(
    env: Env,
    escrow_id: BytesN<32>,
) -> ();
```

---

### `extend_expiry`

```rust
pub fn extend_expiry(
    env: Env,
    escrow_id: BytesN<32>,
    new_expiry: u64,
) -> ();
```

---

### Other contract entry points

| Contract | Functions |
|---|---|
| `Exchange` | pair creation, add/remove liquidity, swap with `min_amount_out` |
| `Staking` | `stake`, `withdraw`, `claim_rewards` |
| `Governance` | `propose`, `vote`, `execute` |

### Key types

```rust
pub enum EscrowState {
    Locked,
    Released,
    Refunded,
    Cancelled,
}
```

---

## Escrow lifecycle

```
deposit() ──► Locked ──┬──► release()  ──► Released   (platform authority, before expiry)
                       ├──► refund()   ──► Refunded   (back to sender, after expiry)
                       └──► cancel()   ──► Cancelled
```

The sender locks funds with an expiry time. Before expiry, only the platform authority can release them to the recipient, minus a small, capped fee. After expiry, the sender can take them back. There is no state where funds are stuck.

**Example:** A sender escrows 200 USDC for school fees with a 7-day expiry. Once the school confirms, the platform releases the funds to the recipient in a single transaction. If it never confirms, the sender refunds after day 7.

---

## Settlement mechanics

Direct transfers settle through a Stellar path payment: the sender's asset is converted along the chosen route and the recipient receives their asset in the same transaction, in about five seconds.

Escrowed transfers settle on `release()`. The contract pays the recipient, sends the capped fee to the treasury, emits a release event for off-chain indexing, and the transaction is recorded in the database for activity history.

For liquidity providers, `Exchange` swaps execute against the CPMM pool with a `min_amount_out` check. If slippage exceeds the caller's tolerance, the swap reverts.

---

## API reference

All routes live under `src/app/api/` and validate input with Zod.

| Route group | Purpose |
|---|---|
| `auth` | Sign up, sign in, session handling |
| `stellar/rate` | Live and cached exchange rates for a corridor |
| `stellar/routes` | Route discovery and comparison for a transfer |
| `stellar/send` | Build the Stellar transaction for a confirmed route |
| `stellar/submit` | Submit a signed transaction to the network |
| `transactions` | Activity history for the signed-in user |

### App pages

`dashboard` · `send` · `review` · `rates` · `routes` · `anchors` · `activity`

---

## Fee structure

| Cost | Who pays | Amount |
|---|---|---|
| Stellar network fee | Sender | Standard network fee per transaction |
| Anchor fee | Sender | Set by the anchor, shown before confirm |
| Escrow release fee | Deducted from release | Configurable, hard-capped at 5% |
| Swap fee | Swapper | Set per pair in basis points |
| Staking rewards | Reward pool | Configurable APR |

There is no hidden exchange-rate spread. Every fee is displayed on the review screen before the sender confirms.

---

## Security model

### What RemitX can do

- Lock a sender's funds in escrow until release or expiry
- Release escrowed funds to the recipient before expiry, by the platform authority
- Charge an escrow fee up to the configured rate, never above the 5% cap
- Pause the `Escrow` contract in an emergency

### What RemitX cannot do

- Leave funds stuck: after expiry the sender can always refund
- Charge an escrow fee above 5%
- Act on a user's funds without their explicit authorization
- Execute a swap that breaks the caller's `min_amount_out`

### Threat model

**Overflow and arithmetic errors:** Contracts are compiled with overflow checks enabled.

**Unauthorized actions:** User actions require explicit authorization on-chain.

**Web session attacks:** `remitx-core` handles password hashing, JWT sessions and CSRF tokens in one audited-by-tests Rust crate shared with the frontend.

**Malformed input:** Every API input is validated with Zod, and Stellar keys are checked with strkey validation in `remitx-core`.

**Governance abuse:** Voting is token-weighted with a quorum requirement and double-vote protection.

### Audit status

- [ ] Internal review — in progress
- [ ] External audit — planned pre-mainnet
- [ ] Bug bounty — planned post-audit

> **Warning:** the smart contracts have not been externally audited. Do not use them with real funds.

See [SECURITY.md](./SECURITY.md) for the disclosure policy.

---

## Roadmap

### v0.1 — Foundation
- [ ] Database schema and authentication
- [ ] `Escrow`, `Exchange`, `Staking` and `Governance` contracts

### v0.2 — Live routing
- [ ] Multi-asset support for all corridors
- [ ] Live Horizon rate fetching and real path payments
- [ ] KYC upload and verification flow

### v0.3 — Dashboards
- [ ] Transaction history
- [ ] Staking dashboard
- [ ] Voting interface

### v1.0 — Mainnet
- [ ] External security audit
- [ ] Mainnet launch with live NGN, PHP, GBP and USD anchors

---

## Contributing

RemitX follows an issue-oriented workflow: pick an issue, comment to claim it, and open a PR that references it. One issue per PR keeps review fast. See [CONTRIBUTING.md](./CONTRIBUTING.md) for full guidelines.

```bash
git clone https://github.com/Northgate-Systems/RemitX.git
cd RemitX
npm install
cp .env.example .env     # set STELLAR_NETWORK=testnet
npm run dev
```

### Smart contracts (`/contracts`)

```bash
rustup target add wasm32-unknown-unknown
cd contracts
cargo build --release
cargo test --workspace
```

No logic change without a test update.

### App and API (`/src`)

```bash
npm run lint
npx tsc --noEmit
npx vitest run
```

Pages must work on mobile and desktop. Validate every API input with Zod.

### Core library (`/core`)

```bash
cd core
cargo test
```

Keep changes small and covered by unit tests.

---

## License

MIT — see [LICENSE](./LICENSE).

---

*Built on [Stellar](https://stellar.org) and [Soroban](https://soroban.stellar.org). Built for the Drips Stellar Wave.*
