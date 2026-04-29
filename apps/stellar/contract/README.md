# TrustBlock Stellar Smart Contract

This is the Soroban smart contract implementation for TrustBlock on the Stellar network. It provides milestone-based escrow functionality with XLM payments.

## Features

- **Escrow Creation**: Create escrows with multiple milestones
- **Funding**: Fund escrows with XLM
- **Milestone Management**: Submit, approve, and release milestones
- **Refund Support**: Refund unfunded escrows
- **Status Tracking**: Track escrow and milestone statuses

## Contract Structure

### Core Data Types

- **Escrow**: Main escrow structure with client, recipient, amounts, and status
- **Milestone**: Individual milestone with amount, approval status, and title
- **EscrowStatus**: Enum for escrow states (AwaitingFunding, Live, InReview, etc.)
- **MilestoneStatus**: Enum for milestone states (Pending, InReview, Approved, etc.)

### Key Functions

#### `initialize(admin: Address)`

Initializes the contract with an admin address.

#### `create_escrow(client, recipient, resolver, title, milestone_titles, milestone_amounts) -> u64`

Creates a new escrow with milestones. Returns the escrow ID.

#### `fund_escrow(escrow_id, client, amount)`

Funds an escrow with the specified XLM amount.

#### `get_escrow(escrow_id) -> Escrow`

Retrieves escrow details.

#### `get_milestones(escrow_id) -> Vec<Milestone>`

Retrieves all milestones for an escrow.

#### `submit_milestone(escrow_id, milestone_id, recipient)`

Submits a milestone for review (recipient only).

#### `approve_milestone(escrow_id, milestone_id, client)`

Approves a milestone (client only).

#### `release_milestone(escrow_id, milestone_id, client)`

Releases milestone funds to recipient (client only).

#### `refund_escrow(escrow_id, client)`

Refunds an unfunded escrow (client only).

## Usage Flow

1. **Initialize**: Contract admin calls `initialize()`
2. **Create Escrow**: Client calls `create_escrow()` with milestones
3. **Fund Escrow**: Client calls `fund_escrow()` with total amount
4. **Submit Milestones**: Recipient submits completed milestones
5. **Approve Milestones**: Client approves submitted milestones
6. **Release Funds**: Client releases funds for approved milestones

## Security Features

- **Access Control**: Only authorized parties can perform specific actions
- **Status Validation**: Functions validate current status before allowing state changes
- **Amount Validation**: Ensures proper funding amounts
- **Milestone Tracking**: Comprehensive milestone lifecycle management

## Building and Testing

### Linux/macOS

```bash
# Build the contract
cargo build --target wasm32-unknown-unknown --release

# Run tests
cargo test

# Deploy to testnet
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/trustblock_escrow.wasm --network testnet
```

### Windows

If you encounter permission issues with Cargo.lock:

**Option 1: Use PowerShell script**

```powershell
.\build.ps1
```

**Option 2: Use batch file**

```cmd
.\build.bat
```

**Option 3: Manual commands**

```cmd
# Try offline build first
cargo build --target wasm32-unknown-unknown --release --offline

# If that fails, try frozen
cargo build --target wasm32-unknown-unknown --release --frozen

# Or manually delete Cargo.lock and try again
del Cargo.lock
cargo build --target wasm32-unknown-unknown --release
```

**Option 4: Run as Administrator**
Run your terminal as Administrator to resolve permission issues.

## Integration with Frontend

The contract is designed to work with the TrustBlock Stellar frontend, which uses the generated TypeScript client for type-safe interactions.

## Contract ID

The deployed contract ID on Stellar testnet is:
`CAQGDVXYW6YHIMLXTNCINAPCZXZ37JKLACGEWXQULYJNAGB5JJBHV4NC`
