import type { SavingsContribution, SavingsGoal } from './types.js';

export interface SavingsProgress {
  currentBalance: number;
  remainingAmount: number;
  completionPercentage: number;
  projectedCompletionDate: string | null;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function calculateSavingsProgress(goal: SavingsGoal, contributions: SavingsContribution[]): SavingsProgress {
  const contributed = contributions
    .filter(c => c.goalId === goal.id && c.accountId === goal.accountId)
    .reduce((sum, c) => sum + Math.max(0, Number.isFinite(c.amount) ? c.amount : 0), 0);
  const currentBalance = round(Math.min(goal.targetAmount, goal.openingBalance + contributed));
  const remainingAmount = round(Math.max(0, goal.targetAmount - currentBalance));
  const completionPercentage = goal.targetAmount > 0 ? round(Math.min(100, currentBalance / goal.targetAmount * 100)) : 0;

  let projectedCompletionDate: string | null = null;
  if (remainingAmount > 0 && (goal.plannedContribution ?? 0) > 0 && goal.contributionFrequency) {
    const periods = Math.ceil(remainingAmount / goal.plannedContribution!);
    const monthsPerPeriod = goal.contributionFrequency === 'monthly' ? 1
      : goal.contributionFrequency === 'quarterly' ? 3
      : goal.contributionFrequency === 'yearly' ? 12
      : goal.contributionFrequency === 'biweekly' ? 0.5
      : 0.25;
    const base = goal.targetDate ? new Date(goal.targetDate + 'T00:00:00Z') : new Date();
    base.setUTCMonth(base.getUTCMonth() + Math.ceil(periods * monthsPerPeriod));
    projectedCompletionDate = base.toISOString().slice(0, 10);
  }

  return { currentBalance, remainingAmount, completionPercentage, projectedCompletionDate };
}
