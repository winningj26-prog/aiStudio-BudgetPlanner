-- Manual Mobile Money billing requests are reviewed by the application owner.
-- Users never receive write access to subscription records directly.
CREATE TABLE IF NOT EXISTS public.manual_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id text NOT NULL CHECK (plan_id IN ('plus', 'pro')),
  amount_value integer NOT NULL CHECK (amount_value > 0),
  currency text NOT NULL DEFAULT 'SLE',
  payment_method text NOT NULL DEFAULT 'mobile_money',
  transaction_id text NOT NULL,
  payer_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by text,
  reviewer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS manual_payment_requests_user_idx
  ON public.manual_payment_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS manual_payment_requests_status_idx
  ON public.manual_payment_requests (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS manual_payment_requests_pending_tx_idx
  ON public.manual_payment_requests (lower(transaction_id))
  WHERE status = 'pending';

ALTER TABLE public.manual_payment_requests ENABLE ROW LEVEL SECURITY;

-- Browser clients do not access this table directly. Server-side service credentials
-- submit and review requests after authenticating the Supabase user.
