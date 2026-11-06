# Drips Wave: ready-to-post issues

Each entry follows `.github/ISSUE_TEMPLATE/wave-task.md`. Copy the body into a new issue and apply the label shown. Every gap below was verified in the code, with the file named. None of them is implemented yet.

Skill references are to [skills.stellar.org](https://skills.stellar.org) (`dapp`, `assets`, `data`).

---

## 1. Check the recipient before building the transaction
**Label:** `good first issue` · **Complexity:** Medium

**Summary.** `POST /api/stellar/send` builds the transaction without checking the recipient. A missing account or a missing trustline for the destination asset only shows up after signing, as `op_no_destination` / `op_no_trust` on the network. The `assets` skill says to check the trustline exists before sending.

**Scope.** `src/app/api/stellar/send/route.ts`, `src/lib/stellar.ts`. Out of scope: creating trustlines for the recipient.

**Acceptance criteria**
- [ ] Send returns 422 with a plain message when the destination account does not exist
- [ ] Send returns 422 when the destination has no trustline for a non-XLM destination asset
- [ ] Tests cover account missing, trustline missing, and the happy path (fake Horizon, like `routing.test.ts`)

**How to verify.** `npx vitest run`, then try a never-funded address on `/send`.

---

## 2. Turn Horizon result codes into plain messages
**Label:** `good first issue` · **Complexity:** Trivial

**Summary.** `submitTransaction` returns a JSON `resultCode`, but the Review page ignores it and always shows "The network rejected the transfer." The `dapp` UX checklist asks for clear messages for common failures.

**Scope.** `src/lib/stellar.ts`, `src/app/(app)/review/page.tsx`. Add a pure `explainResultCode()` helper. Cover at least `op_underfunded`, `op_no_trust`, `op_no_destination`, `op_under_dest_min`, `tx_insufficient_balance`, `tx_bad_seq`, `tx_too_late`.

**Acceptance criteria**
- [ ] Helper maps each code above to a one-sentence message
- [ ] Review shows the message; unknown codes fall back to the current text
- [ ] Unit tests for every mapped code

**How to verify.** `npx vitest run src/lib`.

---

## 3. Make the XLM balance check reserve-aware
**Label:** `good first issue` · **Complexity:** Trivial

**Summary.** `buildSendTransaction` only compares balance to the send amount. An account can't spend its minimum reserve or the fee, so sending "everything" passes this check and then fails with `op_underfunded`.

**Scope.** `src/lib/stellar.ts` (the `available < toStroops(fromAmount)` check). Use the account's `subentry_count` for the reserve.

**Acceptance criteria**
- [ ] Sending XLM subtracts the base reserve and the network fee from what is spendable
- [ ] The error message says how much is spendable
- [ ] Tests for exact-balance and just-under cases

---

## 4. Handle transaction expiry on the Review page
**Label:** `help wanted` · **Complexity:** Medium

**Summary.** Transactions are built with `.setTimeout(180)`. A person who takes over 3 minutes in the wallet gets `tx_too_late` with no warning.

**Scope.** `src/app/(app)/review/page.tsx`, `src/lib/prepared-transfer.ts`. Out of scope: changing the 180s window.

**Acceptance criteria**
- [ ] Review shows a visible countdown or expiry time
- [ ] After expiry the sign button is replaced by "Start again" (back to `/send`)
- [ ] Prepared transfer storage records its creation time

---

## 5. Retry Horizon calls with backoff
**Label:** `good first issue` · **Complexity:** Medium

**Summary.** `src/lib/http.ts` has timeouts but no retry. The `data` skill recommends exponential backoff on HTTP 429 and transient 5xx.

**Scope.** `src/lib/http.ts`, then use it for read calls in `src/lib/stellar.ts` and `src/lib/routing.ts`. Never retry transaction submission.

**Acceptance criteria**
- [ ] `withRetry()` with capped exponential backoff and jitter, retrying only 429/5xx/timeouts
- [ ] Reads use it; `submitTransaction` does not
- [ ] Tests with fake timers

---

## 6. One network setting for server and client
**Label:** `help wanted` · **Complexity:** Medium

**Summary.** The server treats any `STELLAR_NETWORK` other than `"testnet"` as **mainnet** (`stellar.ts`, so a typo like `local` silently selects mainnet). The wallet check and kit init in `wallet-context.tsx` are hardcoded to Testnet, so a mainnet deployment would reject every wallet.

**Scope.** `src/lib/stellar.ts`, `src/lib/network-label.ts`, `src/lib/wallet-context.tsx`. Add one config module.

**Acceptance criteria**
- [ ] Unknown `STELLAR_NETWORK` values throw at startup instead of defaulting to mainnet
- [ ] Wallet network check and kit init read the same config as the server
- [ ] `.env.example` documents the variables
- [ ] Tests for each accepted value and for an invalid one

---

## 7. Let people add a missing trustline
**Label:** `help wanted` · **Complexity:** Medium

**Summary.** Sending or receiving a non-XLM asset needs a trustline. Today the person has to create it in another tool. Add a guided `changeTrust` step that the wallet signs.

**Scope.** New API route to build the unsigned `changeTrust` XDR; a button on Dashboard when a configured asset has no trustline. Reuse `signTransaction` from `useWallet`.

**Acceptance criteria**
- [ ] Dashboard shows "Add USDC" style actions only for configured assets with no trustline
- [ ] The wallet signs it; the app never sees a key
- [ ] Balance refreshes after confirmation

---

## 8. Testnet liquidity seeding script
**Label:** `good first issue` · **Complexity:** Medium

**Summary.** Configured assets (for example USD) often have no market on testnet, so Send shows "nobody is trading this pair". Add `scripts/seed-testnet-liquidity.mjs`, following the `assets` skill (issuer, distributor, `changeTrust`, then `manageSellOffer`).

**Scope.** `scripts/`, README section. Testnet only: the script must refuse to run against the public network.

**Acceptance criteria**
- [ ] Reads keys from env, never from arguments
- [ ] Creates trustline, mints to the distributor, posts offers in both directions
- [ ] After running it, `/routes` finds a path for the pair
- [ ] README documents it

---

## 9. Warn about issuer flags before listing an asset
**Label:** `help wanted` · **Complexity:** Medium

**Summary.** The `assets` skill says to check `AUTH_REVOCABLE` / `AUTH_CLAWBACK_ENABLED` before listing an asset, since balances can then be frozen or clawed back. RemitX trusts any configured issuer.

**Scope.** `/api/stellar/assets`; show a caution in the Send asset picker.

**Acceptance criteria**
- [ ] Read issuer account flags from Horizon (cached)
- [ ] Assets with revocable or clawback flags are marked and explained
- [ ] Tests with a fake Horizon

---

## 10. Write an RPC vs Horizon decision record
**Label:** `good first issue` · **Complexity:** Trivial

**Summary.** The `data` skill prefers RPC for new projects. Document which RemitX calls must stay on Horizon (path finding has no RPC equivalent) and which could move (account loading, transaction submission). The escrow indexer already uses RPC.

**Scope.** `docs/` only; no code change.

**Acceptance criteria**
- [ ] Table of every Horizon call with "keep" or "can move" and why
- [ ] Linked from `docs/ARCHITECTURE.md`

---

## 11. Component tests for the wallet and send flow
**Label:** `good first issue` · **Complexity:** Medium

**Summary.** The 135 tests cover server logic only. Add React Testing Library tests for `ConnectDialog` (available vs missing wallets, busy state, error) and the Send page (quote, no-route message, needs-wallet state).

**Scope.** `vitest.config.ts` (jsdom), new `*.test.tsx` files. Mock `useWallet` and `api`.

**Acceptance criteria**
- [ ] jsdom environment configured without breaking existing tests
- [ ] At least 6 component tests across the two areas
- [ ] CI runs them
