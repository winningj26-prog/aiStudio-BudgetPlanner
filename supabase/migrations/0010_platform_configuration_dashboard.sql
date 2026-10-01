create table if not exists public.platform_settings (
  id integer primary key default 1 check (id = 1),
  currency text not null default 'SLE',
  plus_amount integer not null default 550 check (plus_amount > 0),
  pro_amount integer not null default 1000 check (pro_amount > 0),
  mobile_money_provider text not null default '',
  mobile_money_account_name text not null default '',
  mobile_money_account_number text not null default '',
  mobile_money_instructions text not null default 'Make the exact payment amount shown above, keep your transaction receipt, and submit the transaction ID below. Your subscription will be activated only after manual verification.',
  monime_api_version text not null default 'caph.2025-08-23',
  app_base_url text not null default '',
  integration_settings jsonb not null default '{}'::jsonb,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id) values (1) on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

create table if not exists public.platform_config_audit (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  section text not null,
  changed_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.platform_config_audit enable row level security;

create or replace function public.platform_secret_get(secret_name text)
returns text language sql security definer set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = secret_name limit 1;
$$;

create or replace function public.platform_secret_upsert(secret_value text, secret_name text, secret_description text default null)
returns uuid language plpgsql security definer set search_path = public, vault
as $$
declare existing_id uuid; secret_id uuid;
begin
  select id into existing_id from vault.secrets where name = secret_name limit 1;
  if existing_id is null then
    select vault.create_secret(secret_value, secret_name, secret_description) into secret_id;
  else
    perform vault.update_secret(existing_id, secret_value, secret_name, secret_description);
    secret_id := existing_id;
  end if;
  return secret_id;
end;
$$;

revoke all on function public.platform_secret_get(text) from public, anon, authenticated;
revoke all on function public.platform_secret_upsert(text, text, text) from public, anon, authenticated;
grant execute on function public.platform_secret_get(text) to service_role;
grant execute on function public.platform_secret_upsert(text, text, text) to service_role;
revoke all on public.platform_settings from anon, authenticated;
revoke all on public.platform_config_audit from anon, authenticated;
