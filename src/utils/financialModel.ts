import type { Debt, DebtPayment, ExpenseTransaction, FinancialAsset, IncomeTransaction, SavingsGoal } from '../types/budget';

export interface FinancialSnapshot {
  totalIncome: number;
  totalExpenses: number;
  debtInterestExpense: number;
  debtPrincipalPaid: number;
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
  accountBalances: Record<string, number>;
}

const safe = (value: number): number => Number.isFinite(value) ? value : 0;
const positive = (value: number): number => Math.max(0, safe(value));

export function calculateFinancialSnapshot(
  incomeTransactions: IncomeTransaction[],
  expenseTransactions: ExpenseTransaction[],
  savingsGoals: SavingsGoal[],
  debts: Debt[],
  assets: FinancialAsset[],
  debtPaymentsOrOpeningCash: DebtPayment[] | number = [],
  openingCashBalance = 0,
): FinancialSnapshot {
  const debtPayments = Array.isArray(debtPaymentsOrOpeningCash) ? debtPaymentsOrOpeningCash : [];
  const resolvedOpeningCashBalance = typeof debtPaymentsOrOpeningCash === 'number'
    ? debtPaymentsOrOpeningCash
    : openingCashBalance;

  const totalIncome = incomeTransactions.reduce((sum, tx) => sum + positive(tx.amount), 0);
  const debtInterestExpense = debtPayments.reduce((sum, payment) => sum + positive(payment.interest), 0);
  const debtPrincipalPaid = debtPayments.reduce((sum, payment) => sum + positive(payment.principal), 0);
  const totalExpenses = expenseTransactions.reduce((sum, tx) => sum + positive(tx.amount), 0) + debtInterestExpense;
  const operatingCashFlow = totalIncome - totalExpenses;
  const goalAllocated = savingsGoals.reduce((sum, goal) => sum + positive(goal.currentAmount), 0);

  const incomeByAccount = new Map<string, number>();
  const expenseByAccount = new Map<string, number>();
  for (const tx of incomeTransactions) {
    if (tx.accountId) incomeByAccount.set(tx.accountId, (incomeByAccount.get(tx.accountId) ?? 0) + positive(tx.amount));
  }
  for (const tx of expenseTransactions) {
    if (tx.accountId) expenseByAccount.set(tx.accountId, (expenseByAccount.get(tx.accountId) ?? 0) + positive(tx.amount));
  }
  for (const payment of debtPayments) {
    if (payment.accountId) expenseByAccount.set(payment.accountId, (expenseByAccount.get(payment.accountId) ?? 0) + positive(payment.amount));
  }

  const accountBalances: Record<string, number> = {};
  let trackedAccountAssets = 0;
  for (const asset of assets) {
    const opening = positive(asset.openingAmount ?? asset.amount);
    const isCashAccount = asset.category === 'Cash' || asset.category === 'Bank';
    const balance = isCashAccount
      ? Math.max(0, opening + (incomeByAccount.get(asset.id) ?? 0) - (expenseByAccount.get(asset.id) ?? 0))
      : positive(asset.amount);
    accountBalances[asset.id] = balance;
    trackedAccountAssets += balance;
  }

  const hasStructuredCashAccounts = assets.some((asset) => asset.category === 'Cash' || asset.category === 'Bank');
  const unassignedCashFlow = incomeTransactions
    .filter((tx) => !tx.accountId)
    .reduce((sum, tx) => sum + positive(tx.amount), 0)
    - expenseTransactions
      .filter((tx) => !tx.accountId)
      .reduce((sum, tx) => sum + positive(tx.amount), 0);

  // openingCashBalance remains a legacy compatibility balance. Once structured
  // cash/bank accounts exist, unassigned activity is still tracked separately
  // but does not get duplicated into those accounts.
  const legacyCash = positive(resolvedOpeningCashBalance) + (hasStructuredCashAccounts ? 0 : unassignedCashFlow);
  const openingAssets = positive(resolvedOpeningCashBalance) + assets.reduce(
    (sum, asset) => sum + positive(asset.openingAmount ?? asset.amount), 0,
  );
  const openingLiabilities = debts.reduce(
    (sum, debt) => sum + positive(debt.openingBalance ?? debt.balance), 0,
  );

  // Savings goals are internal earmarks inside real cash/bank accounts. They do not
  // create another asset, and an unlinked/legacy goal cannot reduce a specific
  // account because there is no account balance to earmark against.
  const linkedGoalAllocations = new Map<string, number>();
  for (const goal of savingsGoals) {
    if (!goal.accountId) continue;
    const amount = positive(goal.currentAmount);
    linkedGoalAllocations.set(goal.accountId, (linkedGoalAllocations.get(goal.accountId) ?? 0) + amount);
  }
  let linkedGoalAllocated = 0;
  for (const [accountId, requested] of linkedGoalAllocations) {
    const balance = positive(accountBalances[accountId] ?? 0);
    linkedGoalAllocated += Math.min(requested, balance);
  }
  const availableCash = Math.max(0, legacyCash + trackedAccountAssets - linkedGoalAllocated);
  const externalAssets = trackedAccountAssets;
  const totalAssets = Math.max(0, legacyCash + trackedAccountAssets);
  const totalLiabilities = debts.reduce((sum, debt) => sum + positive(debt.balance), 0);
  const netWorth = totalAssets - totalLiabilities;
  const openingNetWorth = openingAssets - openingLiabilities;
  const savingsRate = totalIncome > 0 ? (operatingCashFlow / totalIncome) * 100 : 0;

  return {
    totalIncome,
    totalExpenses,
    debtInterestExpense,
    debtPrincipalPaid,
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
    accountBalances,
  };
}
