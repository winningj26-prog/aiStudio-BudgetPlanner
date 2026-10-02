import type { WorkbookData } from '../services/workbookRepository';
import type { CategoryItem, Debt, DebtPayment, FinancialAsset, ExpenseTransaction, IncomeTransaction, RecurringTransaction, SavingsGoal, SettingsState, WorksheetTab } from '../types/budget';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CURRENCIES = ['USD','EUR','GBP','CAD','AUD','JPY'];
const DATE_FORMATS = ['MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD'];
const TABS: WorksheetTab[] = ['start_here','settings','income','expenses','monthly_budget','dashboard','calendar_view','debt_payoff','net_worth','annual_summary','advanced_analytics','tech_specs'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isNonNegativeNumber = (value: unknown): value is number =>
  isFiniteNumber(value) && value >= 0;

const isDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const isCategory = (value: unknown): value is CategoryItem =>
  isRecord(value) && typeof value.id === 'string' && value.id.length > 0
  && typeof value.name === 'string' && value.name.trim().length > 0
  && typeof value.isActive === 'boolean'
  && (value.color == null || typeof value.color === 'string');

const isIncome = (value: unknown): value is IncomeTransaction =>
  isRecord(value) && typeof value.id === 'string' && isDate(value.date)
  && typeof value.category === 'string' && typeof value.description === 'string'
  && isNonNegativeNumber(value.amount)
  && (value.accountId == null || typeof value.accountId === 'string')
  && (value.recurringId == null || typeof value.recurringId === 'string')
  && (value.isRecurring == null || typeof value.isRecurring === 'boolean');

const isExpense = (value: unknown): value is ExpenseTransaction =>
  isRecord(value) && typeof value.id === 'string' && isDate(value.date)
  && typeof value.category === 'string' && typeof value.description === 'string'
  && typeof value.paymentMethod === 'string' && isNonNegativeNumber(value.amount)
  && (value.recurringId == null || typeof value.recurringId === 'string')
  && (value.isRecurring == null || typeof value.isRecurring === 'boolean');

const isGoal = (value: unknown): value is SavingsGoal =>
  isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string'
  && isNonNegativeNumber(value.targetAmount) && isNonNegativeNumber(value.currentAmount)
  && (value.accountId == null || typeof value.accountId === 'string')
  && (value.categoryId == null || typeof value.categoryId === 'string')
  && (value.categoryName == null || typeof value.categoryName === 'string')
  && (value.targetDate == null || isDate(value.targetDate))
  && (value.monthlyContribution == null || isNonNegativeNumber(value.monthlyContribution))
  && (value.color == null || typeof value.color === 'string')
  && (value.notes == null || typeof value.notes === 'string');

const isDebt = (value: unknown): value is Debt =>
  isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string'
  && isNonNegativeNumber(value.balance) && isNonNegativeNumber(value.interestRate)
  && isNonNegativeNumber(value.minimumPayment)
  && (value.openingBalance == null || isNonNegativeNumber(value.openingBalance))
  && (value.notes == null || typeof value.notes === 'string')
  && (value.color == null || typeof value.color === 'string');


const isDebtPayment = (value: unknown): value is DebtPayment =>
  isRecord(value) && typeof value.id === 'string' && isDate(value.date)
  && typeof value.debtId === 'string' && value.debtId.length > 0
  && (value.accountId == null || typeof value.accountId === 'string')
  && isNonNegativeNumber(value.amount)
  && isNonNegativeNumber(value.principal)
  && isNonNegativeNumber(value.interest)
  && Math.abs(value.amount - value.principal - value.interest) < 0.01
  && (value.notes == null || typeof value.notes === 'string');

const isAsset = (value: unknown): value is FinancialAsset =>
  isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string'
  && isNonNegativeNumber(value.amount)
  && (value.openingAmount == null || isNonNegativeNumber(value.openingAmount))
  && ['Cash','Bank','Investment','Real Estate','Vehicle','Business','Retirement','Receivable','Other'].includes(String(value.category));

const isRecurring = (value: unknown): value is RecurringTransaction => {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || (value.type !== 'income' && value.type !== 'expense')
    || typeof value.description !== 'string'
    || !isNonNegativeNumber(value.amount)
    || typeof value.category !== 'string') return false;
  const dayOfMonth = value.dayOfMonth;
  if (!isFiniteNumber(dayOfMonth) || !Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31
    || (value.paymentMethod != null && typeof value.paymentMethod !== 'string')
    || !['monthly','bi-weekly','weekly','yearly'].includes(String(value.frequency))
    || typeof value.isActive !== 'boolean'
    || (value.notes != null && typeof value.notes !== 'string')) return false;
  return true;
};

const isSettings = (value: unknown): value is SettingsState => {
  if (!isRecord(value)
    || !CURRENCIES.includes(String(value.currency))
    || !MONTHS.includes(String(value.month))
    || !isFiniteNumber(value.year)
    || !Number.isInteger(value.year)
    || value.year < 1900
    || value.year > 2200
    || !DATE_FORMATS.includes(String(value.dateFormat))
    || (value.secondaryCurrency != null && !CURRENCIES.includes(String(value.secondaryCurrency)))
    || (value.enableSecondaryCurrency != null && typeof value.enableSecondaryCurrency !== 'boolean')
    || (value.followCurrentPeriod != null && typeof value.followCurrentPeriod !== 'boolean')) return false;
  return true;
};

const isNumberMap = (value: unknown): value is Record<string, number> =>
  isRecord(value) && Object.values(value).every(isNonNegativeNumber);

export function isValidWorkbookData(value: unknown): value is WorkbookData {
  if (!isRecord(value)) return false;
  return isSettings(value.settings)
    && Array.isArray(value.incomeCategories) && value.incomeCategories.every(isCategory)
    && Array.isArray(value.expenseCategories) && value.expenseCategories.every(isCategory)
    && Array.isArray(value.paymentMethods) && value.paymentMethods.every((v) => typeof v === 'string')
    && Array.isArray(value.incomeTransactions) && value.incomeTransactions.every(isIncome)
    && Array.isArray(value.expenseTransactions) && value.expenseTransactions.every(isExpense)
    && isNumberMap(value.plannedIncome) && isNumberMap(value.plannedExpenses)
    && Array.isArray(value.savingsGoals) && value.savingsGoals.every(isGoal)
    && Array.isArray(value.debts) && value.debts.every(isDebt)
    && Array.isArray(value.debtPayments) && value.debtPayments.every(isDebtPayment)
    && Array.isArray(value.financialAssets) && value.financialAssets.every(isAsset)
    && isNonNegativeNumber(value.openingCashBalance)
    && Array.isArray(value.recurringTransactions) && value.recurringTransactions.every(isRecurring)
    && typeof value.userEmail === 'string'
    && typeof value.activeTab === 'string' && TABS.includes(value.activeTab as WorksheetTab)
    && (value.sheetConfig === null || isRecord(value.sheetConfig));
}

export function normalizeWorkbookData(value: unknown, fallback: WorkbookData): WorkbookData {
  return isValidWorkbookData(value) ? value : fallback;
}
