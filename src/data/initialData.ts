import {
  CategoryItem,
  ExpenseTransaction,
  IncomeTransaction,
  MonthSummary,
  SettingsState,
} from '../types/budget';

export const INITIAL_SETTINGS: SettingsState = {
  currency: 'USD',
  month: 'January',
  year: 2026,
  dateFormat: 'MM/DD/YYYY',
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

export const INITIAL_INCOME_TRANSACTIONS: IncomeTransaction[] = [
  {
    id: 'inc_tx_1',
    date: '2026-01-01',
    category: 'Salary',
    description: 'January Salary',
    amount: 4000.0,
  },
  {
    id: 'inc_tx_2',
    date: '2026-01-05',
    category: 'Side Income',
    description: 'Freelance Work',
    amount: 500.0,
  },
  {
    id: 'inc_tx_3',
    date: '2026-01-10',
    category: 'Business Income',
    description: 'Online Store',
    amount: 800.0,
  },
  {
    id: 'inc_tx_4',
    date: '2026-01-15',
    category: 'Investment Income',
    description: 'Dividends',
    amount: 100.0,
  },
  {
    id: 'inc_tx_5',
    date: '2026-01-20',
    category: 'Other Income',
    description: 'Tax Refund',
    amount: 200.0,
  },
];

export const INITIAL_EXPENSE_TRANSACTIONS: ExpenseTransaction[] = [
  {
    id: 'exp_tx_1',
    date: '2026-01-02',
    category: 'Housing',
    description: 'Rent',
    paymentMethod: 'Bank',
    amount: 1200.0,
  },
  {
    id: 'exp_tx_2',
    date: '2026-01-03',
    category: 'Utilities',
    description: 'Electricity',
    paymentMethod: 'Credit Card',
    amount: 150.0,
  },
  {
    id: 'exp_tx_3',
    date: '2026-01-04',
    category: 'Groceries',
    description: 'Weekly Grocery',
    paymentMethod: 'Credit Card',
    amount: 120.0,
  },
  {
    id: 'exp_tx_4',
    date: '2026-01-05',
    category: 'Transportation',
    description: 'Gas',
    paymentMethod: 'Debit Card',
    amount: 60.0,
  },
  {
    id: 'exp_tx_5',
    date: '2026-01-08',
    category: 'Insurance',
    description: 'Health Insurance',
    paymentMethod: 'Bank',
    amount: 200.0,
  },
  {
    id: 'exp_tx_6',
    date: '2026-01-10',
    category: 'Entertainment',
    description: 'Movie',
    paymentMethod: 'Credit Card',
    amount: 50.0,
  },
  {
    id: 'exp_tx_7',
    date: '2026-01-12',
    category: 'Dining Out',
    description: 'Restaurant',
    paymentMethod: 'Credit Card',
    amount: 80.0,
  },
  {
    id: 'exp_tx_8',
    date: '2026-01-15',
    category: 'Shopping',
    description: 'Clothing',
    paymentMethod: 'Credit Card',
    amount: 100.0,
  },
  {
    id: 'exp_tx_9',
    date: '2026-01-18',
    category: 'Personal Care',
    description: 'Haircut',
    paymentMethod: 'Debit Card',
    amount: 40.0,
  },
  {
    id: 'exp_tx_10',
    date: '2026-01-20',
    category: 'Debt Payments',
    description: 'Credit Card',
    paymentMethod: 'Bank',
    amount: 300.0,
  },
  {
    id: 'exp_tx_11',
    date: '2026-01-25',
    category: 'Healthcare',
    description: 'Doctor Visit',
    paymentMethod: 'Credit Card',
    amount: 90.0,
  },
  {
    id: 'exp_tx_12',
    date: '2026-01-28',
    category: 'Other Expenses',
    description: 'Misc',
    paymentMethod: 'Debit Card',
    amount: 70.0,
  },
];

export const INITIAL_PLANNED_INCOME: Record<string, number> = {
  Salary: 4000.0,
  'Business Income': 500.0,
  'Side Income': 300.0,
  'Investment Income': 100.0,
  'Other Income': 100.0,
};

export const INITIAL_PLANNED_EXPENSES: Record<string, number> = {
  Housing: 1200.0,
  Utilities: 150.0,
  Groceries: 500.0,
  Transportation: 200.0,
  Insurance: 200.0,
  Healthcare: 100.0,
  Entertainment: 100.0,
  'Dining Out': 200.0,
  Shopping: 200.0,
  'Personal Care': 100.0,
  'Debt Payments': 300.0,
  Savings: 500.0,
  'Other Expenses': 700.0,
};

export const ANNUAL_MONTHS_DATA: MonthSummary[] = [
  { month: 'Jan', fullName: 'January', income: 5600, expenses: 2460, savings: 3140, savingsRate: 56.1 },
  { month: 'Feb', fullName: 'February', income: 4800, expenses: 2700, savings: 2100, savingsRate: 43.8 },
  { month: 'Mar', fullName: 'March', income: 5200, expenses: 2650, savings: 2550, savingsRate: 49.0 },
  { month: 'Apr', fullName: 'April', income: 5100, expenses: 2780, savings: 2320, savingsRate: 45.5 },
  { month: 'May', fullName: 'May', income: 5300, expenses: 2720, savings: 2580, savingsRate: 48.7 },
  { month: 'Jun', fullName: 'June', income: 5400, expenses: 2800, savings: 2600, savingsRate: 48.1 },
  { month: 'Jul', fullName: 'July', income: 5200, expenses: 2750, savings: 2450, savingsRate: 47.1 },
  { month: 'Aug', fullName: 'August', income: 5100, expenses: 2680, savings: 2420, savingsRate: 47.5 },
  { month: 'Sep', fullName: 'September', income: 5600, expenses: 2900, savings: 2700, savingsRate: 48.2 },
  { month: 'Oct', fullName: 'October', income: 5500, expenses: 2850, savings: 2650, savingsRate: 48.2 },
  { month: 'Nov', fullName: 'November', income: 5400, expenses: 2800, savings: 2600, savingsRate: 48.1 },
  { month: 'Dec', fullName: 'December', income: 5800, expenses: 2950, savings: 2850, savingsRate: 49.1 },
];
