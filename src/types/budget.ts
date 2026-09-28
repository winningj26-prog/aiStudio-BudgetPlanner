export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  isActive: boolean;
  color?: string;
}

export interface IncomeTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  category: string;
  description: string;
  amount: number;
}

export interface ExpenseTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  category: string;
  description: string;
  paymentMethod: string;
  amount: number;
}

export type BudgetStatus = 'On Track' | 'Near Limit' | 'Over Budget';

export interface BudgetItem {
  category: string;
  type: 'income' | 'expense';
  planned: number;
  actual: number;
  difference: number;
  percentUsed: number;
  status: BudgetStatus;
}

export interface MonthSummary {
  month: string; // "Jan", "Feb", etc.
  fullName: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
}

export interface SettingsState {
  currency: CurrencyCode;
  month: string;
  year: number;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
}

export type WorksheetTab =
  | 'start_here'
  | 'settings'
  | 'income'
  | 'expenses'
  | 'monthly_budget'
  | 'dashboard'
  | 'annual_summary'
  | 'tech_specs';

export interface TestResultItem {
  name: string;
  category: string;
  formula: string;
  expected: string | number;
  actual: string | number;
  passed: boolean;
}
