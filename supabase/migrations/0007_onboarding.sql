-- Track first-run onboarding on the central toolkit profile.
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_completed_at timestamptz;

create index if not exists profiles_onboarding_completed_idx
  on public.profiles(onboarding_completed);
