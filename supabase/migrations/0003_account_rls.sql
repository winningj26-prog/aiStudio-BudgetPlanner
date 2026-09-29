-- Account data is server-owned.
-- The browser must not access these tables directly with an anon/publishable key.
-- The server-side Supabase service role bypasses RLS.

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.app_entitlements enable row level security;
alter table public.integrations enable row level security;
alter table public.usage enable row level security;
