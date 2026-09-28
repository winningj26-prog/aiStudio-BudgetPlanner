/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const STORAGE_KEYS = {
  SETTINGS: 'pmbp_settings_v1',
  INCOME_CATEGORIES: 'pmbp_income_categories_v1',
  EXPENSE_CATEGORIES: 'pmbp_expense_categories_v1',
  PAYMENT_METHODS: 'pmbp_payment_methods_v1',
  INCOME_TRANSACTIONS: 'pmbp_income_transactions_v1',
  EXPENSE_TRANSACTIONS: 'pmbp_expense_transactions_v1',
  PLANNED_INCOME: 'pmbp_planned_income_v1',
  PLANNED_EXPENSES: 'pmbp_planned_expenses_v1',
  ANNUAL_DATA: 'pmbp_annual_data_v1',
  USER_EMAIL: 'pmbp_user_email_v1',
  IS_LOGGED_IN: 'pmbp_is_logged_in_v1',
  GOOGLE_SHEET_CONFIG: 'pmbp_google_sheet_config_v1',
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
