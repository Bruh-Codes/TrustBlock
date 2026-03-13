# Contributing

Thank you for contributing to TrustBlock.

## Ground Rules

- keep pull requests focused
- prefer small, reviewable changes over large rewrites
- do not mix unrelated refactors with product or contract changes
- document behavior changes that affect the UI, contract API, or deployment flow
- add or update tests when contract behavior changes

## Development Setup

### Contracts

```bash
cd apps/smart-contracts
yarn install
yarn compile
yarn test
```

### Web

```bash
cd apps/web
yarn install
yarn lint
yarn dev
```

## Pull Request Checklist

- the change is scoped to a clear problem
- documentation is updated when behavior or setup changes
- contract changes include tests
- frontend changes avoid breaking the current design system
- environment variables are reflected in `.env.example` when needed

## Coding Expectations

- Solidity:
  use NatSpec for externally relevant functions and keep revert reasons and custom errors coherent
- TypeScript and React:
  preserve the existing UI structure unless the change intentionally redesigns it
- Docs:
  write plainly, avoid marketing claims, and keep project status accurate

## Issues

When filing a bug or feature request, include:

- a concise summary
- expected behavior
- actual behavior
- reproduction steps
- screenshots or logs when relevant

## Questions

If you are unsure whether a change belongs in the web app, contracts, or both, open an issue before doing a large implementation.
