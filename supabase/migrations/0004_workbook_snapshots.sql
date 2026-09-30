-- Store the BudgetPlanner workbook as an account-scoped cloud snapshot.
-- Local browser storage remains the offline/cache layer; this table is the
-- cloud source of truth for accounts entitled to cloud sync.

create table if not exists public.workbook_snapshots (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  data jsonb not null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workbook_snapshots enable row level security;

create index if not exists workbook_snapshots_updated_at_idx
  on public.workbook_snapshots(updated_at);
