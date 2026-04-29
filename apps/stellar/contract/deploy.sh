#!/bin/bash

# Build the contract
echo "Building contract..."
cargo build --target wasm32-unknown-unknown --release

# Deploy to testnet (you'll need to set up your Soroban CLI first)
echo "Deploying to testnet..."
soroban contract deploy \
    --wasm target/wasm32-unknown-unknown/release/trustblock_escrow.wasm \
    --network testnet \
    --source <YOUR_ACCOUNT_ADDRESS>

echo "Contract deployed! Update the contract ID in the frontend config."
