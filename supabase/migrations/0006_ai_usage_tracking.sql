-- AI Insights usage tracking
-- Server-side SECURITY DEFINER function increments metered usage atomically.
-- The function is callable only by the trusted server credential.

create or replace function public.increment_usage(
  p_user_id uuid,
  p_usage_key text,
  p_period_start date,
  p_quantity bigint default 1
)
returns public.usage
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.usage;
begin
  if p_quantity <= 0 then
    raise exception 'Usage quantity must be positive';
  end if;

  insert into public.usage (user_id, usage_key, period_start, quantity, updated_at)
  values (p_user_id, p_usage_key, p_period_start, p_quantity, now())
  on conflict (user_id, usage_key, period_start)
  do update set
    quantity = public.usage.quantity + excluded.quantity,
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke execute on function public.increment_usage(uuid, text, date, bigint) from anon, authenticated;
