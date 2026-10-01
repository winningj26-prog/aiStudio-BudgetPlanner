/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CategoryItem,
  Debt,
  ExpenseTransaction,
  IncomeTransaction,
  RecurringTransaction,
  SavingsGoal,
  SettingsState,
  WorksheetTab,
} from '../types/budget';
import type { GoogleSheetConfig } from '../services/googleSheetsService';
import { STORAGE_KEYS, loadFromAccountStorage, saveToAccountStorage } from '../utils/storage';
import { normalizeWorkbookData } from '../utils/workbookValidation';

export interface WorkbookData {
  settings: SettingsState;
  incomeCategories: CategoryItem[];
  expenseCategories: CategoryItem[];
  paymentMethods: string[];
  incomeTransactions: IncomeTransaction[];
  expenseTransactions: ExpenseTransaction[];
  plannedIncome: Record<string, number>;
  plannedExpenses: Record<string, number>;
  savingsGoals: SavingsGoal[];
  debts: Debt[];
  recurringTransactions: RecurringTransaction[];
  userEmail: string;
  activeTab: WorksheetTab;
  sheetConfig: GoogleSheetConfig | null;
}

export interface WorkbookRepository {
  load(): WorkbookData;
  save(data: WorkbookData): void;
}

export interface WorkbookDefaults {
  settings: SettingsState;
  incomeCategories: CategoryItem[];
  expenseCategories: CategoryItem[];
  paymentMethods: string[];
  incomeTransactions: IncomeTransaction[];
  expenseTransactions: ExpenseTransaction[];
  plannedIncome: Record<string, number>;
  plannedExpenses: Record<string, number>;
  savingsGoals: SavingsGoal[];
  debts: Debt[];
  recurringTransactions: RecurringTransaction[];
  userEmail: string;
  activeTab: WorksheetTab;
  sheetConfig: GoogleSheetConfig | null;
}

const defaultsToWorkbook = (defaults: WorkbookDefaults): WorkbookData => ({ ...defaults });

export function createLocalWorkbookRepository(
  userId: string,
  defaults: WorkbookDefaults,
): WorkbookRepository {
  return {
    load(): WorkbookData {
      const raw: WorkbookData = {
        settings: loadFromAccountStorage(STORAGE_KEYS.SETTINGS, userId, defaults.settings),
        incomeCategories: loadFromAccountStorage(STORAGE_KEYS.INCOME_CATEGORIES, userId, defaults.incomeCategories),
        expenseCategories: loadFromAccountStorage(STORAGE_KEYS.EXPENSE_CATEGORIES, userId, defaults.expenseCategories),
        paymentMethods: loadFromAccountStorage(STORAGE_KEYS.PAYMENT_METHODS, userId, defaults.paymentMethods),
        incomeTransactions: loadFromAccountStorage(STORAGE_KEYS.INCOME_TRANSACTIONS, userId, defaults.incomeTransactions),
        expenseTransactions: loadFromAccountStorage(STORAGE_KEYS.EXPENSE_TRANSACTIONS, userId, defaults.expenseTransactions),
        plannedIncome: loadFromAccountStorage(STORAGE_KEYS.PLANNED_INCOME, userId, defaults.plannedIncome),
        plannedExpenses: loadFromAccountStorage(STORAGE_KEYS.PLANNED_EXPENSES, userId, defaults.plannedExpenses),
        savingsGoals: loadFromAccountStorage(STORAGE_KEYS.SAVINGS_GOALS, userId, defaults.savingsGoals),
        debts: loadFromAccountStorage(STORAGE_KEYS.DEBTS, userId, defaults.debts),
        recurringTransactions: loadFromAccountStorage(STORAGE_KEYS.RECURRING_TRANSACTIONS, userId, defaults.recurringTransactions),
        userEmail: loadFromAccountStorage(STORAGE_KEYS.USER_EMAIL, userId, defaults.userEmail),
        activeTab: loadFromAccountStorage(STORAGE_KEYS.ACTIVE_TAB, userId, defaults.activeTab),
        sheetConfig: loadFromAccountStorage(STORAGE_KEYS.GOOGLE_SHEET_CONFIG, userId, defaults.sheetConfig),
      };
      return normalizeWorkbookData(raw, defaults);
    },

    save(data: WorkbookData): void {
      saveToAccountStorage(STORAGE_KEYS.SETTINGS, userId, data.settings);
      saveToAccountStorage(STORAGE_KEYS.INCOME_CATEGORIES, userId, data.incomeCategories);
      saveToAccountStorage(STORAGE_KEYS.EXPENSE_CATEGORIES, userId, data.expenseCategories);
      saveToAccountStorage(STORAGE_KEYS.PAYMENT_METHODS, userId, data.paymentMethods);
      saveToAccountStorage(STORAGE_KEYS.INCOME_TRANSACTIONS, userId, data.incomeTransactions);
      saveToAccountStorage(STORAGE_KEYS.EXPENSE_TRANSACTIONS, userId, data.expenseTransactions);
      saveToAccountStorage(STORAGE_KEYS.PLANNED_INCOME, userId, data.plannedIncome);
      saveToAccountStorage(STORAGE_KEYS.PLANNED_EXPENSES, userId, data.plannedExpenses);
      saveToAccountStorage(STORAGE_KEYS.SAVINGS_GOALS, userId, data.savingsGoals);
      saveToAccountStorage(STORAGE_KEYS.DEBTS, userId, data.debts);
      saveToAccountStorage(
        STORAGE_KEYS.RECURRING_TRANSACTIONS,
        userId,
        data.recurringTransactions,
      );
      saveToAccountStorage(STORAGE_KEYS.USER_EMAIL, userId, data.userEmail);
      saveToAccountStorage(STORAGE_KEYS.ACTIVE_TAB, userId, data.activeTab);
      saveToAccountStorage(STORAGE_KEYS.GOOGLE_SHEET_CONFIG, userId, data.sheetConfig);
    },
  };
}

export { defaultsToWorkbook };
