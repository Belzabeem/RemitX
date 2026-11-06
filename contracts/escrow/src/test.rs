//! Unit tests for the RemitX Escrow Contract.
//!
//! Deploys a minimal mock token contract to satisfy the token transfers
//! performed by deposit()/release()/refund(), then tests all contract
//! behaviors end to end.

#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env};

// ---------------------------------------------------------------------------
// Minimal mock token contract (test-only), implementing the transfer/balance
// surface needed by the escrow contract.
// ---------------------------------------------------------------------------

#[derive(Clone, Debug, Eq, PartialEq)]
#[soroban_sdk::contracttype]
pub enum MockTokenDataKey {
    Balance(Address),
}

#[contract]
pub struct MockToken;

#[contractimpl]
impl MockToken {
    /// Mint `amount` of the token to `to`.
    pub fn mint(env: Env, to: Address, amount: i128) {
        let cur: i128 = env
            .storage()
            .instance()
            .get(&MockTokenDataKey::Balance(to.clone()))
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&MockTokenDataKey::Balance(to), &(cur + amount));
    }

    /// Return the balance of `id`.
    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .instance()
            .get(&MockTokenDataKey::Balance(id))
            .unwrap_or(0)
    }

    /// Transfer `amount` from `from` to `to`.
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        let from_bal: i128 = env
            .storage()
            .instance()
            .get(&MockTokenDataKey::Balance(from.clone()))
            .unwrap_or(0);
        if from_bal < amount {
            panic!("insufficient balance");
        }
        let to_bal: i128 = env
            .storage()
            .instance()
            .get(&MockTokenDataKey::Balance(to.clone()))
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&MockTokenDataKey::Balance(from), &(from_bal - amount));
        env.storage()
            .instance()
            .set(&MockTokenDataKey::Balance(to), &(to_bal + amount));
    }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

struct TestHarness<'a> {
    escrow: EscrowContractClient<'a>,
    token: MockTokenClient<'a>,
    sender: Address,
    recipient: Address,
    contract_id: Address,
}

/// Deploy mock token + escrow, mint funds, and return the harness.
fn setup(env: &Env) -> TestHarness<'_> {
    env.mock_all_auths();

    // Deploy mock token.
    let token = MockTokenClient::new(env, &env.register(MockToken, ()));

    // Fund two addresses.
    let sender = Address::generate(env);
    let recipient = Address::generate(env);
    token.mint(&sender, &10_000_000i128);
    token.mint(&recipient, &5_000_000i128);

    // Deploy escrow with the platform release authority, fee treasury, and fee.
    let platform = Address::generate(env);
    let fee_treasury = Address::generate(env);
    let contract_id = env.register(EscrowContract, (platform, fee_treasury, 0u32));
    let escrow = EscrowContractClient::new(env, &contract_id);

    TestHarness {
        escrow,
        token,
        sender,
        recipient,
        contract_id,
    }
}

/// Create a funded escrow expiring in `expires_in` seconds.
fn create_escrow(h: &TestHarness, expires_in: u64) -> BytesN<32> {
    let amount: i128 = 1_000_000;
    let expires_at = h.escrow.env.ledger().timestamp() + expires_in;
    h.escrow.deposit(
        &h.sender,
        &h.recipient,
        &amount,
        &h.token.address,
        &expires_at,
    )
}

// ---------------------------------------------------------------------------
// deposit() tests
// ---------------------------------------------------------------------------

#[test]
fn test_deposit_locks_funds() {
    let env = Env::default();
    let h = setup(&env);
    let id = create_escrow(&h, 3600);

    // Funds moved from sender into the escrow contract.
    assert_eq!(h.token.balance(&h.sender), 9_000_000i128);
    assert_eq!(h.token.balance(&h.contract_id), 1_000_000i128);

    let state = h.escrow.get_escrow(&id);
    assert_eq!(state.status, EscrowStatus::Locked);
    assert_eq!(state.amount, 1_000_000i128);
    assert_eq!(state.sender, h.sender);
    assert_eq!(state.recipient, h.recipient);
    assert_eq!(h.escrow.get_escrow_count(), 1);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_deposit_zero_amount_panics() {
    let env = Env::default();
    let h = setup(&env);
    let expires_at = env.ledger().timestamp() + 3600;
    h.escrow.deposit(
        &h.sender,
        &h.recipient,
        &0i128,
        &h.token.address,
        &expires_at,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_deposit_past_expiry_panics() {
    let env = Env::default();
    let h = setup(&env);
    let expires_at = env.ledger().timestamp(); // now == expiry, not strictly after
    h.escrow.deposit(
        &h.sender,
        &h.recipient,
        &1_000_000i128,
        &h.token.address,
        &expires_at,
    );
}

// ---------------------------------------------------------------------------
// release() tests
// ---------------------------------------------------------------------------

#[test]
fn test_release_before_expiry() {
    let env = Env::default();
    let h = setup(&env);
    let id = create_escrow(&h, 3600);

    h.escrow.release(&id, &None);
    let state = h.escrow.get_escrow(&id);
    assert_eq!(state.status, EscrowStatus::Released);

    // Funds moved to recipient.
    assert_eq!(h.token.balance(&h.recipient), 6_000_000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_release_after_expiry_panics() {
    let env = Env::default();
    let h = setup(&env);
    let id = create_escrow(&h, 3600);
    env.ledger().set_timestamp(env.ledger().timestamp() + 7200);
    h.escrow.release(&id, &None);
}

// ---------------------------------------------------------------------------
// refund() tests
// ---------------------------------------------------------------------------

#[test]
fn test_refund_after_expiry() {
    let env = Env::default();
    let h = setup(&env);
    let id = create_escrow(&h, 3600);
    env.ledger().set_timestamp(env.ledger().timestamp() + 7200);

    h.escrow.refund(&id, &None);
    let state = h.escrow.get_escrow(&id);
    assert_eq!(state.status, EscrowStatus::Refunded);

    // Funds returned to sender.
    assert_eq!(h.token.balance(&h.sender), 10_000_000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_refund_before_expiry_panics() {
    let env = Env::default();
    let h = setup(&env);
    let id = create_escrow(&h, 3600);
    h.escrow.refund(&id, &None);
}

// ---------------------------------------------------------------------------
// Guard tests (double actions + non-existent escrows)
// ---------------------------------------------------------------------------

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_double_release_prevented() {
    let env = Env::default();
    let h = setup(&env);
    let id = create_escrow(&h, 3600);
    h.escrow.release(&id, &None);
    h.escrow.release(&id, &None);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_double_refund_prevented() {
    let env = Env::default();
    let h = setup(&env);
    let id = create_escrow(&h, 3600);
    env.ledger().set_timestamp(env.ledger().timestamp() + 7200);
    h.escrow.refund(&id, &None);
    h.escrow.refund(&id, &None);
}

#[test]
#[should_panic(expected = "Escrow not found")]
fn test_release_nonexistent_escrow() {
    let env = Env::default();
    let h = setup(&env);
    let fake_id = BytesN::from_array(&env, &[0u8; 32]);
    h.escrow.release(&fake_id, &None);
}

#[test]
#[should_panic(expected = "Escrow not found")]
fn test_refund_nonexistent_escrow() {
    let env = Env::default();
    let h = setup(&env);
    let fake_id = BytesN::from_array(&env, &[0u8; 32]);
    h.escrow.refund(&fake_id, &None);
}

// ---------------------------------------------------------------------------
// Hardening tests: partial-release / partial-refund accounting
// ---------------------------------------------------------------------------

/// Like `setup`, but exposes the platform and treasury and lets the caller
/// choose the release fee.
fn setup_ex(env: &Env, fee_bps: u32) -> (TestHarness<'_>, Address, Address) {
    env.mock_all_auths();
    let token = MockTokenClient::new(env, &env.register(MockToken, ()));
    let sender = Address::generate(env);
    let recipient = Address::generate(env);
    token.mint(&sender, &10_000_000i128);
    let platform = Address::generate(env);
    let treasury = Address::generate(env);
    let contract_id = env.register(EscrowContract, (&platform, &treasury, fee_bps));
    let escrow = EscrowContractClient::new(env, &contract_id);
    (
        TestHarness {
            escrow,
            token,
            sender,
            recipient,
            contract_id,
        },
        platform,
        treasury,
    )
}

#[test]
fn test_partial_releases_sum_exactly_to_deposit() {
    let env = Env::default();
    let (h, _p, _t) = setup_ex(&env, 0);
    let id = create_escrow(&h, 3600);
    h.escrow.release(&id, &Some(400_000));
    assert_eq!(h.escrow.get_escrow(&id).status, EscrowStatus::Locked);
    h.escrow.release(&id, &Some(350_000));
    h.escrow.release(&id, &Some(250_000));
    let st = h.escrow.get_escrow(&id);
    assert_eq!(st.status, EscrowStatus::Released);
    assert_eq!(st.release_count, 3);
    assert_eq!(h.token.balance(&h.recipient), 1_000_000);
    assert_eq!(h.token.balance(&h.contract_id), 0);
}

#[test]
fn test_partial_releases_with_fee_account_exactly() {
    let env = Env::default();
    let (h, _p, treasury) = setup_ex(&env, 500);
    let id = create_escrow(&h, 3600);
    h.escrow.release(&id, &Some(333_333));
    h.escrow.release(&id, &None); // remainder
    let st = h.escrow.get_escrow(&id);
    assert_eq!(st.status, EscrowStatus::Released);
    assert_eq!(
        h.token.balance(&h.recipient) + h.token.balance(&treasury),
        1_000_000
    );
    assert_eq!(st.fee_collected, h.token.balance(&treasury));
    assert_eq!(h.token.balance(&h.contract_id), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_partial_release_cannot_exceed_deposit() {
    let env = Env::default();
    let (h, _p, _t) = setup_ex(&env, 0);
    let id = create_escrow(&h, 3600);
    h.escrow.release(&id, &Some(600_000));
    // Only 400_000 remains; a second 600_000 must be rejected.
    h.escrow.release(&id, &Some(600_000));
}

#[test]
fn test_release_none_after_partial_pays_only_remainder() {
    let env = Env::default();
    let (h, _p, _t) = setup_ex(&env, 0);
    let id = create_escrow(&h, 3600);
    h.escrow.release(&id, &Some(900_000));
    let out = h.escrow.release(&id, &None);
    assert_eq!(out.amount_out, 100_000);
    assert_eq!(h.token.balance(&h.recipient), 1_000_000);
}

#[test]
fn test_partial_refund_then_remainder_never_exceeds_deposit() {
    let env = Env::default();
    let (h, _p, _t) = setup_ex(&env, 0);
    let id = create_escrow(&h, 3600);
    env.ledger().set_timestamp(env.ledger().timestamp() + 7200);
    h.escrow.refund(&id, &Some(300_000));
    assert_eq!(h.escrow.get_escrow(&id).status, EscrowStatus::Locked);
    h.escrow.refund(&id, &None);
    assert_eq!(h.escrow.get_escrow(&id).status, EscrowStatus::Refunded);
    assert_eq!(h.token.balance(&h.sender), 10_000_000);
    assert_eq!(h.token.balance(&h.contract_id), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_refund_over_remaining_after_partial_rejected() {
    let env = Env::default();
    let (h, _p, _t) = setup_ex(&env, 0);
    let id = create_escrow(&h, 3600);
    env.ledger().set_timestamp(env.ledger().timestamp() + 7200);
    h.escrow.refund(&id, &Some(700_000));
    h.escrow.refund(&id, &Some(700_000));
}

#[test]
fn test_cancel_after_partial_release_returns_only_remainder() {
    let env = Env::default();
    let (h, _p, _t) = setup_ex(&env, 0);
    let id = create_escrow(&h, 3600);
    h.escrow.release(&id, &Some(250_000));
    h.escrow.cancel(&id);
    // sender paid 1_000_000, got 750_000 back.
    assert_eq!(h.token.balance(&h.sender), 10_000_000 - 250_000);
    assert_eq!(h.token.balance(&h.contract_id), 0);
}

#[test]
fn test_two_escrows_cannot_drain_each_other() {
    let env = Env::default();
    let (h, _p, _t) = setup_ex(&env, 0);
    let a = create_escrow(&h, 3600);
    let _b = create_escrow(&h, 3600);
    h.escrow.release(&a, &Some(1_000_000));
    // Escrow `a` is fully released; the contract must still hold b's funds.
    assert_eq!(h.token.balance(&h.contract_id), 1_000_000);
    assert!(h.escrow.try_release(&a, &Some(1)).is_err());
}

// ---------------------------------------------------------------------------
// Hardening tests: pause behaviour
// ---------------------------------------------------------------------------

#[test]
fn test_paused_blocks_deposit_and_release_but_not_exit() {
    let env = Env::default();
    let (h, _p, _t) = setup_ex(&env, 0);
    let id = create_escrow(&h, 3600);
    h.escrow.set_paused(&true);
    assert!(h.escrow.is_paused());

    // New deposits rejected with Paused (#13).
    let exp = env.ledger().timestamp() + 3600;
    let r = h
        .escrow
        .try_deposit(&h.sender, &h.recipient, &1_000, &h.token.address, &exp);
    assert!(matches!(r, Err(Ok(e)) if e == EscrowError::Paused.into()));
    // Release rejected.
    let r = h.escrow.try_release(&id, &None);
    assert!(matches!(r, Err(Ok(e)) if e == EscrowError::Paused.into()));
    // Sender can still exit via cancel while paused.
    h.escrow.cancel(&id);
    assert_eq!(h.token.balance(&h.sender), 10_000_000);

    h.escrow.set_paused(&false);
    let _ = create_escrow(&h, 3600);
}

#[test]
fn test_platform_actions_record_platform_auth() {
    let env = Env::default();
    let (h, platform, _t) = setup_ex(&env, 0);
    h.escrow.set_fee_bps(&100);
    h.escrow.set_paused(&true);
    let id = {
        h.escrow.set_paused(&false);
        create_escrow(&h, 3600)
    };
    h.escrow.release(&id, &None);
    assert!(env.auths().iter().any(|(a, _)| *a == platform));
}

#[test]
fn test_refund_and_cancel_require_sender_auth() {
    let env = Env::default();
    let (h, _p, _t) = setup_ex(&env, 0);
    let id = create_escrow(&h, 3600);
    h.escrow.cancel(&id);
    assert!(env.auths().iter().any(|(a, _)| *a == h.sender));
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn test_fee_cap_enforced_in_setter() {
    let env = Env::default();
    let (h, _p, _t) = setup_ex(&env, 0);
    h.escrow.set_fee_bps(&501);
}

#[test]
fn test_fee_cap_boundary_and_constructor() {
    let env = Env::default();
    let (h, _p, _t) = setup_ex(&env, 500);
    assert_eq!(h.escrow.get_fee_bps(), 500);
    h.escrow.set_fee_bps(&500);
    h.escrow.set_fee_bps(&0);
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn test_constructor_rejects_fee_over_cap() {
    let env = Env::default();
    let _ = setup_ex(&env, 501);
}
