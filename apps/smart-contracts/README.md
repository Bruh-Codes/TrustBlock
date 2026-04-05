# TrustBlock Smart Contracts

This package contains the TrustBlock escrow contracts, deployment modules, and tests.

## Contracts

- `Escrow.sol`
  main upgradeable escrow contract
- `EscrowReader.sol`
  read-focused contract for frontend-friendly view aggregation
- `Types.sol`
  shared structs and enums
- `Events.sol`
  event declarations
- `IEscrowReaderSource.sol`
  reader interface boundary

## Features Covered Today

- escrow creation
- escrow funding
- milestone submission
- milestone approval and release
- expired milestone refunds
- resolver configuration
- dispute resolution through configured resolver types

## Stack

- Solidity `0.8.28`
- Hardhat `3`
- Ethers `6`
- OpenZeppelin Contracts `5`
- Hardhat Ignition

## Install

```bash
yarn install
```

## Secret Management

Do not store deployment secrets in project `.env` files.

This package uses Hardhat config variables and should be paired with the Hardhat keystore for RPC URLs and private keys.

Set secrets with:

```bash
npx hardhat keystore set ARBITRUM_RPC_URL
npx hardhat keystore set ARBITRUM_PRIVATE_KEY
npx hardhat keystore set ARBITRUM_SEPOLIA_RPC_URL
npx hardhat keystore set ARBITRUM_SEPOLIA_PRIVATE_KEY
```

Useful keystore commands:

```bash
npx hardhat keystore list
npx hardhat keystore path
```

## Scripts

```bash
yarn compile
yarn test
yarn deploy:arbitrum
yarn deploy:arbitrum-sepolia
yarn export:web:arbitrum
yarn export:web:arbitrum-sepolia
```

## Testing

The current test suite covers the primary lifecycle paths in `test/Escrow.ts`.

Run:

```bash
yarn test
```

## Deployment

Ignition modules live in `ignition/modules`.

The current deployment shape uses:

- a proxy for `Escrow`
- a separate `EscrowReader` contract pointed at the proxy

Mainnet Arbitrum deployment:

```bash
yarn deploy:arbitrum
```

Arbitrum Sepolia deployment:

```bash
yarn deploy:arbitrum-sepolia
```

After deployment, export the deployment metadata into the web app:

```bash
yarn export:web:arbitrum
```

or

```bash
yarn export:web:arbitrum-sepolia
```

If you want the frontend helper to include the funding token metadata too, use:

```bash
yarn export:web-deployment --deployment-id chain-42161 --token-address <TOKEN_ADDRESS> --token-symbol USDC --token-decimals 6
```

The export script now updates `apps/web/helpers/deployments.generated.json` by network key, so you can keep both deployments in the repo at the same time and switch the frontend with:

```bash
NEXT_PUBLIC_ESCROW_DEPLOYMENT=arbitrum
```

or

```bash
NEXT_PUBLIC_ESCROW_DEPLOYMENT=arbitrumSepolia
```

## Notes

- the contract system is still under active development
- passing tests do not replace a full security review
- no public production deployment should be implied by this repository alone
