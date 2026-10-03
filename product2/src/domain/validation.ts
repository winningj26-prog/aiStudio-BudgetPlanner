import type { DebtAccount, SavingsGoal } from './types.js';

export function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function validateSavingsGoal(goal: SavingsGoal): string[] {
  const errors: string[] = [];
  if (!goal.name.trim()) errors.push('Goal name is required.');
  if (!isFiniteNonNegative(goal.targetAmount) || goal.targetAmount <= 0) errors.push('Target amount must be greater than zero.');
  if (!isFiniteNonNegative(goal.openingBalance)) errors.push('Opening balance must be non-negative.');
  if (goal.plannedContribution != null && !isFiniteNonNegative(goal.plannedContribution)) errors.push('Planned contribution must be non-negative.');
  if (goal.targetDate != null && !/^\d{4}-\d{2}-\d{2}$/.test(goal.targetDate)) errors.push('Target date must use YYYY-MM-DD.');
  return errors;
}

export function validateDebt(debt: DebtAccount): string[] {
  const errors: string[] = [];
  if (!debt.creditor.trim()) errors.push('Creditor is required.');
  if (!isFiniteNonNegative(debt.openingBalance)) errors.push('Opening balance must be non-negative.');
  if (!isFiniteNonNegative(debt.balance)) errors.push('Balance must be non-negative.');
  if (debt.interestRate != null && (!Number.isFinite(debt.interestRate) || debt.interestRate < 0)) errors.push('Interest rate must be non-negative when supplied.');
  if (!isFiniteNonNegative(debt.minimumPayment)) errors.push('Minimum payment must be non-negative.');
  if (debt.balance > 0 && debt.minimumPayment <= 0) errors.push('Active debt requires a positive minimum payment.');
  return errors;
}
