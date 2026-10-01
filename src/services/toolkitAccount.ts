import type { User } from '@supabase/supabase-js';
import { getAuthAccessToken } from './supabaseAuth';
import type { ToolkitEntitlementResponse } from '../types/toolkit';

export async function loadToolkitAccountSession(
  user: User,
): Promise<ToolkitEntitlementResponse | null> {
  try {
    const idToken = await getAuthAccessToken();
    const response = await fetch('/api/account/session', {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!response.ok) {
      console.warn('Toolkit account session unavailable:', response.status);
      return null;
    }

    return (await response.json()) as ToolkitEntitlementResponse;
  } catch (error) {
    console.warn('Toolkit account session could not be loaded:', error);
    return null;
  }
}


export async function completeToolkitOnboarding(
  user: User,
  displayName: string,
  planId: 'free' | 'plus' | 'pro',
): Promise<void> {
  const idToken = await getAuthAccessToken();
  const response = await fetch('/api/account/onboarding', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ displayName, planId }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Unable to save onboarding details.');
  }
}

export async function createBillingCheckout(
  user: User,
  planId: 'plus' | 'pro',
): Promise<{ checkoutUrl: string; sessionId: string; planId: 'plus' | 'pro' }> {
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
  if (!response.ok || !body.checkoutUrl) {
    throw new Error(body.error || 'Unable to start subscription checkout.');
  }
  return body;
}


export interface MobileMoneyPaymentInfo {
  provider: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  amount: number;
  currency: string;
}

export interface ManualPaymentStatus {
  id: string;
  planId: 'plus' | 'pro';
  status: 'pending' | 'approved' | 'rejected';
  transactionId: string;
  payerName: string | null;
}

export async function getMobileMoneyPaymentInfo(planId: 'plus' | 'pro'): Promise<MobileMoneyPaymentInfo> {
  const response = await fetch(`/api/billing/mobile-money?planId=${encodeURIComponent(planId)}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Unable to load Mobile Money payment details.');
  return body;
}

export async function createManualPaymentRequest(
  user: User,
  planId: 'plus' | 'pro',
  transactionId: string,
  payerName?: string,
): Promise<ManualPaymentStatus> {
  const idToken = await getAuthAccessToken();
  const response = await fetch('/api/billing/mobile-money/submit', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, transactionId, payerName }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Unable to submit the payment transaction.');
  return body;
}

export async function loadManualPaymentStatus(user: User, planId: 'plus' | 'pro'): Promise<ManualPaymentStatus | null> {
  const idToken = await getAuthAccessToken();
  const response = await fetch(`/api/billing/mobile-money/status?planId=${encodeURIComponent(planId)}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Unable to load payment status.');
  return body.request ?? null;
}
