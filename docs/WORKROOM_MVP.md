# Workroom MVP

This project already has the onchain settlement layer:

- create escrow
- fund escrow
- submit milestone
- approve milestone
- approve refund
- release
- dispute
- resolve

The missing product layer is the offchain workroom around milestone delivery.

## Goal

Give both parties a clear place to exchange:

- delivery notes
- links
- document attachments
- revision history
- request-changes comments

The contract remains the settlement layer. Files and collaboration metadata stay offchain in Supabase.

## Recommended User Flow

1. Client creates and funds escrow.
2. Recipient opens the escrow detail page.
3. Recipient prepares a milestone submission:
   - delivery note
   - links
   - document attachments
4. Recipient saves a draft or submits the milestone for review.
5. Client reviews the latest revision:
   - approve milestone onchain
   - request changes offchain
   - approve refund onchain
   - open dispute onchain
6. Recipient can upload a new revision after requested changes.
7. Resolver can review workroom context before dispute resolution.

## Supabase Tables

Use [SUPABASE_MVP.sql](./SUPABASE_MVP.sql).

### `workroom_submissions`

One row per milestone revision.

- `escrow_id`
- `milestone_id`
- `revision_number`
- `submitted_by_wallet`
- `submitted_by_role`
- `delivery_note`
- `submission_status`
- `submitted_at`

### `workroom_submission_links`

Attached links for a submission revision.

- `submission_id`
- `label`
- `url`
- `position`

### `workroom_submission_files`

Attached files for a submission revision.

- `submission_id`
- `file_name`
- `file_url`
- `mime_type`
- `size_bytes`
- `storage_path`

### `workroom_comments`

General notes and request-changes history.

- `escrow_id`
- `milestone_id`
- `submission_id`
- `author_wallet`
- `author_role`
- `comment_type`
- `body`

## Product Rules

- `Submit milestone` is still the onchain action.
- `Request changes` is offchain only for now.
- Each resubmission creates a new revision row.
- The latest `submitted` or `changes_requested` revision is what the client reviews.
- Files should be uploaded to Supabase Storage, then referenced from `workroom_submission_files`.

## MVP UI Surface

The escrow detail page should expose:

- milestone workroom history
- latest revision card
- links and documents
- request changes note
- recipient resubmission flow

That gives the product the missing “Upwork-like” collaboration step without pushing files onchain.
