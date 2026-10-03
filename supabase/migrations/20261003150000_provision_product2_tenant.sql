create schema if not exists toolkit_internal;

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

  select tm.tenant_id
    into v_tenant
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
    )
      into v_name
      from auth.users au
     where au.id = v_user;

    insert into public.toolkit_tenants (name, owner_user_id)
    values (coalesce(v_name, 'My Toolkit'), v_user)
    returning id into v_tenant;

    insert into public.tenant_members (tenant_id, user_id, role)
    values (v_tenant, v_user, 'owner');
  end if;

  insert into public.tenant_product_entitlements (tenant_id, product_id, status)
  values (v_tenant, 'product2', 'active')
  on conflict (tenant_id, product_id)
  do update set status = 'active', updated_at = now();

  insert into public.product2_settings (tenant_id)
  values (v_tenant)
  on conflict (tenant_id) do nothing;

  return v_tenant;
end;
$$;

revoke all on function toolkit_internal.provision_product2_tenant(text) from public;
grant execute on function toolkit_internal.provision_product2_tenant(text) to authenticated;
