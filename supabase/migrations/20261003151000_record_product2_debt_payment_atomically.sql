create or replace function toolkit_internal.record_product2_debt_payment(
  p_tenant_id uuid, p_debt_id uuid, p_payment_id uuid, p_payment_date date,
  p_amount numeric, p_note text default null
) returns table(principal numeric, interest numeric, fees numeric, new_balance numeric)
language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_debt public.product2_debt_accounts%rowtype;
v_interest numeric; v_principal numeric; v_fees numeric := 0; v_new_balance numeric;
v_rate numeric := 0; v_periods numeric := 12;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_amount <= 0 then raise exception 'Payment amount must be positive'; end if;
 if not exists (select 1 from public.tenant_members tm where tm.tenant_id=p_tenant_id and tm.user_id=v_user)
 then raise exception 'Tenant access denied'; end if;
 select * into v_debt from public.product2_debt_accounts d
 where d.id=p_debt_id and d.tenant_id=p_tenant_id for update;
 if not found then raise exception 'Debt account not found'; end if;
 if v_debt.balance <= 0 then v_interest:=0; v_principal:=0; v_new_balance:=0;
 else
  v_rate:=coalesce(v_debt.interest_rate,0);
  case v_debt.payment_frequency when 'weekly' then v_periods:=52 when 'biweekly' then v_periods:=26 else v_periods:=12 end case;
  v_interest:=round(v_debt.balance*(v_rate/100)/v_periods,2);
  v_principal:=greatest(0,least(v_debt.balance,round(p_amount-v_interest,2)));
  v_new_balance:=greatest(0,round(v_debt.balance-v_principal,2));
 end if;
 insert into public.product2_debt_payments(id,tenant_id,debt_id,payment_date,amount,principal,interest,fees,note)
 values(p_payment_id,p_tenant_id,p_debt_id,p_payment_date,p_amount,v_principal,v_interest,v_fees,p_note);
 update public.product2_debt_accounts set balance=v_new_balance,
 status=case when v_new_balance=0 then 'paid' else status end, updated_at=now()
 where id=p_debt_id and tenant_id=p_tenant_id;
 return query select v_principal,v_interest,v_fees,v_new_balance;
end; $$;
revoke all on function toolkit_internal.record_product2_debt_payment(uuid,uuid,uuid,date,numeric,text) from public;
grant execute on function toolkit_internal.record_product2_debt_payment(uuid,uuid,uuid,date,numeric,text) to authenticated;