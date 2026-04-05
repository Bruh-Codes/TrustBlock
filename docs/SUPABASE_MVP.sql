create extension if not exists "pgcrypto";

create table if not exists public.workroom_submissions (
  id uuid primary key default gen_random_uuid(),
  escrow_id bigint not null,
  milestone_id bigint not null,
  revision_number integer not null default 1,
  submitted_by_wallet text not null,
  submitted_by_role text not null check (submitted_by_role in ('client', 'recipient', 'resolver')),
  delivery_note text not null default '',
  submission_status text not null check (submission_status in ('draft', 'shared', 'submitted', 'changes_requested', 'accepted')) default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists workroom_submissions_revision_unique
  on public.workroom_submissions (milestone_id, revision_number);

create index if not exists workroom_submissions_escrow_idx
  on public.workroom_submissions (escrow_id, milestone_id, created_at desc);

create table if not exists public.workroom_submission_links (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.workroom_submissions(id) on delete cascade,
  label text not null,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists workroom_submission_links_submission_idx
  on public.workroom_submission_links (submission_id, position);

create table if not exists public.workroom_submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.workroom_submissions(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  mime_type text,
  size_bytes bigint,
  storage_path text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists workroom_submission_files_submission_idx
  on public.workroom_submission_files (submission_id);

create table if not exists public.workroom_comments (
  id uuid primary key default gen_random_uuid(),
  escrow_id bigint not null,
  milestone_id bigint not null,
  submission_id uuid references public.workroom_submissions(id) on delete cascade,
  author_wallet text not null,
  author_role text not null check (author_role in ('client', 'recipient', 'resolver')),
  comment_type text not null check (comment_type in ('general', 'request_changes', 'resolution_note')) default 'general',
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists workroom_comments_milestone_idx
  on public.workroom_comments (escrow_id, milestone_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists workroom_submissions_set_updated_at on public.workroom_submissions;

create trigger workroom_submissions_set_updated_at
before update on public.workroom_submissions
for each row
execute function public.set_updated_at();

alter table public.workroom_submissions enable row level security;
alter table public.workroom_submission_links enable row level security;
alter table public.workroom_submission_files enable row level security;
alter table public.workroom_comments enable row level security;

-- Replace these broad MVP policies with project-specific auth once Supabase auth is wired.
create policy "workroom submissions readable"
on public.workroom_submissions for select
using (true);

create policy "workroom submissions writable"
on public.workroom_submissions for all
using (true)
with check (true);

create policy "workroom links readable"
on public.workroom_submission_links for select
using (true);

create policy "workroom links writable"
on public.workroom_submission_links for all
using (true)
with check (true);

create policy "workroom files readable"
on public.workroom_submission_files for select
using (true);

create policy "workroom files writable"
on public.workroom_submission_files for all
using (true)
with check (true);

create policy "workroom comments readable"
on public.workroom_comments for select
using (true);

create policy "workroom comments writable"
on public.workroom_comments for all
using (true)
with check (true);
