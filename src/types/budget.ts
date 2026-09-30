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
  recurringId?: string;
  isRecurring?: boolean;
}

export interface ExpenseTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  category: string;
  description: string;
  paymentMethod: string;
  amount: number;
  recurringId?: string;
  isRecurring?: boolean;
}

export interface SavingsGoal {
  id: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  monthlyContribution?: number;
  color?: string;
  notes?: string;
}

export interface Debt {
  id: string;
  name: string;
  balance: number;
  interestRate: number; // e.g. 18.5 for 18.5%
  minimumPayment: number;
  notes?: string;
  color?: string;
}

export interface RecurringTransaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  category: string;
  paymentMethod?: string;
  dayOfMonth: number; // 1 - 31
  frequency: 'monthly' | 'bi-weekly' | 'weekly' | 'yearly';
  isActive: boolean;
  notes?: string;
}

export type BudgetStatus = 'On Track' | 'Near Limit' | 'Over Budget' | 'Near Target' | 'Below Target';

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
  secondaryCurrency?: CurrencyCode;
  enableSecondaryCurrency?: boolean;
}

export type WorksheetTab =
  | 'start_here'
  | 'settings'
  | 'income'
  | 'expenses'
  | 'monthly_budget'
  | 'dashboard'
  | 'calendar_view'
  | 'debt_payoff'
  | 'net_worth'
  | 'annual_summary'
  | 'advanced_analytics'
  | 'tech_specs';

export interface TestResultItem {
  name: string;
  category: string;
  formula: string;
  expected: string | number;
  actual: string | number;
  passed: boolean;
}
