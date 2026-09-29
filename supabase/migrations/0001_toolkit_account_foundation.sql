-- Toolkit account service foundation schema
-- PostgreSQL / Supabase-compatible.
-- Defines account, billing, entitlement, integration and usage boundaries.

create table if not exists public.profiles (
  id uuid primary key, email text, display_name text, photo_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id text primary key, name text not null, active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.plan_entitlements (
  plan_id text not null references public.plans(id) on delete cascade,
  feature_key text not null, enabled boolean not null default true,
  primary key (plan_id, feature_key)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null references public.plans(id),
  provider text not null default 'none' check (provider in ('none', 'stripe')),
  provider_customer_id text, provider_subscription_id text,
  status text not null check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  current_period_end timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists subscriptions_one_live_subscription_per_user
  on public.subscriptions(user_id)
  where status in ('active', 'trialing', 'past_due', 'incomplete');

create table if not exists public.app_entitlements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  app_id text not null, enabled boolean not null default true,
  source text not null default 'plan' check (source in ('plan', 'override')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (user_id, app_id)
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null, provider_account_id text, scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'revoked', 'error')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_key text not null, period_start date not null, quantity bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_key, period_start)
);

insert into public.plans (id, name) values ('free', 'Free'), ('plus', 'Plus'), ('pro', 'Pro') on conflict (id) do nothing;

insert into public.plan_entitlements (plan_id, feature_key) values
('free', 'budget.core'), ('free', 'budget.localPersistence'), ('free', 'budget.export'),
('plus', 'budget.core'), ('plus', 'budget.localPersistence'), ('plus', 'budget.export'), ('plus', 'budget.googleSheets'), ('plus', 'budget.cloudSync'),
('pro', 'budget.core'), ('pro', 'budget.localPersistence'), ('pro', 'budget.export'), ('pro', 'budget.googleSheets'), ('pro', 'budget.aiInsights'), ('pro', 'budget.advancedAnalytics'), ('pro', 'budget.cloudSync'), ('pro', 'budget.automation')
on conflict (plan_id, feature_key) do nothing;