import { Debt, DebtPayment, RecurringTransaction, SavingsGoal, SavingsContribution } from '../types/budget';


export function applyDebtPaymentChange(
  debts: Debt[],
  existingPayment: DebtPayment | undefined,
  nextPayment: DebtPayment,
): Debt[] | null {
  const targetDebt = debts.find((debt) => debt.id === nextPayment.debtId);
  if (!targetDebt || !Number.isFinite(nextPayment.principal) || nextPayment.principal < 0) return null;

  const availableBalance = targetDebt.balance
    + (existingPayment?.debtId === targetDebt.id ? existingPayment.principal : 0);
  if (nextPayment.principal > availableBalance + 0.01) return null;

  return debts.map((debt) => {
    let balance = debt.balance;
    if (existingPayment?.debtId === debt.id) balance += existingPayment.principal;
    if (nextPayment.debtId === debt.id) balance -= nextPayment.principal;
    return Math.abs(balance - debt.balance) < 0.000001 ? debt : { ...debt, balance: Math.max(0, balance) };
  });
}

export interface SavingsGoalProgress {
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  percentComplete: number;
  isComplete: boolean;
}

export function reconcileGoalBalance(
  goal: SavingsGoal,
  contributions: SavingsContribution[] = [],
): { currentAmount: number; openingBalance: number } {
  const goalContribs = contributions.filter((c) => c.goalId === goal.id);
  const opening = Number.isFinite(goal.openingBalance)
    ? Math.max(0, goal.openingBalance!)
    : (Number.isFinite(goal.currentAmount) && goal.currentAmount >= 0 ? goal.currentAmount : 0);

  if (goalContribs.length > 0) {
    const totalContributed = goalContribs.reduce(
      (sum, c) => sum + (Number.isFinite(c.amount) && c.amount > 0 ? c.amount : 0),
      0,
    );
    return {
      currentAmount: opening + totalContributed,
      openingBalance: opening,
    };
  }

  return {
    currentAmount: opening,
    openingBalance: opening,
  };
}

export function validateSavingsContributionDraft(
  goalIdOrAmount: unknown,
  amountOrDate: unknown,
  dateMaybe?: unknown,
): boolean {
  let goalId: unknown = undefined;
  let amount: unknown = goalIdOrAmount;
  let date: unknown = amountOrDate;

  if (dateMaybe !== undefined) {
    goalId = goalIdOrAmount;
    amount = amountOrDate;
    date = dateMaybe;
  }

  if (goalId !== undefined) {
    if (typeof goalId !== 'string' || !goalId.trim()) return false;
  }

  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) return false;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

export function calculateSavingsGoalProgress(goal: SavingsGoal): SavingsGoalProgress {
  const targetAmount = Number.isFinite(goal.targetAmount) && goal.targetAmount > 0 ? goal.targetAmount : 0;
  const currentAmount = Number.isFinite(goal.currentAmount) && goal.currentAmount >= 0 ? goal.currentAmount : 0;
  const remainingAmount = Math.max(0, targetAmount - currentAmount);
  const percentComplete = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;
  return {
    targetAmount,
    currentAmount,
    remainingAmount,
    percentComplete,
    isComplete: targetAmount > 0 && currentAmount >= targetAmount,
  };
}

export function calculateDebtMonthlyInterest(debt: Debt): number {
  if (!Number.isFinite(debt.balance) || debt.balance <= 0 || !Number.isFinite(debt.interestRate) || debt.interestRate < 0) {
    return 0;
  }
  return debt.balance * (debt.interestRate / 100 / 12);
}

export function calculateDebtMinimumPaymentShortfall(debt: Debt): number {
  const interest = calculateDebtMonthlyInterest(debt);
  const payment = Number.isFinite(debt.minimumPayment) && debt.minimumPayment > 0 ? debt.minimumPayment : 0;
  return Math.max(0, interest - payment);
}

export function calculateDebtPayoffMonths(
  debt: Debt,
  additionalMonthlyPayment = 0,
  maxMonths = 360,
): number | null {
  if (!Number.isFinite(debt.balance) || debt.balance <= 0) return 0;
  if (!Number.isFinite(debt.interestRate) || debt.interestRate < 0) return null;
  const minimumPayment = Number.isFinite(debt.minimumPayment) && debt.minimumPayment > 0 ? debt.minimumPayment : 0;
  const extra = Number.isFinite(additionalMonthlyPayment) && additionalMonthlyPayment > 0 ? additionalMonthlyPayment : 0;
  const monthlyRate = debt.interestRate / 100 / 12;
  let balance = debt.balance;

  for (let month = 1; month <= maxMonths; month += 1) {
    const interest = balance * monthlyRate;
    const payment = Math.min(balance + interest, minimumPayment + extra);
    if (payment <= interest) return null;
    balance = Math.max(0, balance + interest - payment);
    if (balance <= 0) return month;
  }

  return null;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export interface SavingsGoalDraftValues {
  targetAmount: number;
  currentAmount: number;
  monthlyContribution?: number;
}

export function normalizeSavingsGoalDraft(
  targetAmount: unknown,
  currentAmount: unknown,
  monthlyContribution?: unknown,
): SavingsGoalDraftValues | null {
  const target = Number(targetAmount);
  const current = Number(currentAmount);
  const monthly = monthlyContribution === undefined || monthlyContribution === '' ? undefined : Number(monthlyContribution);

  if (!Number.isFinite(target) || target <= 0) return null;
  if (!Number.isFinite(current) || current < 0) return null;
  if (monthly !== undefined && (!Number.isFinite(monthly) || monthly < 0)) return null;

  return { targetAmount: target, currentAmount: current, monthlyContribution: monthly };
}

export function validateDebtDraftValues(
  balance: unknown,
  interestRate: unknown,
  minimumPayment: unknown,
): boolean {
  const bal = Number(balance);
  const rate = Number(interestRate);
  const minPay = Number(minimumPayment);

  return Number.isFinite(bal)
    && bal > 0
    && Number.isFinite(rate)
    && rate >= 0
    && Number.isFinite(minPay)
    && minPay > 0
    && minPay < bal;
}

export function normalizeRecurringRuleValues(
  amount: unknown,
  dayOfMonth: unknown,
): { amount: number; dayOfMonth: number } | null {
  const normalizedAmount = Number(amount);
  const normalizedDay = Number(dayOfMonth);

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return null;
  if (!Number.isInteger(normalizedDay) || normalizedDay < 1 || normalizedDay > 31) return null;

  return { amount: normalizedAmount, dayOfMonth: normalizedDay };
}

export function generateRecurringDates(
  year: number,
  month: number,
  rule: Pick<RecurringTransaction, 'dayOfMonth' | 'frequency'>,
): string[] {
  if (!Number.isInteger(year) || year < 1900 || year > 2200 || !Number.isInteger(month) || month < 1 || month > 12) {
    return [];
  }
  if (!Number.isInteger(rule.dayOfMonth) || rule.dayOfMonth < 1 || rule.dayOfMonth > 31) {
    return [];
  }

  const lastDay = daysInMonth(year, month);
  const firstDay = Math.min(rule.dayOfMonth, lastDay);
  const dates: string[] = [];
  const pad = (value: number) => String(value).padStart(2, '0');
  const add = (day: number) => dates.push(`${year}-${pad(month)}-${pad(day)}`);

  if (rule.frequency === 'monthly') {
    add(firstDay);
    return dates;
  }

  // The legacy rule schema has no month-of-year field. Treat yearly rules as
  // January anniversaries until a dedicated annual anchor date is configured.
  // This prevents the previous bug where a "yearly" rule posted every month.
  if (rule.frequency === 'yearly') {
    if (month === 1) add(firstDay);
    return dates;
  }

  const interval = rule.frequency === 'bi-weekly' ? 14 : rule.frequency === 'weekly' ? 7 : 0;
  if (interval === 0) return [];

  for (let day = firstDay; day <= lastDay; day += interval) {
    add(day);
  }
  return dates;
}
