-- Supabase Auth is now the sole identity provider.
-- Keep legacy Firebase identity columns temporarily so existing profiles can
-- be claimed by a verified Supabase user with the same email.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_auth_user_id_idx
  ON public.profiles (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_email_idx
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_auth_provider_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_auth_provider_check
  CHECK (auth_provider IS NULL OR auth_provider IN ('firebase', 'supabase'));
