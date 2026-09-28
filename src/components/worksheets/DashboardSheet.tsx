import React, { useState } from 'react';
import {
  CategoryItem,
  ExpenseTransaction,
  IncomeTransaction,
  MonthSummary,
  SettingsState,
} from '../../types/budget';
import { formatCurrency, formatDate, formatPercent } from '../../utils/formatters';
import {
  sumExpenseTransactions,
  sumExpensesByCategory,
  sumIncomeTransactions,
} from '../../utils/formulas';
import { KPICard } from '../KPICard';
import { IncomeExpensesBarChart } from '../charts/IncomeExpensesBarChart';
import { ExpenseDonutChart } from '../charts/ExpenseDonutChart';
import { MonthlyTrendChart } from '../charts/MonthlyTrendChart';
import { SavingsRateLineChart } from '../charts/SavingsRateLineChart';
import { ExportWorkbookModal } from '../ExportWorkbookModal';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  HardDriveDownload,
  Info,
  Lightbulb,
  PieChart,
  PiggyBank,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

interface DashboardSheetProps {
  incomeTransactions: IncomeTransaction[];
  expenseTransactions: ExpenseTransaction[];
  categories: CategoryItem[];
  incomeCategories?: CategoryItem[];
  paymentMethods?: string[];
  plannedExpenses: Record<string, number>;
  plannedIncome: Record<string, number>;
  annualData: MonthSummary[];
  settings: SettingsState;
  onSelectCell: (info: { reference: string; value: string; formula?: string; isCalculated: boolean }) => void;
  onOpenExportModal?: () => void;
}

export const DashboardSheet: React.FC<DashboardSheetProps> = ({
  incomeTransactions,
  expenseTransactions,
  categories,
  incomeCategories = [],
  paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer'],
  plannedExpenses,
  plannedIncome,
  annualData,
  settings,
  onSelectCell,
  onOpenExportModal,
}) => {
  const [isLocalExportModalOpen, setIsLocalExportModalOpen] = useState(false);

  const handleTriggerExport = () => {
    if (onOpenExportModal) {
      onOpenExportModal();
    } else {
      setIsLocalExportModalOpen(true);
    }
  };
  const totalIncome = sumIncomeTransactions(incomeTransactions);
  const totalExpenses = sumExpenseTransactions(expenseTransactions);
  const savings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  const totalPlannedExpenses = Object.values(plannedExpenses).reduce((a, b) => a + b, 0);
  const totalPlannedIncome = Object.values(plannedIncome).reduce((a, b) => a + b, 0);
  const remainingBudget = totalPlannedExpenses - totalExpenses;

  // Previous month calculation for trend comparison
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ];
  const activeMonthLower = (settings.month || 'January').toLowerCase();
  const activeMonthIdx = monthNames.findIndex((m) => m === activeMonthLower);
  const currentMonthIdx = activeMonthIdx >= 0 ? activeMonthIdx : 0;
  // Look back to previous month (wrap around Jan -> Dec)
  const prevMonthIdx = (currentMonthIdx + 11) % 12;

  // Previous month data from annual dataset
  const prevMonthSummary = annualData[prevMonthIdx] || {
    month: '—',
    fullName: 'previous month',
    income: 0,
    expenses: 0,
    savings: 0,
    savingsRate: 0,
  };

  // 1. Total Income Trend: Higher income is improvement
  const incomeDiff = totalIncome - prevMonthSummary.income;
  const incomePctChange =
    prevMonthSummary.income > 0 ? (incomeDiff / prevMonthSummary.income) * 100 : 0;
  const isIncomeImproved = incomeDiff >= 0;

  // 2. Total Expenses Trend: Lower expenses is improvement
  const expensesDiff = totalExpenses - prevMonthSummary.expenses;
  const expensesPctChange =
    prevMonthSummary.expenses > 0 ? (expensesDiff / prevMonthSummary.expenses) * 100 : 0;
  const isExpensesImproved = expensesDiff <= 0; // Spending less is positive improvement

  // 3. Savings Trend: Higher savings is improvement
  const savingsDiff = savings - prevMonthSummary.savings;
  const savingsPctChange =
    prevMonthSummary.savings !== 0
      ? (savingsDiff / Math.abs(prevMonthSummary.savings)) * 100
      : 0;
  const isSavingsImproved = savingsDiff >= 0;

  // 4. Savings Rate Trend: Higher savings rate is improvement
  const savingsRateDiff = savingsRate - prevMonthSummary.savingsRate;
  const isSavingsRateImproved = savingsRateDiff >= 0;

  // 5. Remaining Budget Trend
  const prevRemainingBudget = totalPlannedExpenses - prevMonthSummary.expenses;
  const remainingBudgetDiff = remainingBudget - prevRemainingBudget;
  const isBudgetImproved = remainingBudgetDiff >= 0;

  // Expense breakdown data for donut chart
  const expenseBreakdown = categories
    .filter((c) => c.isActive)
    .map((cat) => ({
      category: cat.name,
      amount: sumExpensesByCategory(expenseTransactions, cat.name),
      color: cat.color,
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Largest expense category
  const largestExpenseCategory =
    expenseBreakdown.length > 0 ? expenseBreakdown[0] : { category: 'None', amount: 0 };
  const largestExpensePct =
    totalExpenses > 0 ? (largestExpenseCategory.amount / totalExpenses) * 100 : 0;

  // Over budget categories
  const overBudgetCategories = categories.filter((cat) => {
    const planned = plannedExpenses[cat.name] || 0;
    const actual = sumExpensesByCategory(expenseTransactions, cat.name);
    return planned > 0 && actual > planned;
  });

  // Recent transactions (combine income + expense and sort by date descending)
  interface RecentTxItem {
    id: string;
    date: string;
    type: 'Income' | 'Expense';
    description: string;
    category: string;
    amount: number;
  }

  const combinedRecent: RecentTxItem[] = [
    ...incomeTransactions.map((tx) => ({
      id: tx.id,
      date: tx.date,
      type: 'Income' as const,
      description: tx.description,
      category: tx.category,
      amount: tx.amount,
    })),
    ...expenseTransactions.map((tx) => ({
      id: tx.id,
      date: tx.date,
      type: 'Expense' as const,
      description: tx.description,
      category: tx.category,
      amount: tx.amount,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 p-3 sm:p-6 lg:p-8">
      {/* Dashboard Top Header - Optimized for Mobile, Tablet & Desktop */}
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-blue-50/50 via-white to-slate-50/70 p-4 sm:p-5 lg:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left Column: Title, Badges, Subtitle & Metadata Pills */}
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs shrink-0">
                <PieChart className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-slate-900 truncate">
                Financial Command Center
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100/90 px-2.5 py-0.5 text-[11px] font-bold text-blue-800 border border-blue-200/60 shadow-2xs shrink-0">
                <Sparkles className="h-3 w-3 text-blue-600" />
                <span>Executive Dashboard</span>
              </span>
            </div>

            <p className="text-xs text-slate-500 sm:text-sm leading-relaxed max-w-2xl">
              High-level overview of income, expenses, cashflow health, and budget performance for{' '}
              <strong className="text-slate-700">{settings.month} {settings.year}</strong>.
            </p>

            {/* Mobile & Tablet Responsive Badges: Period, Benchmark, and Surplus/Deficit Status */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
                <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>Period: <strong className="text-slate-900">{settings.month} {settings.year}</strong></span>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 shadow-2xs">
                <span className="font-semibold text-slate-500">Benchmark:</span>
                <span className="font-medium text-slate-800">vs. {prevMonthSummary.fullName}</span>
              </div>

              <div
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border shadow-2xs ${
                  savings >= 0
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                {savings >= 0 ? (
                  <>
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Monthly Surplus</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    <span>Monthly Deficit</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Key Metric Indicators and Offline Backup Action */}
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center lg:items-end xl:items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t border-slate-200/60 lg:border-t-0">
            {/* Quick Metrics Capsule on Tablet/Desktop */}
            <div className="hidden md:flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2 shadow-2xs text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Cashflow</span>
                <span className={`font-black text-sm ${savings >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatCurrency(savings, settings.currency)}
                </span>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Savings Rate</span>
                <span className="font-black text-sm text-purple-700">
                  {savingsRate.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Offline Backup Download Button */}
            <button
              type="button"
              onClick={handleTriggerExport}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:shadow-md transition-all cursor-pointer group"
              title="Download entire workbook as an Excel (.xlsx) or Structured CSV (.csv) file"
            >
              <HardDriveDownload className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
              <span>Download Backup</span>
              <span className="rounded-md bg-blue-500/80 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-50">
                XLSX / CSV
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 Top KPI Cards with dynamic trend arrows relative to previous month:
          - Total Income
          - Total Expenses
          - Savings
          - Savings Rate
          - Remaining Budget
      */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KPICard
          title="Total Income"
          value={formatCurrency(totalIncome, settings.currency)}
          subtitle={`vs. ${prevMonthSummary.month} (${formatCurrency(prevMonthSummary.income, settings.currency)})`}
          icon={<Wallet className="h-5 w-5" />}
          theme="green"
          trend={{
            direction: incomeDiff >= 0 ? 'up' : 'down',
            text: `${incomeDiff >= 0 ? '+' : ''}${incomePctChange.toFixed(1)}% vs ${prevMonthSummary.month}`,
            isPositive: isIncomeImproved,
            isNegative: !isIncomeImproved,
            tooltip: `Total income is ${incomeDiff >= 0 ? 'up' : 'down'} by ${formatCurrency(Math.abs(incomeDiff), settings.currency)} vs ${prevMonthSummary.fullName}`,
          }}
          onClick={() =>
            onSelectCell({
              reference: 'Dashboard!Total_Income',
              value: formatCurrency(totalIncome, settings.currency),
              formula: '=tbl_Income[[#Totals],[Amount]]',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Total Expenses"
          value={formatCurrency(totalExpenses, settings.currency)}
          subtitle={`vs. ${prevMonthSummary.month} (${formatCurrency(prevMonthSummary.expenses, settings.currency)})`}
          icon={<Receipt className="h-5 w-5" />}
          theme="red"
          trend={{
            direction: expensesDiff > 0 ? 'up' : 'down',
            text: `${expensesDiff <= 0 ? '' : '+'}${expensesPctChange.toFixed(1)}% vs ${prevMonthSummary.month}`,
            isPositive: isExpensesImproved,
            isNegative: !isExpensesImproved,
            tooltip: `${isExpensesImproved ? 'Spending decreased (improvement)' : 'Spending increased (decline)'} by ${formatCurrency(Math.abs(expensesDiff), settings.currency)} vs ${prevMonthSummary.fullName}`,
          }}
          onClick={() =>
            onSelectCell({
              reference: 'Dashboard!Total_Expenses',
              value: formatCurrency(totalExpenses, settings.currency),
              formula: '=tbl_Expenses[[#Totals],[Amount]]',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Savings"
          value={formatCurrency(savings, settings.currency)}
          subtitle={`vs. ${prevMonthSummary.month} (${formatCurrency(prevMonthSummary.savings, settings.currency)})`}
          icon={<PiggyBank className="h-5 w-5" />}
          theme="blue"
          trend={{
            direction: savingsDiff >= 0 ? 'up' : 'down',
            text: `${savingsDiff >= 0 ? '+' : ''}${savingsPctChange.toFixed(1)}% vs ${prevMonthSummary.month}`,
            isPositive: isSavingsImproved,
            isNegative: !isSavingsImproved,
            tooltip: `Net savings ${isSavingsImproved ? 'improved' : 'declined'} by ${formatCurrency(Math.abs(savingsDiff), settings.currency)} vs ${prevMonthSummary.fullName}`,
          }}
          onClick={() =>
            onSelectCell({
              reference: 'Dashboard!Savings',
              value: formatCurrency(savings, settings.currency),
              formula: '=Dashboard!Total_Income - Dashboard!Total_Expenses',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Savings Rate"
          value={formatPercent(savingsRate)}
          subtitle={`vs. ${prevMonthSummary.month} (${prevMonthSummary.savingsRate.toFixed(1)}%)`}
          icon={<TrendingUp className="h-5 w-5" />}
          theme="purple"
          trend={{
            direction: savingsRateDiff >= 0 ? 'up' : 'down',
            text: `${savingsRateDiff >= 0 ? '+' : ''}${savingsRateDiff.toFixed(1)}% pts vs ${prevMonthSummary.month}`,
            isPositive: isSavingsRateImproved,
            isNegative: !isSavingsRateImproved,
            tooltip: `Savings rate ${isSavingsRateImproved ? 'increased' : 'decreased'} by ${Math.abs(savingsRateDiff).toFixed(1)} percentage points vs ${prevMonthSummary.fullName}`,
          }}
          onClick={() =>
            onSelectCell({
              reference: 'Dashboard!Savings_Rate',
              value: formatPercent(savingsRate),
              formula: '=Dashboard!Savings / Dashboard!Total_Income',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Remaining Budget"
          value={formatCurrency(remainingBudget, settings.currency)}
          subtitle={remainingBudget >= 0 ? 'Under planned limit' : 'Over planned limit'}
          icon={<CheckCircle2 className="h-5 w-5" />}
          theme={remainingBudget >= 0 ? 'green' : 'red'}
          trend={{
            direction: remainingBudgetDiff >= 0 ? 'up' : 'down',
            text: `${remainingBudgetDiff >= 0 ? '+' : ''}${formatCurrency(remainingBudgetDiff, settings.currency)} vs ${prevMonthSummary.month}`,
            isPositive: isBudgetImproved,
            isNegative: !isBudgetImproved,
            tooltip: `Budget buffer ${remainingBudgetDiff >= 0 ? 'improved' : 'decreased'} compared to ${prevMonthSummary.fullName}`,
          }}
          onClick={() =>
            onSelectCell({
              reference: 'Dashboard!Remaining_Budget',
              value: formatCurrency(remainingBudget, settings.currency),
              formula: '=tbl_Budget[Planned_Expense_Total] - tbl_Budget[Actual_Expense_Total]',
              isCalculated: true,
            })
          }
        />
      </div>

      {/* Row of Charts: Chart 1 (Income vs Expenses) + Chart 2 (Expense Breakdown Donut) */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <IncomeExpensesBarChart
            income={totalIncome}
            expenses={totalExpenses}
            currency={settings.currency}
            plannedIncome={totalPlannedIncome}
            plannedExpenses={totalPlannedExpenses}
          />
        </div>

        <div className="lg:col-span-6">
          <ExpenseDonutChart
            data={expenseBreakdown}
            currency={settings.currency}
          />
        </div>
      </div>

      {/* Row of Trend Charts: Chart 3 (Monthly Trend 12 Months) + Chart 4 (Savings Rate Progression) */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <MonthlyTrendChart
            data={annualData}
            currency={settings.currency}
          />
        </div>

        <div className="lg:col-span-5">
          <SavingsRateLineChart
            data={annualData}
            currentRate={savingsRate}
          />
        </div>
      </div>

      {/* Bottom Row: Recent Transactions Table (Left) + Key Insights List (Right) */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        {/* Recent Transactions Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">
                Recent Transactions
              </h3>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Latest activity
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="border-b border-slate-200 bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5 w-28">Date</th>
                  <th className="px-3 py-2.5 w-20">Type</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5 w-32">Category</th>
                  <th className="px-4 py-2.5 w-28 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {combinedRecent.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() =>
                      onSelectCell({
                        reference: `Dashboard!Recent[${tx.id}]`,
                        value: `${tx.type}: ${tx.description} - ${formatCurrency(tx.amount, settings.currency)}`,
                        isCalculated: false,
                      })
                    }
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-600">
                      {formatDate(tx.date, settings.dateFormat)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-xs px-2 py-0.5 text-[10px] font-bold ${
                          tx.type === 'Income'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {tx.description}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {tx.category}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono font-bold ${
                        tx.type === 'Income' ? 'text-teal-700' : 'text-slate-900'
                      }`}
                    >
                      {tx.type === 'Income' ? '+' : ''}
                      {formatCurrency(tx.amount, settings.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Insights Box */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800">Key Insights</h3>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Live Analysis
            </span>
          </div>

          <div className="space-y-3">
            {/* Insight 1: Savings summary */}
            <div className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
              <div className="rounded-md bg-emerald-100 p-1.5 text-emerald-700 mt-0.5">
                <PiggyBank className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Monthly Savings Rate: <strong>{savingsRate.toFixed(1)}%</strong>
                </p>
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                  You saved {formatCurrency(savings, settings.currency)} this month, which represents {savingsRate.toFixed(1)}% of your total income.
                </p>
              </div>
            </div>

            {/* Insight 2: Largest expense */}
            <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
              <div className="rounded-md bg-blue-100 p-1.5 text-blue-700 mt-0.5">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Largest Expense: <strong>{largestExpenseCategory.category}</strong>
                </p>
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                  {largestExpenseCategory.category} accounts for {formatCurrency(largestExpenseCategory.amount, settings.currency)} ({largestExpensePct.toFixed(0)}% of total monthly expenses).
                </p>
              </div>
            </div>

            {/* Insight 3: Budget variance */}
            <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
              <div className="rounded-md bg-amber-100 p-1.5 text-amber-700 mt-0.5">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Planned vs. Actual Spending
                </p>
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                  {remainingBudget >= 0 ? (
                    <>You are <strong className="text-emerald-700">{formatCurrency(remainingBudget, settings.currency)} under</strong> your planned expenses limit.</>
                  ) : (
                    <>You are <strong className="text-rose-700">{formatCurrency(Math.abs(remainingBudget), settings.currency)} over</strong> your planned expenses ceiling.</>
                  )}
                </p>
              </div>
            </div>

            {/* Insight 4: Actionable recommendation */}
            <div className="flex items-start gap-3 rounded-lg border border-purple-100 bg-purple-50/50 p-3">
              <div className="rounded-md bg-purple-100 p-1.5 text-purple-700 mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Financial Growth Tip
                </p>
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                  Consider increasing your high-yield savings deposits to accelerate emergency fund and investment goals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Offline Backup Export Modal */}
      <ExportWorkbookModal
        isOpen={isLocalExportModalOpen}
        onClose={() => setIsLocalExportModalOpen(false)}
        workbookData={{
          settings,
          incomeCategories: incomeCategories && incomeCategories.length > 0 ? incomeCategories : categories,
          expenseCategories: categories,
          paymentMethods,
          incomeTransactions,
          expenseTransactions,
          plannedIncome,
          plannedExpenses,
          annualData,
        }}
      />
    </div>
  );
};
