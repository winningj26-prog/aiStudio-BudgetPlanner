/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const STORAGE_KEYS = {
  SETTINGS: 'pmbp_settings_v2',
  INCOME_CATEGORIES: 'pmbp_income_categories_v2',
  EXPENSE_CATEGORIES: 'pmbp_expense_categories_v2',
  PAYMENT_METHODS: 'pmbp_payment_methods_v2',
  INCOME_TRANSACTIONS: 'pmbp_income_transactions_v2',
  EXPENSE_TRANSACTIONS: 'pmbp_expense_transactions_v2',
  PLANNED_INCOME: 'pmbp_planned_income_v2',
  PLANNED_EXPENSES: 'pmbp_planned_expenses_v2',
  SAVINGS_GOALS: 'pmbp_savings_goals_v2',
  DEBTS: 'pmbp_debts_v2',
  RECURRING_TRANSACTIONS: 'pmbp_recurring_transactions_v2',
  USER_EMAIL: 'pmbp_user_email_v2',
  GOOGLE_SHEET_CONFIG: 'pmbp_google_sheet_config_v2',
  ACTIVE_TAB: 'pmbp_active_tab_v2',
} as const;

/**
 * Safely load JSON data from localStorage with a fallback value.
 */
export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const item = window.localStorage.getItem(key);
    if (item === null || item === undefined || item === '') {
      return fallback;
    }
    const parsed = JSON.parse(item);
    return parsed as T;
  } catch (error) {
    console.warn(`[storage] Error loading key "${key}" from localStorage:`, error);
    return fallback;
  }
}

/**
 * Safely save JSON data to localStorage.
 */
export function saveToStorage<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[storage] Error saving key "${key}" to localStorage:`, error);
    return false;
  }
}

/**
 * Remove an item from localStorage.
 */
export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[storage] Error removing key "${key}" from localStorage:`, error);
  }
}

/**
 * Clear all persistent budget planner keys from localStorage.
 */
export function clearBudgetStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    Object.values(STORAGE_KEYS).forEach((k) => {
      window.localStorage.removeItem(k);
    });
  } catch (error) {
    console.warn('[storage] Error clearing budget storage:', error);
  }
}


/**
 * Remove legacy V1 browser storage so previously seeded demo data cannot reappear
 * after the clean-data release.
 */
export function clearLegacyV1Storage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const legacyKeys = [
    'pmbp_settings_v1',
    'pmbp_income_categories_v1',
    'pmbp_expense_categories_v1',
    'pmbp_payment_methods_v1',
    'pmbp_income_transactions_v1',
    'pmbp_expense_transactions_v1',
    'pmbp_planned_income_v1',
    'pmbp_planned_expenses_v1',
    'pmbp_savings_goals_v1',
    'pmbp_debts_v1',
    'pmbp_recurring_transactions_v1',
    'pmbp_user_email_v1',
    'pmbp_is_logged_in_v1',
    'pmbp_google_sheet_config_v1',
    'pmbp_active_tab_v1',
  ];
  legacyKeys.forEach((key) => window.localStorage.removeItem(key));
}


/**
 * Build an account-scoped localStorage key.
 *
 * Firebase UID is used only as a namespace; it is not treated as authorization.
 * Cloud authorization remains a server/database responsibility.
 */
export function getAccountStorageKey(key: string, userId: string): string {
  return `pmbp_account_${encodeURIComponent(userId)}_${key}`;
}

/**
 * Load a value from the current user's local browser namespace.
 */
export function loadFromAccountStorage<T>(key: string, userId: string, fallback: T): T {
  return loadFromStorage<T>(getAccountStorageKey(key, userId), fallback);
}

/**
 * Save a value to the current user's local browser namespace.
 */
export function saveToAccountStorage<T>(key: string, userId: string, value: T): boolean {
  return saveToStorage(getAccountStorageKey(key, userId), value);
}

/**
 * Determine whether this account already has any scoped workbook data.
 */
export function hasAccountStorage(userId: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  const prefix = `pmbp_account_${encodeURIComponent(userId)}_`;
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * One-time migration of the old unscoped V2 browser workbook into the first
 * authenticated account that opens it. Existing account-scoped data always wins.
 *
 * This keeps the current user's data intact while preventing it from being
 * reused when a different Google account signs in on the same browser.
 */
export function migrateLegacyV2StorageToAccount(userId: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  if (hasAccountStorage(userId)) return false;

  let migrated = false;
  for (const key of Object.values(STORAGE_KEYS)) {
    const legacyValue = window.localStorage.getItem(key);
    if (legacyValue === null) continue;

    const scopedKey = getAccountStorageKey(key, userId);
    if (window.localStorage.getItem(scopedKey) === null) {
      window.localStorage.setItem(scopedKey, legacyValue);
      migrated = true;
    }
  }

  // Once migrated, remove only the old unscoped V2 keys. Account-scoped copies
  // remain available to this account and are never removed by this migration.
  if (migrated) {
    for (const key of Object.values(STORAGE_KEYS)) {
      window.localStorage.removeItem(key);
    }
  }

  return migrated;
}
