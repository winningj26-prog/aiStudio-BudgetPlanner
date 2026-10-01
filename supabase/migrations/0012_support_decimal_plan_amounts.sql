-- Plan prices and recorded payment amounts support currency values with up to two decimal places.
alter table public.platform_settings
  alter column plus_amount type numeric(12,2) using plus_amount::numeric,
  alter column pro_amount type numeric(12,2) using pro_amount::numeric;

alter table public.manual_payment_requests
  alter column amount_value type numeric(12,2) using amount_value::numeric;

alter table public.billing_checkout_sessions
  alter column amount_value type numeric(12,2) using amount_value::numeric;
