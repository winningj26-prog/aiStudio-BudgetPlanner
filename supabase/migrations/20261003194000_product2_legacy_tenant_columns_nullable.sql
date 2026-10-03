-- Keep legacy Product 2 tenant columns nullable after the shared-account migration.
-- These columns are historical compatibility fields only. Product 2 runtime
-- ownership is account_id -> profiles.id.
alter table public.product2_settings drop constraint if exists product2_settings_pkey;
alter table public.product2_settings alter column tenant_id drop not null;
alter table public.product2_savings_goals alter column tenant_id drop not null;
alter table public.product2_savings_contributions alter column tenant_id drop not null;
alter table public.product2_debt_accounts alter column tenant_id drop not null;
alter table public.product2_debt_payments alter column tenant_id drop not null;
alter table public.product2_settings add constraint product2_settings_pkey primary key (account_id);