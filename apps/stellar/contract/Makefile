.PHONY: build test clean deploy

# Build the contract
build:
	cargo build --target wasm32-unknown-unknown --release

# Run tests
test:
	cargo test

# Clean build artifacts
clean:
	cargo clean
	rm -rf target/

# Deploy to testnet (requires soroban-cli setup)
deploy: build
	soroban contract deploy \
		--wasm target/wasm32-unknown-unknown/release/trustblock_escrow.wasm \
		--network testnet

# Build and optimize
optimize: build
	soroban contract optimize \
		--wasm target/wasm32-unknown-unknown/release/trustblock_escrow.wasm \
		--output target/wasm32-unknown-unknown/release/trustblock_escrow_optimized.wasm
