create or replace function toolkit_internal.select_product2_plan(
  p_tenant_id uuid,
  p_plan_id text
)
returns table(plan_id text, selection_status text, entitlement_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_plan_active boolean;
  v_role text;
  v_entitlement_status text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select tm.role into v_role from public.tenant_members tm
  where tm.tenant_id=p_tenant_id and tm.user_id=v_user;
  if v_role is null then raise exception 'Tenant access denied'; end if;
  if v_role <> 'owner' then raise exception 'Only the tenant owner can select a plan'; end if;
  select p.active into v_plan_active from public.plans p where p.id=p_plan_id;
  if coalesce(v_plan_active,false)=false then raise exception 'Selected plan is not active'; end if;
  select tpe.status into v_entitlement_status from public.tenant_product_entitlements tpe
  where tpe.tenant_id=p_tenant_id and tpe.product_id='product2';
  if v_entitlement_status='suspended' then
    raise exception 'Product 2 access is suspended and cannot be changed from this screen';
  end if;

  if p_plan_id='free' then
    insert into public.tenant_product_entitlements(tenant_id,product_id,status,expires_at,updated_at)
    values(p_tenant_id,'product2','active',null,now())
    on conflict(tenant_id,product_id) do update set status='active',expires_at=null,updated_at=now();
    insert into public.tenant_product_plan_selections(tenant_id,product_id,plan_id,status,updated_at)
    values(p_tenant_id,'product2','free','selected',now())
    on conflict(tenant_id,product_id) do update set plan_id='free',status='selected',updated_at=now();
    return query select 'free','selected','active';
    return;
  end if;

  insert into public.tenant_product_plan_selections(tenant_id,product_id,plan_id,status,updated_at)
  values(p_tenant_id,'product2',p_plan_id,'pending_payment',now())
  on conflict(tenant_id,product_id) do update set plan_id=excluded.plan_id,status='pending_payment',updated_at=now();

  return query select p_plan_id,'pending_payment',coalesce(v_entitlement_status,'none');
end;
$$;

revoke all on function toolkit_internal.select_product2_plan(uuid,text) from public;
grant execute on function toolkit_internal.select_product2_plan(uuid,text) to authenticated;
