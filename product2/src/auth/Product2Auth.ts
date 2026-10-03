import type { Session, User } from '@supabase/supabase-js';
import { requireSupabase } from '../lib/supabase.js';
import type { Product2Session } from '../session/Product2Session.js';

export async function signInWithPassword(email: string, password: string) {
  return requireSupabase().auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle() {
  return requireSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
}

export async function signOut() {
  return requireSupabase().auth.signOut();
}

export async function selectProduct2Plan(tenantId: string, planId: string) {
  const { data, error } = await requireSupabase().rpc('select_product2_plan', {
    p_tenant_id: tenantId,
    p_plan_id: planId,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function resolveProduct2Session(user: User): Promise<Product2Session> {
  const client = requireSupabase();
  const { data: membership, error: membershipError } = await client
    .from('tenant_members')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .order('role', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;

  let tenantId = membership?.tenant_id as string | undefined;
  if (!tenantId) {
    const { data, error } = await client.rpc('provision_product2_tenant', {
      p_display_name: typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : null,
    });
    if (error) throw error;
    tenantId = data as string;
  }
  if (!tenantId) throw new Error('Could not resolve a Product 2 tenant.');

  const { data: entitlement, error: entitlementError } = await client
    .from('tenant_product_entitlements')
    .select('status, expires_at')
    .eq('tenant_id', tenantId)
    .eq('product_id', 'product2')
    .maybeSingle();
  if (entitlementError) throw entitlementError;

  const { data: selection, error: selectionError } = await client
    .from('tenant_product_plan_selections')
    .select('plan_id, status')
    .eq('tenant_id', tenantId)
    .eq('product_id', 'product2')
    .maybeSingle();
  if (selectionError) throw selectionError;

  const active = entitlement?.status === 'active'
    && (!entitlement.expires_at || new Date(entitlement.expires_at).getTime() > Date.now());

  return {
    userId: user.id,
    tenantId,
    email: user.email ?? '',
    displayName: typeof user.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : (user.email?.split('@')[0] ?? 'User'),
    productAccess: active ? 'active' : entitlement ? 'inactive' : 'setup_required',
    planId: selection?.plan_id ?? (active ? 'free' : null),
    planSelectionStatus: selection?.status ?? (active ? 'selected' : null),
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
