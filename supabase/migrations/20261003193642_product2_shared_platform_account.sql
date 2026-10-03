-- Product 2 now belongs directly to the shared Toolkit platform account.
-- Legacy tenant columns are retained temporarily for migration compatibility.

alter table public.product2_settings
  add column if not exists account_id uuid references public.profiles(id) on delete cascade;
alter table public.product2_savings_goals
  add column if not exists account_id uuid references public.profiles(id) on delete cascade;
alter table public.product2_savings_contributions
  add column if not exists account_id uuid references public.profiles(id) on delete cascade;
alter table public.product2_debt_accounts
  add column if not exists account_id uuid references public.profiles(id) on delete cascade;
alter table public.product2_debt_payments
  add column if not exists account_id uuid references public.profiles(id) on delete cascade;

update public.product2_settings s set account_id=t.owner_user_id from public.toolkit_tenants t
where s.account_id is null and s.tenant_id=t.id;
update public.product2_savings_goals g set account_id=t.owner_user_id from public.toolkit_tenants t
where g.account_id is null and g.tenant_id=t.id;
update public.product2_savings_contributions c set account_id=t.owner_user_id from public.toolkit_tenants t
where c.account_id is null and c.tenant_id=t.id;
update public.product2_debt_accounts d set account_id=t.owner_user_id from public.toolkit_tenants t
where d.account_id is null and d.tenant_id=t.id;
update public.product2_debt_payments p set account_id=t.owner_user_id from public.toolkit_tenants t
where p.account_id is null and p.tenant_id=t.id;

alter table public.product2_settings alter column account_id set not null;
alter table public.product2_savings_goals alter column account_id set not null;
alter table public.product2_savings_contributions alter column account_id set not null;
alter table public.product2_debt_accounts alter column account_id set not null;
alter table public.product2_debt_payments alter column account_id set not null;

create unique index if not exists product2_settings_account_id_uidx on public.product2_settings(account_id);
create index if not exists product2_savings_goals_account_idx on public.product2_savings_goals(account_id);
create index if not exists product2_savings_contributions_account_idx on public.product2_savings_contributions(account_id);
create index if not exists product2_debt_accounts_account_idx on public.product2_debt_accounts(account_id);
create index if not exists product2_debt_payments_account_idx on public.product2_debt_payments(account_id);

drop policy if exists "members can read product2 settings" on public.product2_settings;
drop policy if exists "members can create product2 settings" on public.product2_settings;
drop policy if exists "members can update product2 settings" on public.product2_settings;
drop policy if exists "members can manage product2 savings goals" on public.product2_savings_goals;
drop policy if exists "members can manage product2 savings contributions" on public.product2_savings_contributions;
drop policy if exists "members can manage product2 debt accounts" on public.product2_debt_accounts;
drop policy if exists "members can manage product2 debt payments" on public.product2_debt_payments;

create policy "users can read their Product 2 settings" on public.product2_settings for select to authenticated
using (exists (select 1 from public.profiles p where p.id=product2_settings.account_id and p.auth_user_id=(select auth.uid())));
create policy "users can create their Product 2 settings" on public.product2_settings for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id=product2_settings.account_id and p.auth_user_id=(select auth.uid())));
create policy "users can update their Product 2 settings" on public.product2_settings for update to authenticated
using (exists (select 1 from public.profiles p where p.id=product2_settings.account_id and p.auth_user_id=(select auth.uid())))
with check (exists (select 1 from public.profiles p where p.id=product2_settings.account_id and p.auth_user_id=(select auth.uid())));

create policy "users can manage their Product 2 savings goals" on public.product2_savings_goals for all to authenticated
using (exists (select 1 from public.profiles p where p.id=product2_savings_goals.account_id and p.auth_user_id=(select auth.uid())))
with check (exists (select 1 from public.profiles p where p.id=product2_savings_goals.account_id and p.auth_user_id=(select auth.uid())));

create policy "users can manage their Product 2 savings contributions" on public.product2_savings_contributions for all to authenticated
using (exists (select 1 from public.profiles p where p.id=product2_savings_contributions.account_id and p.auth_user_id=(select auth.uid())))
with check (
  exists (select 1 from public.profiles p where p.id=product2_savings_contributions.account_id and p.auth_user_id=(select auth.uid()))
  and exists (select 1 from public.product2_savings_goals g where g.id=product2_savings_contributions.goal_id and g.account_id=product2_savings_contributions.account_id)
);

create policy "users can manage their Product 2 debt accounts" on public.product2_debt_accounts for all to authenticated
using (exists (select 1 from public.profiles p where p.id=product2_debt_accounts.account_id and p.auth_user_id=(select auth.uid())))
with check (exists (select 1 from public.profiles p where p.id=product2_debt_accounts.account_id and p.auth_user_id=(select auth.uid())));

create policy "users can manage their Product 2 debt payments" on public.product2_debt_payments for all to authenticated
using (exists (select 1 from public.profiles p where p.id=product2_debt_payments.account_id and p.auth_user_id=(select auth.uid())))
with check (
  exists (select 1 from public.profiles p where p.id=product2_debt_payments.account_id and p.auth_user_id=(select auth.uid()))
  and exists (select 1 from public.product2_debt_accounts d where d.id=product2_debt_payments.debt_id and d.account_id=product2_debt_payments.account_id)
);

create or replace function public.record_product2_debt_payment_for_account(
  p_account_id uuid, p_debt_id uuid, p_payment_id uuid, p_payment_date date,
  p_amount numeric, p_note text default null
) returns table(principal numeric, interest numeric, fees numeric, new_balance numeric)
language plpgsql security invoker set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_debt public.product2_debt_accounts%rowtype;
  v_interest numeric; v_principal numeric; v_fees numeric:=0; v_new_balance numeric;
  v_rate numeric:=0; v_periods numeric:=12;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_amount <= 0 then raise exception 'Payment amount must be positive'; end if;
  if not exists (select 1 from public.profiles p where p.id=p_account_id and p.auth_user_id=v_user)
    then raise exception 'Account access denied'; end if;
  select * into v_debt from public.product2_debt_accounts d
    where d.id=p_debt_id and d.account_id=p_account_id for update;
  if not found then raise exception 'Debt account not found'; end if;
  if v_debt.balance <= 0 then
    v_interest:=0; v_principal:=0; v_new_balance:=0;
  else
    v_rate:=coalesce(v_debt.interest_rate,0);
    case v_debt.payment_frequency when 'weekly' then v_periods:=52 when 'biweekly' then v_periods:=26 else v_periods:=12 end case;
    v_interest:=round(v_debt.balance*(v_rate/100)/v_periods,2);
    v_principal:=greatest(0,least(v_debt.balance,round(p_amount-v_interest,2)));
    v_new_balance:=greatest(0,round(v_debt.balance-v_principal,2));
  end if;
  insert into public.product2_debt_payments(id,account_id,tenant_id,debt_id,payment_date,amount,principal,interest,fees,note)
    values(p_payment_id,p_account_id,null,p_debt_id,p_payment_date,p_amount,v_principal,v_interest,v_fees,p_note);
  update public.product2_debt_accounts set balance=v_new_balance,
    status=case when v_new_balance=0 then 'paid' else status end, updated_at=now()
    where id=p_debt_id and account_id=p_account_id;
  return query select v_principal,v_interest,v_fees,v_new_balance;
end;
$$;

revoke all on function public.record_product2_debt_payment_for_account(uuid,uuid,uuid,date,numeric,text) from public;
revoke execute on function public.record_product2_debt_payment_for_account(uuid,uuid,uuid,date,numeric,text) from anon;
grant execute on function public.record_product2_debt_payment_for_account(uuid,uuid,uuid,date,numeric,text) to authenticated;
