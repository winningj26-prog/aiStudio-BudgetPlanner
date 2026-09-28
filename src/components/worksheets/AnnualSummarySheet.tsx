import React from 'react';
import { ExpenseTransaction, MonthSummary, SettingsState } from '../../types/budget';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { sumExpensesByCategory } from '../../utils/formulas';
import { KPICard } from '../KPICard';
import { MonthlyTrendChart } from '../charts/MonthlyTrendChart';
import { SavingsRateLineChart } from '../charts/SavingsRateLineChart';
import {
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Layers,
  PiggyBank,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';

interface AnnualSummarySheetProps {
  data: MonthSummary[];
  expenseTransactions: ExpenseTransaction[];
  settings: SettingsState;
  onSelectCell: (info: { reference: string; value: string; formula?: string; isCalculated: boolean }) => void;
}

export const AnnualSummarySheet: React.FC<AnnualSummarySheetProps> = ({
  data,
  expenseTransactions,
  settings,
  onSelectCell,
}) => {
  const totalAnnualIncome = data.reduce((acc, m) => acc + m.income, 0);
  const totalAnnualExpenses = data.reduce((acc, m) => acc + m.expenses, 0);
  const totalAnnualSavings = totalAnnualIncome - totalAnnualExpenses;
  const avgSavingsRate =
    totalAnnualIncome > 0 ? (totalAnnualSavings / totalAnnualIncome) * 100 : 0;

  const annualTopCategories = Array.from(
    new Set(expenseTransactions.map((tx) => tx.category.trim()).filter(Boolean))
  )
    .map((category) => ({
      category,
      amount: sumExpensesByCategory(expenseTransactions, category),
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
    .map((item) => ({
      ...item,
      percent: totalAnnualExpenses > 0 ? (item.amount / totalAnnualExpenses) * 100 : 0,
    }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              7. Annual Financial Summary
            </h2>
            <span className="rounded-md bg-purple-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-purple-800">
              tbl_AnnualSummary
            </span>
          </div>
          <p className="text-xs text-slate-500 sm:text-sm">
            Comprehensive 12-month review of annual income, cumulative expenses, net savings, and savings velocity for {settings.year}.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <span>Full Fiscal Year: <strong>{settings.year}</strong></span>
        </div>
      </div>

      {/* KPI Cards:
          - Annual Income ($64,000)
          - Annual Expenses ($32,040)
          - Annual Savings ($31,960)
          - Average Savings Rate (49.9%)
      */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Annual Income"
          value={formatCurrency(totalAnnualIncome, settings.currency, 0)}
          subtitle="Total 12-month earnings"
          icon={<Wallet className="h-5 w-5" />}
          theme="blue"
          onClick={() =>
            onSelectCell({
              reference: 'tbl_AnnualSummary[[#Totals],[Income]]',
              value: formatCurrency(totalAnnualIncome, settings.currency, 0),
              formula: '=SUM(tbl_AnnualSummary[Income])',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Annual Expenses"
          value={formatCurrency(totalAnnualExpenses, settings.currency, 0)}
          subtitle="Cumulative yearly spend"
          icon={<Receipt className="h-5 w-5" />}
          theme="red"
          onClick={() =>
            onSelectCell({
              reference: 'tbl_AnnualSummary[[#Totals],[Expenses]]',
              value: formatCurrency(totalAnnualExpenses, settings.currency, 0),
              formula: '=SUM(tbl_AnnualSummary[Expenses])',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Annual Savings"
          value={formatCurrency(totalAnnualSavings, settings.currency, 0)}
          subtitle="Net accumulated wealth"
          icon={<PiggyBank className="h-5 w-5" />}
          theme="green"
          trend={{ text: `${totalAnnualSavings >= 0 ? '+' : ''}${formatCurrency(totalAnnualSavings, settings.currency)} net`, isPositive: totalAnnualSavings >= 0 }}
          onClick={() =>
            onSelectCell({
              reference: 'tbl_AnnualSummary[[#Totals],[Savings]]',
              value: formatCurrency(totalAnnualSavings, settings.currency, 0),
              formula: '=Annual_Income - Annual_Expenses',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Average Savings Rate"
          value={formatPercent(avgSavingsRate)}
          subtitle="Year-to-date average"
          icon={<TrendingUp className="h-5 w-5" />}
          theme="purple"
          trend={{ text: `${avgSavingsRate.toFixed(1)}% annual rate`, isPositive: avgSavingsRate >= 0 }}
          onClick={() =>
            onSelectCell({
              reference: 'tbl_AnnualSummary[[#Totals],[Savings Rate]]',
              value: formatPercent(avgSavingsRate),
              formula: '=AVERAGE(tbl_AnnualSummary[Savings Rate])',
              isCalculated: true,
            })
          }
        />
      </div>

      {/* Row of Charts: Monthly Income vs Expenses vs Savings + Savings Rate Trend */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <MonthlyTrendChart data={data} currency={settings.currency} />
        </div>
        <div className="lg:col-span-5">
          <SavingsRateLineChart data={data} currentRate={avgSavingsRate} />
        </div>
      </div>

      {/* Grid: 12-Month Summary Table (Left) + Top Spending Categories (Right) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Primary 12-Month Table (exact columns 1-5):
            1. Month
            2. Income
            3. Expenses
            4. Savings
            5. Savings Rate
        */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden lg:col-span-8">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 p-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Monthly Breakdown (Jan - Dec)
              </h3>
              <p className="text-xs text-slate-500">
                12-month historical performance matrix
              </p>
            </div>
            <span className="font-mono text-xs text-slate-400">tbl_AnnualSummary</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="border-b border-slate-200 bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-32">1. Month</th>
                  <th className="px-4 py-3 text-right">2. Income</th>
                  <th className="px-4 py-3 text-right">3. Expenses</th>
                  <th className="px-4 py-3 text-right">4. Savings</th>
                  <th className="px-4 py-3 text-right w-28">5. Savings Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((m, idx) => (
                  <tr
                    key={m.month}
                    onClick={() =>
                      onSelectCell({
                        reference: `tbl_AnnualSummary[${m.fullName}]`,
                        value: `Inc: ${formatCurrency(m.income, settings.currency, 0)}, Exp: ${formatCurrency(m.expenses, settings.currency, 0)}, Sav: ${formatCurrency(m.savings, settings.currency, 0)}`,
                        formula: `=Income - Expenses`,
                        isCalculated: true,
                      })
                    }
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 font-bold text-slate-800">
                      {m.fullName}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-700">
                      {formatCurrency(m.income, settings.currency, 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-700">
                      {formatCurrency(m.expenses, settings.currency, 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(m.savings, settings.currency, 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-800">
                      {formatPercent(m.savingsRate)}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Annual Totals Row */}
              <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                <tr
                  onClick={() =>
                    onSelectCell({
                      reference: 'tbl_AnnualSummary[[#Totals]]',
                      value: `Total Income: ${formatCurrency(totalAnnualIncome, settings.currency, 0)}`,
                      formula: '=SUM(tbl_AnnualSummary[Income])',
                      isCalculated: true,
                    })
                  }
                  className="cursor-pointer hover:bg-slate-200/70"
                >
                  <td className="px-4 py-3 uppercase tracking-wider text-xs text-slate-800">
                    Annual Total:
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-900 font-extrabold">
                    {formatCurrency(totalAnnualIncome, settings.currency, 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-rose-700 font-extrabold">
                    {formatCurrency(totalAnnualExpenses, settings.currency, 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-800 text-sm font-extrabold">
                    {formatCurrency(totalAnnualSavings, settings.currency, 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-purple-800 font-extrabold">
                    {formatPercent(avgSavingsRate)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Top Spending Categories Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden lg:col-span-4">
          <div className="border-b border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-sm font-bold text-slate-800">
              Top Spending Categories (Annual)
            </h3>
            <p className="text-xs text-slate-500">Major expense distributions</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {annualTopCategories.map((item) => (
                  <tr key={item.category} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {item.category}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-700">
                      {formatCurrency(item.amount, settings.currency, 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                      {item.percent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
