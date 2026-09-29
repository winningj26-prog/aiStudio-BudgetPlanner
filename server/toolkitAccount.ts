import type { ToolkitEntitlementResponse, ToolkitPlanId } from '../src/types/toolkit';

type AccountUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
};

type SupabaseProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  photo_url: string | null;
};

const getSupabaseConfig = () => ({
  url: process.env.SUPABASE_URL?.replace(/\/$/, ''),
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

const supabaseRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const { url, serviceRoleKey } = getSupabaseConfig();
  if (!url || !serviceRoleKey) throw new Error('Supabase account service is not configured');

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
  return response.json() as Promise<T>;
};

export const isAccountServiceConfigured = () => {
  const { url, serviceRoleKey } = getSupabaseConfig();
  return Boolean(url && serviceRoleKey);
};

export const syncToolkitAccount = async (user: AccountUser): Promise<ToolkitEntitlementResponse> => {
  const profileRows = await supabaseRequest<SupabaseProfile[]>('profiles?on_conflict=firebase_uid', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      firebase_uid: user.uid,
      email: user.email,
      display_name: user.displayName,
      photo_url: user.photoUrl,
    }),
  });

  const profile = profileRows[0];
  if (!profile) throw new Error('Supabase account profile was not returned');

  const subscriptionRows = await supabaseRequest<Array<{
    plan_id: ToolkitPlanId;
    status: ToolkitEntitlementResponse['session']['subscription']['status'];
    provider: ToolkitEntitlementResponse['session']['subscription']['provider'];
    current_period_end: string | null;
  }>>(`subscriptions?user_id=eq.${encodeURIComponent(profile.id)}&status=in.(active,trialing,past_due,incomplete)&select=plan_id,status,provider,current_period_end&limit=1`);

  const subscription = subscriptionRows[0] ?? {
    plan_id: 'free' as const,
    status: 'active' as const,
    provider: 'none' as const,
    current_period_end: null,
  };

  const entitlementRows = await supabaseRequest<Array<{ feature_key: string }>>(
    `plan_entitlements?plan_id=eq.${encodeURIComponent(subscription.plan_id)}&enabled=eq.true&select=feature_key`,
  );

  return {
    version: 1,
    session: {
      user: {
        id: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        photoUrl: profile.photo_url,
      },
      subscription: {
        planId: subscription.plan_id,
        status: subscription.status,
        provider: subscription.provider,
        currentPeriodEnd: subscription.current_period_end,
      },
      entitlements: {
        apps: {
          'budget-planner': true,
          'app-2': true,
          'app-3': true,
          'app-4': true,
        },
        features: Object.fromEntries(entitlementRows.map((item) => [item.feature_key, true])),
      },
    },
  };
};
