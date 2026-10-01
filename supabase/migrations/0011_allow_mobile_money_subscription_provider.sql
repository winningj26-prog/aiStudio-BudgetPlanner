-- Manual Mobile Money approvals create subscriptions with the mobile_money provider.
-- Keep the provider allowlist aligned with the billing review workflow.
alter table public.subscriptions drop constraint if exists subscriptions_provider_check;

alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider = any (array['none'::text, 'monime'::text, 'mobile_money'::text]));
