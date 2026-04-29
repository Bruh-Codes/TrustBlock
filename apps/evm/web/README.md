# TrustBlock Stellar Frontend

This package contains the copied TrustBlock frontend that will power the Stellar hackathon version of the app.

The current UI came from the Arbitrum version, but this folder now belongs to the Stellar-native submission path. The immediate goal is to preserve the working product UX while replacing EVM-specific wallet and contract integration with Stellar + Soroban flows.

## Current Status

What was copied from the original frontend:

- responsive application shell and navigation
- escrow drafting flow
- milestone creation, editing, reordering, and review
- dispute resolver selection UX
- wallet connection with Reown AppKit and wagmi
- EVM contract read and write hooks
- exported deployment registry shared from Hardhat artifacts
- env-based Arbitrum deployment configs
- Drizzle-backed workroom schema for Supabase persistence

What still needs to change for the Stellar submission:

- replace the remaining EVM escrow flows with Soroban client calls
- adapt escrow reads and writes to the Soroban contract shape
- refresh docs and product copy to emphasize Stellar-native escrow

## Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Freighter wallet API
- Stellar JavaScript SDK

## Prerequisites

- Node.js 20+
- Yarn 4

## Install

```bash
yarn install
```

## Environment

Create `.env.local` with:

```bash
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_SOROBAN_CONTRACT_ID=
DATABASE_URL=postgresql://...
```

The committed `.env.example` shows the expected variables.
Use the Supabase Postgres connection string for `DATABASE_URL`. Keep it server-side only.

For Supabase runtime reads and writes, use the configured PostgREST client in [`lib/supabase/postgrest.ts`](./lib/supabase/postgrest.ts):

```ts
import { supabase } from "@/lib/supabase/postgrest";

const { data, error } = await supabase
  .from("workroom_submissions")
  .select("*");
```

Drizzle remains the schema and migration source of truth. PostgREST gives you the Supabase-style query API inside the app.

## Run

```bash
yarn dev
```

## Scripts

```bash
yarn dev
yarn build
yarn start
yarn lint
yarn db:generate
yarn db:push
yarn db:studio
```

## Project Structure

```text
app/
  layout.tsx
  page.tsx
components/
  CreateEscrow.tsx
  Overview.tsx
  Transactions.tsx
  WalletButton.tsx
  WalletProvider.tsx
  ui/
lib/
  demo-data.ts
db/
  schema.ts
  workroom.ts
  wallet.ts
```

## White Belt status

The main app entry is now focused on White Belt requirements:

- Freighter wallet connection
- wallet network detection
- Horizon and RPC endpoint awareness
- build, sign, and submit a native XLM payment transaction

The old escrow and EVM files still exist in the repo for reference, but the live frontend route is now Stellar-first.
