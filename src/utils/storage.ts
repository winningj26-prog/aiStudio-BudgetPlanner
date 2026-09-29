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
  IS_LOGGED_IN: 'pmbp_is_logged_in_v2',
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
