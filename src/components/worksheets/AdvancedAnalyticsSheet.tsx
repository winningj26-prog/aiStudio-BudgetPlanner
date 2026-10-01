import React, { useMemo } from 'react';
import { Debt, DebtPayment, ExpenseTransaction, FinancialAsset, IncomeTransaction, SavingsGoal, SettingsState } from '../../types/budget';
import { calculateFinancialSnapshot } from '../../utils/financialModel';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  incomeTransactions: IncomeTransaction[];
  expenseTransactions: ExpenseTransaction[];
  savingsGoals?: SavingsGoal[];
  debts?: Debt[];
  debtPayments?: DebtPayment[];
  financialAssets?: FinancialAsset[];
  openingCashBalance?: number;
  settings: SettingsState;
}

export const AdvancedAnalyticsSheet: React.FC<Props> = ({
  incomeTransactions,
  expenseTransactions,
  savingsGoals = [],
  debts = [],
  debtPayments = [],
  financialAssets = [],
  openingCashBalance = 0,
  settings,
}) => {
  const analytics = useMemo(() => {
    const financial = calculateFinancialSnapshot(
      incomeTransactions,
      expenseTransactions,
      savingsGoals,
      debts,
      financialAssets,
      debtPayments,
      openingCashBalance,
    );
    const income = financial.totalIncome;
    const expenses = financial.totalExpenses;
    const savings = financial.operatingCashFlow;
    const savingsRate = financial.savingsRate;

    const byCategory = new Map<string, number>();
    for (const transaction of expenseTransactions) {
      byCategory.set(
        transaction.category,
        (byCategory.get(transaction.category) ?? 0) + transaction.amount,
      );
    }

    const categories = Array.from(byCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { income, expenses, savings, savingsRate, categories, netWorth: financial.netWorth };
  }, [incomeTransactions, expenseTransactions, savingsGoals, debts, debtPayments, financialAssets, openingCashBalance]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-black text-slate-900">Advanced Analytics</h2>
        <p className="mt-1 text-sm text-slate-500">
          Deeper spending and savings metrics derived from your current workbook.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Income', analytics.income],
          ['Expenses', analytics.expenses],
          ['Net Savings', analytics.savings],
          ['Net Worth', analytics.netWorth],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-lg font-black text-slate-900">
              {formatCurrency(value as number, settings.currency)}
            </p>
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Savings Rate</p>
          <p className="mt-2 text-lg font-black text-slate-900">{analytics.savingsRate.toFixed(1)}%</p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-900">Top Expense Categories</h3>
        <div className="mt-4 space-y-3">
          {analytics.categories.length === 0 ? (
            <p className="text-sm text-slate-500">Add expenses to see category analytics.</p>
          ) : (
            analytics.categories.map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-sm font-semibold text-slate-700">{category}</span>
                <span className="text-sm font-black text-slate-900">
                  {formatCurrency(amount, settings.currency)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
