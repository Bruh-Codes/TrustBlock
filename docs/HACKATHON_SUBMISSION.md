# Hackathon Submission Notes

## Project Name

TrustBlock

## One-Sentence Pitch

TrustBlock turns milestone-based crypto payments into structured onchain escrow agreements with explicit release and dispute rules.

## What We Built

- an upgradeable escrow contract system for milestone-based payments
- a reader contract optimized for frontend consumption
- a polished web interface for drafting and reviewing escrows
- wallet onboarding with Reown AppKit and wagmi
- automated Solidity integration tests for the core lifecycle

## Why It Matters

Crypto payments are strong at settlement but weak at coordination. TrustBlock adds the missing agreement layer between parties by making milestones, approval rules, and dispute handling explicit from the start.

## Demo Scope

Today, the strongest demo path is:

1. connect a wallet in the web app
2. draft a new escrow through the UI
3. run the contract tests to show the implemented lifecycle
4. walk through the contract architecture and reader model

## Honest Status

This is not yet a fully deployed production application. The repository currently includes the contract system, tests, wallet integration, and the product UI, but the frontend has not yet been fully wired to live contract reads and writes.

## Suggested Submission Assets

- short demo video
- architecture slide
- screenshots of the UI
- test output from `apps/smart-contracts`
- repository link
