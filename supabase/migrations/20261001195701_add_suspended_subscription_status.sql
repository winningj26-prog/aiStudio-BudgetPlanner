alter table public.subscriptions drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status = any (array['active'::text, 'trialing'::text, 'past_due'::text, 'canceled'::text, 'incomplete'::text, 'suspended'::text]));
