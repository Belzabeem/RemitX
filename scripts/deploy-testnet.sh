#!/usr/bin/env bash
# Builds and deploys the escrow contract to Stellar testnet.
# Requires: stellar CLI, wasm32-unknown-unknown target, a funded identity.
# Usage: IDENTITY=deployer PLATFORM=<G...> TREASURY=<G...> FEE_BPS=100 scripts/deploy-testnet.sh
set -euo pipefail

IDENTITY="${IDENTITY:-deployer}"
FEE_BPS="${FEE_BPS:-0}"
: "${PLATFORM:?set PLATFORM to the release authority public key}"
: "${TREASURY:?set TREASURY to the fee treasury public key}"

command -v stellar >/dev/null || { echo "stellar CLI not found" >&2; exit 1; }

cd "$(dirname "$0")/../contracts"
cargo build --release --target wasm32-unknown-unknown -p remitx-escrow

WASM=target/wasm32-unknown-unknown/release/remitx_escrow.wasm
[ -f "$WASM" ] || { echo "missing $WASM" >&2; exit 1; }

stellar contract deploy --wasm "$WASM" --source "$IDENTITY" --network testnet \
  -- --platform "$PLATFORM" --fee_treasury "$TREASURY" --fee_bps "$FEE_BPS"
echo "Record the printed contract ID in docs/DEPLOYMENTS.md"
