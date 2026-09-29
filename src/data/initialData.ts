import {
  CategoryItem,
  Debt,
  ExpenseTransaction,
  IncomeTransaction,
  RecurringTransaction,
  SavingsGoal,
  SettingsState,
} from '../types/budget';

export const INITIAL_SETTINGS: SettingsState = {
  currency: 'USD',
  month: 'January',
  year: 2026,
  dateFormat: 'MM/DD/YYYY',
  secondaryCurrency: 'EUR',
  enableSecondaryCurrency: false,
};

export const INITIAL_INCOME_CATEGORIES: CategoryItem[] = [
  { id: 'inc_1', name: 'Salary', isActive: true, color: '#0d9488' },
  { id: 'inc_2', name: 'Business Income', isActive: true, color: '#0284c7' },
  { id: 'inc_3', name: 'Side Income', isActive: true, color: '#6366f1' },
  { id: 'inc_4', name: 'Investment Income', isActive: true, color: '#8b5cf6' },
  { id: 'inc_5', name: 'Other Income', isActive: true, color: '#10b981' },
];

export const INITIAL_EXPENSE_CATEGORIES: CategoryItem[] = [
  { id: 'exp_1', name: 'Housing', isActive: true, color: '#3b82f6' },
  { id: 'exp_2', name: 'Utilities', isActive: true, color: '#06b6d4' },
  { id: 'exp_3', name: 'Groceries', isActive: true, color: '#10b981' },
  { id: 'exp_4', name: 'Transportation', isActive: true, color: '#f59e0b' },
  { id: 'exp_5', name: 'Insurance', isActive: true, color: '#8b5cf6' },
  { id: 'exp_6', name: 'Healthcare', isActive: true, color: '#ec4899' },
  { id: 'exp_7', name: 'Entertainment', isActive: true, color: '#f43f5e' },
  { id: 'exp_8', name: 'Dining Out', isActive: true, color: '#f97316' },
  { id: 'exp_9', name: 'Shopping', isActive: true, color: '#a855f7' },
  { id: 'exp_10', name: 'Personal Care', isActive: true, color: '#14b8a6' },
  { id: 'exp_11', name: 'Debt Payments', isActive: true, color: '#e11d48' },
  { id: 'exp_12', name: 'Savings', isActive: true, color: '#059669' },
  { id: 'exp_13', name: 'Other Expenses', isActive: true, color: '#64748b' },
];

export const PAYMENT_METHODS = [
  'Bank',
  'Bank Transfer',
  'Credit Card',
  'Debit Card',
  'Cash',
  'Mobile Money',
  'PayPal',
  'Other',
];

export const INITIAL_INCOME_TRANSACTIONS: IncomeTransaction[] = [];
export const INITIAL_EXPENSE_TRANSACTIONS: ExpenseTransaction[] = [];
export const INITIAL_PLANNED_INCOME: Record<string, number> = {};
export const INITIAL_PLANNED_EXPENSES: Record<string, number> = {};
export const INITIAL_SAVINGS_GOALS: SavingsGoal[] = [];
export const INITIAL_DEBTS: Debt[] = [];
export const INITIAL_RECURRING_TRANSACTIONS: RecurringTransaction[] = [];
