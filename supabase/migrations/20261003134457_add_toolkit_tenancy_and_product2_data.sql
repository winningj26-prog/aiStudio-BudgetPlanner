create table if not exists public.toolkit_tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.toolkit_products (
  id text primary key,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_members (
  tenant_id uuid not null references public.toolkit_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table if not exists public.tenant_product_entitlements (
  tenant_id uuid not null references public.toolkit_tenants(id) on delete cascade,
  product_id text not null references public.toolkit_products(id) on delete restrict,
  status text not null default 'active' check (status in ('active','suspended','expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, product_id)
);

create index if not exists tenant_members_user_id_idx on public.tenant_members(user_id);
create index if not exists tenant_product_entitlements_product_id_idx on public.tenant_product_entitlements(product_id);
create index if not exists toolkit_tenants_owner_user_id_idx on public.toolkit_tenants(owner_user_id);

insert into public.toolkit_products (id, name)
values
  ('budgetplanner', 'BudgetPlanner'),
  ('product2', 'Savings Goal and Debt Tracker')
on conflict (id) do update set name = excluded.name;

insert into public.toolkit_tenants (id, name, owner_user_id)
select gen_random_uuid(), coalesce(nullif(trim(p.display_name), ''), split_part(p.email, '@', 1), 'Toolkit Account'), p.auth_user_id
from public.profiles p
where p.auth_user_id is not null
  and not exists (select 1 from public.toolkit_tenants t where t.owner_user_id = p.auth_user_id);

insert into public.tenant_members (tenant_id, user_id, role)
select t.id, t.owner_user_id, 'owner'
from public.toolkit_tenants t
on conflict (tenant_id, user_id) do nothing;

insert into public.tenant_product_entitlements (tenant_id, product_id, status)
select t.id, 'budgetplanner', 'active'
from public.toolkit_tenants t
on conflict (tenant_id, product_id) do nothing;

create table if not exists public.product2_settings (
  tenant_id uuid primary key references public.toolkit_tenants(id) on delete cascade,
  currency text not null default 'SLE',
  date_format text not null default 'YYYY-MM-DD',
  interest_convention text not null default 'nominal-annual' check (interest_convention = 'nominal-annual'),
  payment_timing text not null default 'end-of-period' check (payment_timing = 'end-of-period'),
  minimum_payment_policy text not null default 'configured-minimum' check (minimum_payment_policy = 'configured-minimum'),
  decimal_places integer not null default 2 check (decimal_places between 0 and 6),
  updated_at timestamptz not null default now()
);

create table if not exists public.product2_savings_goals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.toolkit_tenants(id) on delete cascade,
  name text not null,
  target_amount numeric(20,2) not null check (target_amount > 0),
  opening_balance numeric(20,2) not null default 0 check (opening_balance >= 0),
  target_date date,
  contribution_frequency text check (contribution_frequency in ('weekly','biweekly','monthly','quarterly','yearly')),
  planned_contribution numeric(20,2) check (planned_contribution is null or planned_contribution >= 0),
  status text not null default 'active' check (status in ('active','completed','paused')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product2_savings_contributions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.toolkit_tenants(id) on delete cascade,
  goal_id uuid not null references public.product2_savings_goals(id) on delete cascade,
  contribution_date date not null,
  amount numeric(20,2) not null check (amount > 0),
  source text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.product2_debt_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.toolkit_tenants(id) on delete cascade,
  creditor text not null,
  opening_balance numeric(20,2) not null default 0 check (opening_balance >= 0),
  balance numeric(20,2) not null default 0 check (balance >= 0),
  interest_rate numeric(12,6) check (interest_rate is null or interest_rate >= 0),
  minimum_payment numeric(20,2) not null default 0 check (minimum_payment >= 0),
  payment_frequency text not null default 'monthly' check (payment_frequency in ('weekly','biweekly','monthly')),
  fees numeric(20,2) check (fees is null or fees >= 0),
  status text not null default 'active' check (status in ('active','paid','paused')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'active' or balance = 0 or minimum_payment > 0)
);

create table if not exists public.product2_debt_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.toolkit_tenants(id) on delete cascade,
  debt_id uuid not null references public.product2_debt_accounts(id) on delete cascade,
  payment_date date not null,
  amount numeric(20,2) not null check (amount > 0),
  principal numeric(20,2) check (principal is null or principal >= 0),
  interest numeric(20,2) check (interest is null or interest >= 0),
  fees numeric(20,2) check (fees is null or fees >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists product2_savings_goals_tenant_idx on public.product2_savings_goals(tenant_id);
create index if not exists product2_savings_contributions_tenant_idx on public.product2_savings_contributions(tenant_id);
create index if not exists product2_savings_contributions_goal_idx on public.product2_savings_contributions(goal_id);
create index if not exists product2_debt_accounts_tenant_idx on public.product2_debt_accounts(tenant_id);
create index if not exists product2_debt_payments_tenant_idx on public.product2_debt_payments(tenant_id);
create index if not exists product2_debt_payments_debt_idx on public.product2_debt_payments(debt_id);

alter table public.toolkit_tenants enable row level security;
alter table public.toolkit_products enable row level security;
alter table public.tenant_members enable row level security;
alter table public.tenant_product_entitlements enable row level security;
alter table public.product2_settings enable row level security;
alter table public.product2_savings_goals enable row level security;
alter table public.product2_savings_contributions enable row level security;
alter table public.product2_debt_accounts enable row level security;
alter table public.product2_debt_payments enable row level security;

revoke all on table public.toolkit_tenants, public.toolkit_products, public.tenant_members, public.tenant_product_entitlements, public.product2_settings, public.product2_savings_goals, public.product2_savings_contributions, public.product2_debt_accounts, public.product2_debt_payments from anon;

grant select, insert, update on public.toolkit_tenants to authenticated;
grant select on public.toolkit_products to authenticated;
grant select, insert, update on public.tenant_members to authenticated;
grant select on public.tenant_product_entitlements to authenticated;
grant select, insert, update on public.product2_settings to authenticated;
grant select, insert, update, delete on public.product2_savings_goals, public.product2_savings_contributions, public.product2_debt_accounts, public.product2_debt_payments to authenticated;

create policy "tenant owners and members can read tenants" on public.toolkit_tenants for select to authenticated using (
  owner_user_id = (select auth.uid()) or exists (select 1 from public.tenant_members m where m.tenant_id = toolkit_tenants.id and m.user_id = (select auth.uid()))
);
create policy "authenticated users can create their own tenant" on public.toolkit_tenants for insert to authenticated with check (owner_user_id = (select auth.uid()));
create policy "tenant owners can update tenants" on public.toolkit_tenants for update to authenticated using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));

create policy "users can read their own memberships" on public.tenant_members for select to authenticated using (user_id = (select auth.uid()));
create policy "tenant owners can add members" on public.tenant_members for insert to authenticated with check (exists (select 1 from public.toolkit_tenants t where t.id = tenant_members.tenant_id and t.owner_user_id = (select auth.uid())));
create policy "tenant owners can update member roles" on public.tenant_members for update to authenticated using (exists (select 1 from public.toolkit_tenants t where t.id = tenant_members.tenant_id and t.owner_user_id = (select auth.uid()))) with check (exists (select 1 from public.toolkit_tenants t where t.id = tenant_members.tenant_id and t.owner_user_id = (select auth.uid())));

create policy "authenticated users can read products" on public.toolkit_products for select to authenticated using (active = true);
create policy "members can read their product entitlements" on public.tenant_product_entitlements for select to authenticated using (exists (select 1 from public.tenant_members m where m.tenant_id = tenant_product_entitlements.tenant_id and m.user_id = (select auth.uid())));

create policy "members can read product2 settings" on public.product2_settings for select to authenticated using (exists (select 1 from public.tenant_members m where m.tenant_id = product2_settings.tenant_id and m.user_id = (select auth.uid())));
create policy "members can create product2 settings" on public.product2_settings for insert to authenticated with check (exists (select 1 from public.tenant_members m where m.tenant_id = product2_settings.tenant_id and m.user_id = (select auth.uid())));
create policy "members can update product2 settings" on public.product2_settings for update to authenticated using (exists (select 1 from public.tenant_members m where m.tenant_id = product2_settings.tenant_id and m.user_id = (select auth.uid()))) with check (exists (select 1 from public.tenant_members m where m.tenant_id = product2_settings.tenant_id and m.user_id = (select auth.uid())));

create policy "members can manage product2 savings goals" on public.product2_savings_goals for all to authenticated using (exists (select 1 from public.tenant_members m where m.tenant_id = product2_savings_goals.tenant_id and m.user_id = (select auth.uid()))) with check (exists (select 1 from public.tenant_members m where m.tenant_id = product2_savings_goals.tenant_id and m.user_id = (select auth.uid())));
create policy "members can manage product2 savings contributions" on public.product2_savings_contributions for all to authenticated using (exists (select 1 from public.tenant_members m where m.tenant_id = product2_savings_contributions.tenant_id and m.user_id = (select auth.uid()))) with check (
  exists (select 1 from public.tenant_members m where m.tenant_id = product2_savings_contributions.tenant_id and m.user_id = (select auth.uid()))
  and exists (select 1 from public.product2_savings_goals g where g.id = product2_savings_contributions.goal_id and g.tenant_id = product2_savings_contributions.tenant_id)
);
create policy "members can manage product2 debt accounts" on public.product2_debt_accounts for all to authenticated using (exists (select 1 from public.tenant_members m where m.tenant_id = product2_debt_accounts.tenant_id and m.user_id = (select auth.uid()))) with check (exists (select 1 from public.tenant_members m where m.tenant_id = product2_debt_accounts.tenant_id and m.user_id = (select auth.uid())));
create policy "members can manage product2 debt payments" on public.product2_debt_payments for all to authenticated using (exists (select 1 from public.tenant_members m where m.tenant_id = product2_debt_payments.tenant_id and m.user_id = (select auth.uid()))) with check (
  exists (select 1 from public.tenant_members m where m.tenant_id = product2_debt_payments.tenant_id and m.user_id = (select auth.uid()))
  and exists (select 1 from public.product2_debt_accounts d where d.id = product2_debt_payments.debt_id and d.tenant_id = product2_debt_payments.tenant_id)
);