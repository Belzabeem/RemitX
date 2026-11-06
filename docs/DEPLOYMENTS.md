# Deployments

**Status: PENDING.** Nothing is deployed. No contract IDs exist, and none are listed here on purpose.

The authoring environment had no funded testnet identity, no `stellar` CLI and no network access to Friendbot or Soroban RPC, so no deployment was attempted.

## Steps (testnet)

1. Install the Stellar CLI and the wasm target: `rustup target add wasm32-unknown-unknown`.
2. Create and fund an identity: `stellar keys generate deployer --network testnet --fund`.
3. Run `scripts/deploy-testnet.sh` (builds, deploys escrow, prints the contract ID).
4. Record the printed ID below with the date and the commit it was built from.
5. Set `ESCROW_CONTRACT_ID` and `SOROBAN_RPC_URL`, then call `POST /api/indexer/sync` with `INDEXER_SECRET`.

| Contract | Network | Contract ID | Commit | Date |
| --- | --- | --- | --- | --- |
| Escrow | testnet | _pending_ | | |
