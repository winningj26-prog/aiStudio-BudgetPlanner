export type Product2Access = 'active' | 'setup_required' | 'inactive';

export interface Product2Session {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  productAccess: Product2Access;
  planId: string | null;
  planSelectionStatus: 'selected' | 'pending_payment' | null;
}

export const KEY = 'budgetplanner.product2.session';

export function loadProduct2Session(): Product2Session | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(KEY);
  return raw ? JSON.parse(raw) as Product2Session : null;
}

export function saveProduct2Session(session: Product2Session) {
  window.sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function clearProduct2Session() {
  window.sessionStorage.removeItem(KEY);
}
