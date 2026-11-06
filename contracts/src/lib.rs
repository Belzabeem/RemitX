//! RemitX Contracts - Shared Types and Utilities
//!
//! This crate contains types and helpers shared across the RemitX
//! Soroban contract family (escrow, exchange, staking, governance).
//!
//! Soroban best practices applied:
//! - `soroban-sdk = "22.0.0"` (stable, current per Stellar docs)
//! - `#[contracterror]` with `#[repr(u32)]` for deterministic error codes
//! - `#[contracttype]` on all storage types
//! - `panic_with_error!` instead of raw `panic!`
//! - Deterministic escrow IDs via SHA-256 of deposit parameters
//! - `require_auth()` on all state-changing operations
//!
//! Issue candidates (create GitHub issues from these):
//!   - contracts#sac-issuance — Add Stellar Asset Contract (SAC) support so
//!     anchored assets (USDC, NGNT, PHP, GBP) can be used in Soroban contracts.
//!   - contracts#security-audit — Full audit before mainnet: reentrancy,
//!     authz, integer overflow, storage exhaustion, event spoofing.
//!   - contracts#local-quickstart — Add stellar Quickstart container for
//!     local contract testing instead of testnet-only.
//!   - contracts#upgradeability — Add contract upgrade path (upgradeable
//!     Soroban contracts) for escrow / exchange.
//!   - contracts#rate-limiting — Add per-address rate limiting to prevent
//!     spam deposits on public testnet.

#![no_std]

pub mod tokens;
pub mod types;
