alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists suspension_reason text;

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status = any (array['active'::text, 'suspended'::text]));

alter table public.platform_settings
  add column if not exists support_email text not null default '',
  add column if not exists support_phone text not null default '',
  add column if not exists payment_methods jsonb not null default '["mobile_money"]'::jsonb,
  add column if not exists mobile_money_providers jsonb not null default '[]'::jsonb;

alter table public.manual_payment_requests
  add column if not exists payment_provider text;

create index if not exists profiles_account_status_idx on public.profiles(account_status);