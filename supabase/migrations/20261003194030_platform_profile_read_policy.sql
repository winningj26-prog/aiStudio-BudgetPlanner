-- Allow an authenticated user to read only the platform profile linked to their Supabase Auth identity.
create policy "users can read their own platform profile"
on public.profiles
for select
to authenticated
using (auth_user_id = (select auth.uid()));