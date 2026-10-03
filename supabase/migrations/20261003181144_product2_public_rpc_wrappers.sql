-- Expose Product 2 RPC entry points through the public PostgREST schema.
-- The public wrappers are security-invoker functions; authorization remains in
-- the existing toolkit_internal security-definer functions.

grant usage on schema toolkit_internal to authenticated;

create or replace function public.provision_product2_tenant(p_display_name text default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return toolkit_internal.provision_product2_tenant(p_display_name);
end;
$$;

revoke all on function public.provision_product2_tenant(text) from public;
revoke execute on function public.provision_product2_tenant(text) from anon;
grant execute on function public.provision_product2_tenant(text) to authenticated;

create or replace function public.select_product2_plan(
  p_tenant_id uuid,
  p_plan_id text
)
returns table(plan_id text, selection_status text, entitlement_status text)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
    select * from toolkit_internal.select_product2_plan(p_tenant_id, p_plan_id);
end;
$$;

revoke all on function public.select_product2_plan(uuid, text) from public;
revoke execute on function public.select_product2_plan(uuid, text) from anon;
grant execute on function public.select_product2_plan(uuid, text) to authenticated;

create or replace function public.record_product2_debt_payment(
  p_tenant_id uuid,
  p_debt_id uuid,
  p_payment_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform toolkit_internal.record_product2_debt_payment(
    p_tenant_id,
    p_debt_id,
    p_payment_id,
    p_payment_date,
    p_amount,
    p_note
  );
end;
$$;

revoke all on function public.record_product2_debt_payment(uuid, uuid, uuid, date, numeric, text) from public;
revoke execute on function public.record_product2_debt_payment(uuid, uuid, uuid, date, numeric, text) from anon;
grant execute on function public.record_product2_debt_payment(uuid, uuid, uuid, date, numeric, text) to authenticated;
