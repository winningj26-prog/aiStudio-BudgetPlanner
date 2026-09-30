-- Monime billing foundation.
-- Checkout sessions are one-time payment objects; the app treats each
-- completed payment as a billing period until recurring billing support is
-- explicitly confirmed with the provider.

alter table public.subscriptions
  drop constraint if exists subscriptions_provider_check;

alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider in ('none', 'monime'));

create table if not exists public.billing_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null references public.plans(id),
  provider text not null default 'monime' check (provider = 'monime'),
  provider_session_id text not null unique,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled', 'expired', 'failed')),
  amount_value bigint not null,
  currency text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_checkout_sessions_user_idx
  on public.billing_checkout_sessions(user_id, created_at desc);

create table if not exists public.billing_events (
  id text primary key,
  provider text not null check (provider = 'monime'),
  event_name text not null,
  object_id text,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_object_idx
  on public.billing_events(provider, object_id);

alter table public.billing_checkout_sessions enable row level security;
alter table public.billing_events enable row level security;
