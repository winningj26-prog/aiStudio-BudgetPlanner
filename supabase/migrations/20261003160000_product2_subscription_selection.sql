create table if not exists public.tenant_product_plan_selections (
  tenant_id uuid not null references public.toolkit_tenants(id) on delete cascade,
  product_id text not null references public.toolkit_products(id) on delete restrict,
  plan_id text not null references public.plans(id) on delete restrict,
  status text not null default 'selected' check (status in ('selected','pending_payment')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, product_id)
);

create index if not exists tenant_product_plan_selections_plan_idx
  on public.tenant_product_plan_selections(plan_id);

alter table public.tenant_product_plan_selections enable row level security;
revoke all on table public.tenant_product_plan_selections from anon;
grant select on public.tenant_product_plan_selections to authenticated;

create policy "members can read their product plan selection"
on public.tenant_product_plan_selections
for select to authenticated
using (
  exists (
    select 1 from public.tenant_members m
    where m.tenant_id = tenant_product_plan_selections.tenant_id
      and m.user_id = (select auth.uid())
  )
);

create or replace function toolkit_internal.provision_product2_tenant(p_display_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_tenant uuid;
  v_name text;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select tm.tenant_id into v_tenant
  from public.tenant_members tm
  where tm.user_id = v_user
  order by tm.role = 'owner' desc, tm.tenant_id
  limit 1;

  if v_tenant is null then
    select coalesce(
      nullif(trim(p_display_name), ''),
      nullif(trim(au.raw_user_meta_data ->> 'display_name'), ''),
      au.email,
      'My Toolkit'
    ) into v_name
    from auth.users au
    where au.id = v_user;

    insert into public.toolkit_tenants (name, owner_user_id)
    values (coalesce(v_name, 'My Toolkit'), v_user)
    returning id into v_tenant;

    insert into public.tenant_members (tenant_id, user_id, role)
    values (v_tenant, v_user, 'owner');
  end if;

  insert into public.product2_settings (tenant_id)
  values (v_tenant)
  on conflict (tenant_id) do nothing;

  return v_tenant;
end;
$$;

revoke all on function toolkit_internal.provision_product2_tenant(text) from public;
grant execute on function toolkit_internal.provision_product2_tenant(text) to authenticated;

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
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select tm.role into v_role
  from public.tenant_members tm
  where tm.tenant_id = p_tenant_id and tm.user_id = v_user;

  if v_role is null then
    raise exception 'Tenant access denied';
  end if;

  if v_role <> 'owner' then
    raise exception 'Only the tenant owner can select a plan';
  end if;

  select p.active into v_plan_active
  from public.plans p
  where p.id = p_plan_id;

  if coalesce(v_plan_active, false) = false then
    raise exception 'Selected plan is not active';
  end if;

  if p_plan_id = 'free' then
    insert into public.tenant_product_entitlements
      (tenant_id, product_id, status, expires_at, updated_at)
    values
      (p_tenant_id, 'product2', 'active', null, now())
    on conflict (tenant_id, product_id)
    do update set status='active', expires_at=null, updated_at=now();

    insert into public.tenant_product_plan_selections
      (tenant_id, product_id, plan_id, status, updated_at)
    values
      (p_tenant_id, 'product2', 'free', 'selected', now())
    on conflict (tenant_id, product_id)
    do update set plan_id='free', status='selected', updated_at=now();

    v_entitlement_status := 'active';
    return query select 'free', 'selected', v_entitlement_status;
  end if;

  insert into public.tenant_product_plan_selections
    (tenant_id, product_id, plan_id, status, updated_at)
  values
    (p_tenant_id, 'product2', p_plan_id, 'pending_payment', now())
  on conflict (tenant_id, product_id)
  do update set plan_id=excluded.plan_id, status='pending_payment', updated_at=now();

  select tpe.status into v_entitlement_status
  from public.tenant_product_entitlements tpe
  where tpe.tenant_id=p_tenant_id and tpe.product_id='product2';

  return query select p_plan_id, 'pending_payment', coalesce(v_entitlement_status, 'none');
end;
$$;

revoke all on function toolkit_internal.select_product2_plan(uuid,text) from public;
grant execute on function toolkit_internal.select_product2_plan(uuid,text) to authenticated;
