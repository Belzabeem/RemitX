# Alignment with the Stellar dev skills

Checked against [skills.stellar.org](https://skills.stellar.org): `dapp`, `assets`, `data` and `standards`. This records what already matches, what was changed, and what is deliberately left open as contributor issues (see [WAVE-ISSUES.md](WAVE-ISSUES.md)).

## Already aligned

| Skill guidance | In RemitX |
|---|---|
| `@stellar/stellar-sdk` v16, Node 22+ | SDK `^16`; `engines.node >= 22` declared |
| Wallets Kit for multi-wallet; wallet signs, app never holds keys | `src/lib/wallet-context.tsx`; no secret key ever reaches the server |
| Show destination and amount before signing; prevent double submit | `/review` shows the full cost ledger; the sign button is disabled while busy |
| Classic assets over custom tokens | Classic assets via `STELLAR_<CODE>_ISSUER` |
| Validate the asset issuer, not just the code | Assets are keyed by code **and** issuer (`resolveAsset`) |
| Wallet network check | Wallet must report Testnet before sign-in |
| RPC preferred for contract events | The escrow indexer polls Soroban RPC `getEvents` (`src/lib/indexer.ts`) |

## Changed in this pass

- The Wallets Kit is now initialised with an explicit `network` (the skill's init does this).
- `package.json` declares `"engines": { "node": ">=22" }`.

## Intentionally different

- **Horizon is kept for routing and classic payments.** The `data` skill prefers RPC for new work, but path finding (`strictSendPaths`) exists only on Horizon. Account and balance reads and classic transaction submission also use Horizon today; whether any of those should move to RPC is left as issue 10.
- **Wallets Kit is installed from npm**, not JSR. The skill notes npm parity is maintained for now; switch if the maintainers stop publishing to npm.

## Not applicable

`smart-contracts`, `zk-proofs`, `agentic-payments` and `cross-chain` are out of scope for the current app. The Soroban crate under `contracts/` is covered by `docs/CONTRACTS.md`.
