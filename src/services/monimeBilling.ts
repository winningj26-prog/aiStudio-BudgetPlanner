import type { User } from '@supabase/supabase-js';
import { getAuthAccessToken } from './supabaseAuth';

export type BillingPlanId = 'plus' | 'pro';

export interface CheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
  planId: BillingPlanId;
}

export async function createMonimeCheckoutSession(
  user: User,
  planId: BillingPlanId,
): Promise<CheckoutSessionResponse> {
  const idToken = await getAuthAccessToken();
  const response = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ planId }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || 'Unable to start Monime checkout.');
  }
  return body as CheckoutSessionResponse;
}
