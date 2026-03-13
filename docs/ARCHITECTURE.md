# Architecture

## Overview

TrustBlock is split into two layers:

- smart contracts for escrow state transitions and custody
- a web application for wallet connection, escrow drafting, and future transaction flows

## Contract Layer

Key contracts in `apps/smart-contracts/contracts`:

- `Escrow.sol`
  the main upgradeable contract handling escrow creation, funding, milestone actions, and resolver configuration
- `EscrowReader.sol`
  a dedicated read contract that aggregates UI-friendly views from the main escrow contract
- `Types.sol`
  shared enums, structs, and view models
- `Events.sol`
  shared event definitions

### Contract design choices

- upgradeable deployment model via proxy
- write-heavy logic kept in `Escrow.sol`
- larger composite read models delegated to `EscrowReader.sol`
- custom errors used instead of string-heavy reverts where practical

### Current tested lifecycle

- create escrow
- create and fund escrow
- submit milestone
- approve and release milestone
- refund expired milestone
- resolve dispute through configured resolver

## Frontend Layer

The web app in `apps/web` is built with:

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Reown AppKit
- wagmi
- viem

### Current frontend responsibilities

- escrow drafting UI
- milestone schedule editing
- wallet connection
- status-oriented product views

### Pending frontend-contract integration

- contract write hooks
- contract read hooks
- transaction lifecycle feedback
- deployed address configuration by environment

## Deployment Shape

Current deployment components:

- proxy-based escrow deployment via Hardhat Ignition
- separate `EscrowReader` deployment referencing the escrow proxy

Before production deployment, the project should add:

- environment-specific address management
- upgrade runbooks
- contract verification steps
- security review notes
