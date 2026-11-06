# RemitX Contract Reference

Public interface for the Soroban contracts in `contracts/`. See each contract's own folder for tests and implementation.


All contracts are written in Rust with the Soroban SDK, one per folder under `contracts/`.

## Escrow

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

## Exchange

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

## Staking

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

## Governance

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

## Key types

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

