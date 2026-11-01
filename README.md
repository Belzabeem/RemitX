# RemitX 🌍

**Cross-border remittances on the Stellar Network, in seconds.**
> Sending money home shouldn't cost a day's wages or take a week.

RemitX is a mobile-first dApp built on **Stellar** and **Soroban** that finds the cheapest route for every transfer, shows the full cost *before* you confirm, and settles in about five seconds. Senders can optionally lock funds in an on-chain **escrow** with a built-in expiry, so money is never stuck in limbo and never leaves the sender's control until it should.

Think of it as a price-comparison engine and a settlement layer in one: you pick an amount, RemitX picks the path.

**Corridors:** 🇳🇬 Nigeria (NGN) · 🇵🇭 Philippines (PHP) · 🇬🇧 United Kingdom (GBP) · 🇺🇸 United States (USD)

---

## 💡 Why RemitX?

Remittances are a $700+ billion market, and the people who rely on them most are served worst. Families sending money home lose a slice of every transfer and wait days for it to arrive.

| Problem | RemitX's Fix |
| --- | --- |
| Providers charge 5–10% per transfer, up to $20 lost on every $200 sent | Routes are compared across Stellar anchors and liquidity pools, and the cheapest wins |
| International wires take 3–5 business days | Stellar settles in about 5 seconds |
| The real cost hides in the exchange-rate spread | Rate, fees and arrival time are shown upfront, before you confirm |
| Sending to a stranger means trusting them with a lump sum | Optional escrow holds funds on-chain and refunds the sender automatically if they are never released |

**Common use cases:**

- 👨‍👩‍👧 **Family support**: send money home to loved ones, monthly or in emergencies
- 💼 **Diaspora and gig workers**: move earnings across borders without losing a chunk to fees
- 🎓 **School fees and bills**: pay with escrow so funds only release when the work is confirmed
- 🔄 **Liquidity providers**: add liquidity to currency pairs and earn swap fees

---

## 🚀 The Concept: How It Works

Every RemitX transfer follows the same short loop:

1. **Enter** the amount and the recipient's Stellar address.
2. **Compare**: RemitX queries Stellar for liquidity paths and anchor fees for the corridor and picks the cheapest route.
3. **Confirm**: you see the final rate, fees and estimated arrival time. No hidden spread.
4. **Send**: either directly via a Stellar path payment, or through the **Escrow** contract for extra safety.
5. **Settle**: the recipient is paid in seconds. An escrow that is never released can be refunded after it expires.

### The Escrow Lifecycle

```
deposit() ──► Locked ──┬──► release()  ──► Released   (platform authority, before expiry)
                       ├──► refund()   ──► Refunded   (back to sender, after expiry)
                       └──► cancel()   ──► Cancelled
```

**In plain terms:** the sender locks funds with an expiry time. Before expiry, only the platform authority can release them to the recipient (minus a small, capped fee). After expiry, the sender can take them back. There is no state where funds are stuck.

**Example:** A sender escrows 200 USDC for school fees with a 7-day expiry. Once the school confirms, the platform releases the funds to the recipient in a single transaction. If it never confirms, the sender refunds after day 7.

---

## ✨ Features in Detail

### 1. Best-Route Discovery

RemitX doesn't hardcode a single provider. For every transfer it queries Stellar Horizon for liquidity paths, compares anchor fees and exchange rates for the corridor, and surfaces the cheapest route. Recent rates are cached in the database so the UI stays fast.

### 2. On-Chain Escrow

The `Escrow` contract locks transfers until release or expiry. Escrow IDs are deterministic (SHA-256), releases support **partial amounts**, and a configurable fee (hard-capped at 5%) is sent to a treasury. The platform can pause the contract in an emergency, and every state change emits an event for off-chain indexing.

### 3. Built-In Currency Exchange

The `Exchange` contract is a **constant product market maker (CPMM)** for currency pairs. It supports pair creation, liquidity pools with LP shares, swaps with **slippage protection** (`min_amount_out`), and per-pair fees in basis points.

### 4. Staking and Governance

Token holders can stake to earn rewards from a funded reward pool at a configurable APR, and vote on protocol changes. Governance uses token-weighted voting with a **quorum requirement** (4% by default) and double-vote protection.

### 5. Safe by Construction

Contracts are compiled with **overflow checks** enabled, user actions require explicit authorization, and the shared Rust crate `remitx-core` handles password hashing, JWT sessions, CSRF tokens, input validation and Stellar key checks.

> ⚠️ The smart contracts have **not been externally audited**. Do not use them with real funds.

---

## 🛠 Project Structure

RemitX is organized so each layer can be worked on independently.

```
RemitX/
├── contracts/               # THE CORE PROTOCOL (Rust + Soroban)
│   ├── escrow/              # deposit, release, refund, cancel, extend_expiry
│   ├── exchange/            # CPMM pairs, liquidity, swaps
│   ├── staking/             # stake, withdraw, claim_rewards, APR
│   ├── governance/          # propose, vote, execute, quorum
│   └── src/                 # Shared types
│
├── src/                     # THE APP (Next.js 16 + TypeScript)
│   ├── app/(app)/           # Pages: dashboard, send, review, rates, routes, anchors, activity
│   └── app/api/             # API routes: auth, stellar (rate, routes, send, submit), transactions
│
├── core/                    # SHARED LOGIC (Rust, native + WebAssembly)
│   └── src/                 # auth, jwt, password, security, strkey, validation, rates, anchors
│
├── prisma/                  # DATABASE SCHEMA (Supabase / Postgres)
│   └── schema.prisma        # users, transactions, rates, escrows
│
└── docs/                    # Technical reference
    └── CONTRACTS.md         # Full contract interface
```

### What Each Layer Does

- **`contracts/`**: the source of truth for funds. Escrow, swaps, staking and voting are enforced on-chain, and nothing in the app can override what the contracts allow.
- **`src/`**: where users send money. The app finds routes, shows the cost breakdown, builds Stellar transactions and tracks activity history.
- **`core/`**: security-sensitive logic written once in Rust and shared with the frontend through WebAssembly.
- **`prisma/`**: users, transactions, cached rates and escrow records. Monetary amounts are stored as strings to avoid precision loss.

---

## 🤝 How to Contribute

We follow an **Issue-Oriented workflow**: pick an issue, comment to claim it, and open a PR that references it. One issue per PR keeps review fast. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full flow.

### Folder-Specific Guidelines

#### 🦀 Smart Contract Engineers (`/contracts`)

- **Focus:** Security, correct state handling and clear errors.
- **Setup:** `rustup` with the `wasm32-unknown-unknown` target.
- **Rule:** No logic change without a test update. Run `cargo test --workspace` before opening a PR.

#### ⚛️ Frontend and API Developers (`/src`)

- **Focus:** UX, wiring pages to API routes, and Stellar transaction building.
- **Setup:** `npm install`, then `npm run dev`.
- **Rule:** Pages must work on mobile and desktop. Validate every API input with Zod and run `npm run lint`.

#### 🔐 Core Library Engineers (`/core`)

- **Focus:** Auth, validation and security helpers.
- **Rule:** Keep changes small and covered by unit tests (`cargo test` inside `core/`).

---

## 🚦 Getting Started

**1. Clone the repository**

```bash
git clone https://github.com/Northgate-Systems/RemitX.git
cd RemitX
```

**2. Install and configure**

```bash
npm install
cp .env.example .env     # set STELLAR_NETWORK=testnet
```

**3. Run the app**

```bash
npm run dev
```

**4. Build and test the smart contracts**

```bash
rustup target add wasm32-unknown-unknown
cd contracts
cargo build --release
cargo test --workspace
```

**5. Run the app checks**

```bash
npm run lint
npx tsc --noEmit
npx vitest run
```

---

## 🗺 Roadmap

- [x] Database schema and authentication
- [x] Escrow, Exchange, Staking and Governance contracts
- [ ] Multi-asset support for all corridors
- [ ] Live Horizon rate fetching and real path payments
- [ ] KYC upload and verification flow
- [ ] Transaction history, staking dashboard and voting interface
- [ ] External security audit
- [ ] Mainnet launch with live NGN, PHP, GBP and USD anchors

---

## 📚 Learn More

- [Contract reference](docs/CONTRACTS.md)
- [Soroban Documentation](https://soroban.stellar.org/)
- [Stellar Developer Docs](https://developers.stellar.org/)
- [SEP-41 Token Interface Spec](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0041.md)
- [Security policy](SECURITY.md)

---

Built for the **Drips Stellar Wave**. Making money move across borders at the speed of light. 🌍
