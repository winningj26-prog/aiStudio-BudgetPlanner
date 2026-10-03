-- Allow an authenticated user to read only the single platform profile
-- that is linked to their Supabase Auth identity. Product-specific RLS policies
-- use this relationship to enforce shared-account ownership.
create policy "users can read their own platform profile"
on public.profiles
for select
to authenticated
using (auth_user_id = (select auth.uid()));