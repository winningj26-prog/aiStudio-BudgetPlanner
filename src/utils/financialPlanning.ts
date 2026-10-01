import { Debt, RecurringTransaction, SavingsGoal } from '../types/budget';

export interface SavingsGoalProgress {
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  percentComplete: number;
  isComplete: boolean;
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

  if (rule.frequency === 'monthly' || rule.frequency === 'yearly') {
    add(firstDay);
    return dates;
  }

  const interval = rule.frequency === 'bi-weekly' ? 14 : rule.frequency === 'weekly' ? 7 : 0;
  if (interval === 0) return [];

  for (let day = firstDay; day <= lastDay; day += interval) {
    add(day);
  }
  return dates;
}
