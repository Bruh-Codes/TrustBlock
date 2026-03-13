# TrustBlock

TrustBlock is a milestone-based escrow platform for structured crypto payments on Arbitrum.

The repository contains two main applications:

- `apps/smart-contracts`: upgradeable escrow contracts, read helpers, deployment modules, and tests
- `apps/web`: the product UI, wallet connection flow, and escrow drafting interface

TrustBlock is being prepared as both an open-source project and a hackathon submission. This documentation is written to reflect the current implementation accurately, without claiming features that are not yet wired end to end.

## Problem

Freelance, agency, and service-based crypto payments often break down in the same places:

- funds are sent too early or too late
- delivery expectations are vague
- milestone approval logic is inconsistent
- disputes are handled off-platform and without structured rules

TrustBlock addresses this by combining milestone-aware escrow contracts with a UI designed around explicit release, review, and dispute paths.

## Current Status

What is implemented today:

- upgradeable escrow contract architecture
- milestone-based escrow creation and funding flows in Solidity
- escrow reader contract for UI-friendly read models
- dispute resolver configuration in the contract layer
- automated contract tests covering core lifecycle paths
- production-grade UI for escrow drafting and monitoring
- Reown AppKit wallet connection with wagmi in the frontend

What is not fully wired yet:

- frontend write integration to live escrow contract methods
- frontend read integration to onchain escrow data
- deployed contract addresses and production environment configuration
- indexer or backend services for analytics and historical queries

## Repository Structure

```text
.
|- apps/
|  |- smart-contracts/
|  |  |- contracts/
|  |  |- ignition/
|  |  |- test/
|  |  `- README.md
|  `- web/
|     |- app/
|     |- components/
|     |- lib/
|     `- README.md
|- docs/
|  |- ARCHITECTURE.md
|  `- HACKATHON_SUBMISSION.md
|- CONTRIBUTING.md
|- CODE_OF_CONDUCT.md
|- SECURITY.md
`- LICENSE
```

## Quick Start

### Smart contracts

```bash
cd apps/smart-contracts
yarn install
yarn compile
yarn test
```

### Web app

```bash
cd apps/web
yarn install
yarn dev
```

If you want wallet connection enabled in the web app, create `apps/web/.env.local` and set:

```bash
NEXT_PUBLIC_REOWN_PROJECT_ID=your_reown_project_id
```

## Docs

- Architecture overview: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- Hackathon submission notes: [docs/HACKATHON_SUBMISSION.md](./docs/HACKATHON_SUBMISSION.md)
- Smart contracts guide: [apps/smart-contracts/README.md](./apps/smart-contracts/README.md)
- Web app guide: [apps/web/README.md](./apps/web/README.md)

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## Security

Please report vulnerabilities according to [SECURITY.md](./SECURITY.md).

## License

This repository is released under the [MIT License](./LICENSE).
