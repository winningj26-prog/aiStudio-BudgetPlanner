import type { Session, User } from '@supabase/supabase-js';
import { requireSupabase } from '../lib/supabase.js';
import type { Product2Session } from '../session/Product2Session.js';

export async function signOut() {
  return requireSupabase().auth.signOut();
}

/**
 * Product 2 consumes the existing Toolkit account/session.
 * It deliberately has no Product 2 login, tenant provisioning, or billing flow.
 */
export async function resolveProduct2Session(user: User): Promise<Product2Session> {
  const client = requireSupabase();
  const { data: authSession, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!authSession.session) throw new Error('Your Toolkit authentication session has expired.');

  const response = await fetch('/api/account/session', {
    headers: { Authorization: `Bearer ${authSession.session.access_token}` },
  });
  const body = await response.json().catch(() => ({}));

  if (response.status === 403 && body?.code === 'ACCOUNT_SUSPENDED') {
    throw new Error(body.message || 'Your Toolkit account is suspended.');
  }
  if (!response.ok) {
    throw new Error(body.error || 'Could not load the shared Toolkit account.');
  }

  const account = body?.session;
  const platformUser = account?.user;
  if (!platformUser?.id) throw new Error('The shared Toolkit account could not be resolved.');

  const appAccess = Boolean(account?.entitlements?.apps?.product2);
  if (!appAccess) {
    return {
      userId: user.id,
      accountId: platformUser.id,
      email: platformUser.email ?? user.email ?? '',
      displayName: platformUser.displayName
        ?? (user.user_metadata?.display_name as string | undefined)
        ?? user.email?.split('@')[0]
        ?? 'User',
      productAccess: 'inactive',
    };
  }

  return {
    userId: user.id,
    accountId: platformUser.id,
    email: platformUser.email ?? user.email ?? '',
    displayName: platformUser.displayName
      ?? (user.user_metadata?.display_name as string | undefined)
      ?? user.email?.split('@')[0]
      ?? 'User',
    productAccess: 'active',
  };
}

export async function getInitialProduct2AuthState(): Promise<{ session: Session | null; user: User | null }> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session) return { session: null, user: null };

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  return { session: data.session, user: userData.user };
}
