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
  openingAssets: number;
  openingLiabilities: number;
  openingNetWorth: number;
}

const safe = (value: number): number => Number.isFinite(value) ? value : 0;
const positive = (value: number): number => Math.max(0, safe(value));

/**
 * Calculates the user's current financial position from a starting position plus
 * activity recorded after tracking began.
 *
 * Starting balances are not treated as income or expenses. They establish the
 * opening net worth, while subsequent transactions change the position through
 * operating cash flow. Savings goals are internal allocations and therefore do
 * not change net worth.
 */
export function calculateFinancialSnapshot(
  incomeTransactions: IncomeTransaction[],
  expenseTransactions: ExpenseTransaction[],
  savingsGoals: SavingsGoal[],
  debts: Debt[],
  assets: FinancialAsset[],
  openingCashBalance = 0,
): FinancialSnapshot {
  const totalIncome = incomeTransactions.reduce((sum, tx) => sum + positive(tx.amount), 0);
  const totalExpenses = expenseTransactions.reduce((sum, tx) => sum + positive(tx.amount), 0);
  const operatingCashFlow = totalIncome - totalExpenses;
  const goalAllocated = savingsGoals.reduce((sum, goal) => sum + positive(goal.currentAmount), 0);

  const externalAssets = assets.reduce((sum, asset) => sum + positive(asset.amount), 0);
  const openingAssets = positive(openingCashBalance) + assets.reduce(
    (sum, asset) => sum + positive(asset.openingAmount ?? asset.amount),
    0,
  );
  const openingLiabilities = debts.reduce(
    (sum, debt) => sum + positive(debt.openingBalance ?? debt.balance),
    0,
  );

  // Goal allocations remain inside total assets; they only earmark available cash.
  const availableCash = Math.max(0, positive(openingCashBalance) + operatingCashFlow - goalAllocated);
  const totalAssets = availableCash + goalAllocated + externalAssets;
  const totalLiabilities = debts.reduce((sum, debt) => sum + positive(debt.balance), 0);
  const netWorth = totalAssets - totalLiabilities;
  const openingNetWorth = openingAssets - openingLiabilities;
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
    openingAssets,
    openingLiabilities,
    openingNetWorth,
  };
}
