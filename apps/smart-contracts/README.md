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

## Scripts

```bash
yarn compile
yarn test
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

## Notes

- the contract system is still under active development
- passing tests do not replace a full security review
- no public production deployment should be implied by this repository alone
