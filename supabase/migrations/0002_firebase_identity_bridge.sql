-- Map the existing Firebase authentication identity to the central toolkit profile.
-- Firebase UIDs are strings and must not be used as PostgreSQL UUID primary keys.

alter table public.profiles
  add column if not exists auth_provider text,
  add column if not exists auth_subject text;

create unique index if not exists profiles_auth_identity_unique
  on public.profiles(auth_provider, auth_subject)
  where auth_provider is not null and auth_subject is not null;

alter table public.profiles
  drop constraint if exists profiles_auth_provider_check;

alter table public.profiles
  add constraint profiles_auth_provider_check
  check (auth_provider is null or auth_provider in ('firebase'));

-- User-owned tables are accessed through the trusted account API for now.
-- Keep RLS enabled so a future direct Supabase client cannot accidentally
-- bypass the intended security boundary.
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.app_entitlements enable row level security;
alter table public.integrations enable row level security;
alter table public.usage enable row level security;

-- No browser policies are added yet because Firebase is the current auth
-- provider and the browser does not establish a Supabase auth.uid().
-- The service-role account API is the only application access path at this stage.
