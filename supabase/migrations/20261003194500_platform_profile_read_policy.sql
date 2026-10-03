-- Compatibility marker. The shared platform profile policy was applied in
-- migration 20261003194030_platform_profile_read_policy.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='profiles'
      and policyname='users can read their own platform profile'
  ) then
    raise exception 'Expected shared platform profile policy is missing';
  end if;
end $$;