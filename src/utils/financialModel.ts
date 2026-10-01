import type { Debt, ExpenseTransaction, FinancialAsset, IncomeTransaction, SavingsGoal } from '../types/budget';

export interface FinancialSnapshot {
  totalIncome: number;
  totalExpenses: number;
  operatingCashFlow: number;
  goalAllocated: number;
  availableCash: number;
  externalAssets: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  savingsRate: number;
}

const safe = (value: number): number => Number.isFinite(value) ? value : 0;

export function calculateFinancialSnapshot(
  incomeTransactions: IncomeTransaction[],
  expenseTransactions: ExpenseTransaction[],
  savingsGoals: SavingsGoal[],
  debts: Debt[],
  assets: FinancialAsset[],
  openingCashBalance = 0,
): FinancialSnapshot {
  const totalIncome = incomeTransactions.reduce((sum, tx) => sum + Math.max(0, safe(tx.amount)), 0);
  const totalExpenses = expenseTransactions.reduce((sum, tx) => sum + Math.max(0, safe(tx.amount)), 0);
  const operatingCashFlow = totalIncome - totalExpenses;
  const goalAllocated = savingsGoals.reduce((sum, goal) => sum + Math.max(0, safe(goal.currentAmount)), 0);
  const externalAssets = assets.reduce((sum, asset) => sum + Math.max(0, safe(asset.amount)), 0);
  const availableCash = Math.max(0, safe(openingCashBalance) + operatingCashFlow - goalAllocated);
  const totalAssets = availableCash + goalAllocated + externalAssets;
  const totalLiabilities = debts.reduce((sum, debt) => sum + Math.max(0, safe(debt.balance)), 0);
  const netWorth = totalAssets - totalLiabilities;
  const savingsRate = totalIncome > 0 ? (operatingCashFlow / totalIncome) * 100 : 0;

  return {
    totalIncome,
    totalExpenses,
    operatingCashFlow,
    goalAllocated,
    availableCash,
    externalAssets,
    totalAssets,
    totalLiabilities,
    netWorth,
    savingsRate,
  };
}
