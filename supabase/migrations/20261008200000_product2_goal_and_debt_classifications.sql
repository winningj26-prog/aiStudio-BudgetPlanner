-- Product 2 classification fields for savings goals and debt accounts.
alter table public.product2_savings_goals
  add column if not exists category text not null default 'Other';

alter table public.product2_debt_accounts
  add column if not exists debt_type text not null default 'Other';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'product2_savings_goals_category_check') then
    alter table public.product2_savings_goals
      add constraint product2_savings_goals_category_check
      check (category in ('Emergency Fund','Vacation','Home','Vehicle','Education','Other'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'product2_debt_accounts_type_check') then
    alter table public.product2_debt_accounts
      add constraint product2_debt_accounts_type_check
      check (debt_type in ('Credit Card','Personal Loan','Auto Loan','Student Loan','Mortgage','Other'));
  end if;
end $$;