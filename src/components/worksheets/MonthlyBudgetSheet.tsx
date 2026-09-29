import React, { useState } from 'react';
import {
  BudgetItem,
  BudgetStatus,
  CategoryItem,
  ExpenseTransaction,
  IncomeTransaction,
  SettingsState,
} from '../../types/budget';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import {
  calculateBudgetItem,
  sumExpensesByCategory,
  sumIncomeByCategory,
  sumExpenseTransactions,
  sumIncomeTransactions,
} from '../../utils/formulas';
import { KPICard } from '../KPICard';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  DollarSign,
  HelpCircle,
  Layers,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';

interface MonthlyBudgetSheetProps {
  incomeCategories: CategoryItem[];
  expenseCategories: CategoryItem[];
  incomeTransactions: IncomeTransaction[];
  expenseTransactions: ExpenseTransaction[];
  plannedIncome: Record<string, number>;
  onUpdatePlannedIncome: (planned: Record<string, number>) => void;
  plannedExpenses: Record<string, number>;
  onUpdatePlannedExpenses: (planned: Record<string, number>) => void;
  settings: SettingsState;
  highlightInputs: boolean;
  onSelectCell: (info: { reference: string; value: string; formula?: string; isCalculated: boolean }) => void;
}

export const MonthlyBudgetSheet: React.FC<MonthlyBudgetSheetProps> = ({
  incomeCategories,
  expenseCategories,
  incomeTransactions,
  expenseTransactions,
  plannedIncome,
  onUpdatePlannedIncome,
  plannedExpenses,
  onUpdatePlannedExpenses,
  settings,
  highlightInputs,
  onSelectCell,
}) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');

  // 1. Build Income Budget Items
  const incomeItems: BudgetItem[] = incomeCategories
    .filter((c) => c.isActive)
    .map((cat) => {
      const planned = plannedIncome[cat.name] || 0;
      const actual = sumIncomeByCategory(incomeTransactions, cat.name);
      return calculateBudgetItem(cat.name, 'income', planned, actual);
    });

  // 2. Build Expense Budget Items
  const expenseItems: BudgetItem[] = expenseCategories
    .filter((c) => c.isActive)
    .map((cat) => {
      const planned = plannedExpenses[cat.name] || 0;
      const actual = sumExpensesByCategory(expenseTransactions, cat.name);
      return calculateBudgetItem(cat.name, 'expense', planned, actual);
    });

  // Overall Totals
  const totalPlannedIncome = Object.values(plannedIncome).reduce((a, b) => a + b, 0);
  const totalActualIncome = sumIncomeTransactions(incomeTransactions);
  const incomeDiff = totalActualIncome - totalPlannedIncome;

  const totalPlannedExpenses = Object.values(plannedExpenses).reduce((a, b) => a + b, 0);
  const totalActualExpenses = sumExpenseTransactions(expenseTransactions);
  const expenseDiff = totalPlannedExpenses - totalActualExpenses; // positive is under-budget

  const plannedSavings = totalPlannedIncome - totalPlannedExpenses;
  const actualSavings = totalActualIncome - totalActualExpenses;
  const savingsDiff = actualSavings - plannedSavings;
  const savingsRate = totalActualIncome > 0 ? (actualSavings / totalActualIncome) * 100 : 0;
  const remainingBudget = totalPlannedExpenses - totalActualExpenses;

  // Editing inline
  const startEditing = (category: string, currentVal: number) => {
    setEditingCategory(category);
    setTempValue(String(currentVal));
  };

  const savePlanned = (category: string, type: 'income' | 'expense') => {
    const val = parseFloat(tempValue);
    if (!isNaN(val) && val >= 0) {
      if (type === 'income') {
        onUpdatePlannedIncome({ ...plannedIncome, [category]: val });
      } else {
        onUpdatePlannedExpenses({ ...plannedExpenses, [category]: val });
      }
    }
    setEditingCategory(null);
  };

  const inputCellClass = highlightInputs
    ? 'bg-amber-50/80 border-amber-300 font-semibold'
    : 'bg-white border-slate-200';

  const renderStatusBadge = (status: BudgetStatus) => {
    switch (status) {
      case 'On Track':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            On Track
          </span>
        );
      case 'Near Limit':
      case 'Near Target':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            {status === 'Near Target' ? 'Near Target' : 'Near Limit'}
          </span>
        );
      case 'Over Budget':
      case 'Below Target':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800 border border-rose-200">
            <XCircle className="h-3 w-3 text-rose-600" />
            {status === 'Below Target' ? 'Below Target' : 'Over Budget'}
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              5. Monthly Budget Overview (Plan vs. Actual)
            </h2>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 font-mono text-xs font-semibold text-blue-800">
              tbl_Budget
            </span>
          </div>
          <p className="text-xs text-slate-500 sm:text-sm">
            Compare planned allocations against actual revenue and expenditures for {settings.month} {settings.year}.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span>Active Month: <strong>{settings.month} {settings.year}</strong></span>
        </div>
      </div>

      {/* 8 Required KPI Cards from Specification:
          - Planned Income
          - Actual Income
          - Planned Expenses
          - Actual Expenses
          - Planned Savings
          - Actual Savings
          - Remaining Budget
          - Savings Rate
      */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Planned Income"
          value={formatCurrency(totalPlannedIncome, settings.currency)}
          subtitle="Target revenue"
          icon={<Wallet className="h-5 w-5" />}
          theme="blue"
          onClick={() =>
            onSelectCell({
              reference: 'tbl_Budget[Planned_Income_Total]',
              value: formatCurrency(totalPlannedIncome, settings.currency),
              formula: '=SUM(Planned_Income_Range)',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Actual Income"
          value={formatCurrency(totalActualIncome, settings.currency)}
          subtitle={incomeDiff >= 0 ? `+${formatCurrency(incomeDiff, settings.currency)} over target` : `${formatCurrency(incomeDiff, settings.currency)} under target`}
          icon={<DollarSign className="h-5 w-5" />}
          theme="green"
          trend={{ text: `${totalPlannedIncome > 0 ? ((totalActualIncome / totalPlannedIncome) * 100).toFixed(1) : '0.0'}% achieved`, isPositive: incomeDiff >= 0 }}
          onClick={() =>
            onSelectCell({
              reference: 'tbl_Budget[Actual_Income_Total]',
              value: formatCurrency(totalActualIncome, settings.currency),
              formula: '=SUM(tbl_Income[Amount])',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Planned Expenses"
          value={formatCurrency(totalPlannedExpenses, settings.currency)}
          subtitle="Allocated spending limit"
          icon={<Layers className="h-5 w-5" />}
          theme="neutral"
          onClick={() =>
            onSelectCell({
              reference: 'tbl_Budget[Planned_Expense_Total]',
              value: formatCurrency(totalPlannedExpenses, settings.currency),
              formula: '=SUM(Planned_Expense_Range)',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Actual Expenses"
          value={formatCurrency(totalActualExpenses, settings.currency)}
          subtitle={`${((totalActualExpenses / (totalPlannedExpenses || 1)) * 100).toFixed(1)}% of planned used`}
          icon={<ArrowDownRight className="h-5 w-5" />}
          theme={totalActualExpenses <= totalPlannedExpenses ? 'green' : 'red'}
          trend={{ text: `${totalPlannedExpenses > 0 ? ((totalActualExpenses / totalPlannedExpenses) * 100).toFixed(1) : '0.0'}% of budget used`, isPositive: totalActualExpenses <= totalPlannedExpenses }}
          onClick={() =>
            onSelectCell({
              reference: 'tbl_Budget[Actual_Expense_Total]',
              value: formatCurrency(totalActualExpenses, settings.currency),
              formula: '=SUM(tbl_Expenses[Amount])',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Planned Savings"
          value={formatCurrency(plannedSavings, settings.currency)}
          subtitle="Planned Income - Planned Expenses"
          icon={<PiggyBank className="h-5 w-5" />}
          theme="blue"
          onClick={() =>
            onSelectCell({
              reference: 'tbl_Budget[Planned_Savings]',
              value: formatCurrency(plannedSavings, settings.currency),
              formula: '=Planned_Income - Planned_Expenses',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Actual Savings"
          value={formatCurrency(actualSavings, settings.currency)}
          subtitle={`Surplus: +${formatCurrency(savingsDiff, settings.currency)}`}
          icon={<TrendingUp className="h-5 w-5" />}
          theme="green"
          trend={{ text: `${savingsDiff >= 0 ? '+' : ''}${formatCurrency(savingsDiff, settings.currency)} vs plan`, isPositive: savingsDiff >= 0 }}
          onClick={() =>
            onSelectCell({
              reference: 'tbl_Budget[Actual_Savings]',
              value: formatCurrency(actualSavings, settings.currency),
              formula: '=Actual_Income - Actual_Expenses',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Remaining Budget"
          value={formatCurrency(remainingBudget, settings.currency)}
          subtitle="Remaining unspent budget allowance"
          icon={<CheckCircle2 className="h-5 w-5" />}
          theme="green"
          trend={{ text: remainingBudget >= 0 ? 'Within planned limit' : 'Over planned limit', isPositive: remainingBudget >= 0 }}
          onClick={() =>
            onSelectCell({
              reference: 'tbl_Budget[Remaining_Budget]',
              value: formatCurrency(remainingBudget, settings.currency),
              formula: '=Planned_Expenses - Actual_Expenses',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Savings Rate"
          value={formatPercent(savingsRate)}
          subtitle="Savings / Total Income"
          icon={<BarChart3 className="h-5 w-5" />}
          theme="purple"
          trend={{ text: `${savingsRate.toFixed(1)}% current rate`, isPositive: savingsRate >= 0 }}
          onClick={() =>
            onSelectCell({
              reference: 'tbl_Budget[Savings_Rate]',
              value: formatPercent(savingsRate),
              formula: '=Actual_Savings / Actual_Income',
              isCalculated: true,
            })
          }
        />
      </div>

      {/* Remaining Budget High-Visibility Banner */}
      <div className="flex flex-wrap items-center justify-between rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/20 p-2 backdrop-blur-xs">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-100">
              Remaining Budget Allowance
            </h3>
            <p className="text-xs text-emerald-100/90">
              You are currently spending well below your planned expense ceiling for this period.
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {formatCurrency(remainingBudget, settings.currency)}
          </div>
          <span className="text-xs font-semibold text-emerald-200">
            {formatCurrency(totalActualExpenses, settings.currency)} spent of {formatCurrency(totalPlannedExpenses, settings.currency)} planned
          </span>
        </div>
      </div>

      {/* Primary Budget Table (Section A: Income, Section B: Expenses, Section C: Net Income) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Monthly Budget Table (Exact Columns 1-6)
            </h3>
            <p className="text-xs text-slate-500">
              Click on any Planned Amount cell to edit its target value directly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600 font-medium">0–80% On Track</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-600 font-medium">81–100% Near Limit</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-600 font-medium">&gt;100% Over Budget</span>
            </div>
          </div>
        </div>

        {/* Tab Controls (Zero-Pill underline discipline) */}
        <div className="flex border-b border-slate-200 bg-slate-50/40 px-4">
          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Expense Budgets ({expenseItems.length} Categories)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('income')}
            className={`px-4 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'income'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Income Targets ({incomeItems.length} Categories)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="border-b border-slate-200 bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-48">1. Category</th>
                <th className="px-4 py-3 w-36 text-right">2. Planned Amount</th>
                <th className="px-4 py-3 w-36 text-right">3. Actual Amount</th>
                <th className="px-4 py-3 w-36 text-right">4. Difference</th>
                <th className="px-4 py-3 w-28 text-right">5. % Used</th>
                <th className="px-4 py-3 w-32 text-center">6. Status</th>
              </tr>
            </thead>

            {activeTab === 'income' ? (
              /* SECTION 1: INCOME BUDGET TAB */
              <tbody className="divide-y divide-slate-100 animate-in fade-in duration-150">
                <tr className="bg-teal-50/70 text-teal-900 font-bold">
                  <td colSpan={6} className="px-4 py-2 text-xs uppercase tracking-wider">
                    Income Sources (Revenue Targets)
                  </td>
                </tr>

                {incomeItems.map((item) => (
                  <tr
                    key={item.category}
                    onClick={() =>
                      onSelectCell({
                        reference: `tbl_Budget[Category="${item.category}"]`,
                        value: `Planned: ${formatCurrency(item.planned, settings.currency)}, Actual: ${formatCurrency(item.actual, settings.currency)}`,
                        formula: `=SUMIF(tbl_Income[Category], "${item.category}", tbl_Income[Amount])`,
                        isCalculated: true,
                      })
                    }
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {item.category}
                    </td>

                    {/* Planned (Editable input) */}
                    <td
                      className={`px-4 py-2.5 text-right font-mono text-slate-700 ${inputCellClass}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(item.category, item.planned);
                      }}
                    >
                      {editingCategory === item.category ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            autoFocus
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => savePlanned(item.category, 'income')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') savePlanned(item.category, 'income');
                              if (e.key === 'Escape') setEditingCategory(null);
                            }}
                            className="w-24 rounded border border-blue-500 bg-white px-1.5 py-0.5 text-right font-mono text-xs font-bold text-slate-900 shadow-xs focus:outline-hidden"
                          />
                        </div>
                      ) : (
                        <span className="border-b border-dashed border-slate-400 hover:border-slate-700">
                          {formatCurrency(item.planned, settings.currency)}
                        </span>
                      )}
                    </td>

                    {/* Actual Amount (Calculated) */}
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.actual, settings.currency)}
                    </td>

                    {/* Difference */}
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">
                      <span
                        className={
                          item.difference >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }
                      >
                        {item.difference >= 0 ? '+' : ''}
                        {formatCurrency(item.difference, settings.currency)}
                      </span>
                    </td>

                    {/* % Used */}
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-700">
                      {formatPercent(item.percentUsed, 0)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2.5 text-center">
                      {renderStatusBadge(item.status)}
                    </td>
                  </tr>
                ))}

                {/* Subtotal Income */}
                <tr className="bg-teal-100/50 font-bold text-slate-900 border-t border-teal-200">
                  <td className="px-4 py-2.5 uppercase text-[11px] tracking-wider text-teal-900">
                    Total Income
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatCurrency(totalPlannedIncome, settings.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-800">
                    {formatCurrency(totalActualIncome, settings.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-700">
                    +{formatCurrency(incomeDiff, settings.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatPercent((totalActualIncome / (totalPlannedIncome || 1)) * 100, 0)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex items-center rounded-md bg-emerald-200/80 px-2 py-0.5 text-[11px] font-bold text-emerald-900">
                      On Track
                    </span>
                  </td>
                </tr>
              </tbody>
            ) : (
              /* SECTION 2: EXPENSE BUDGET TAB */
              <tbody className="divide-y divide-slate-100 animate-in fade-in duration-150">
                <tr className="bg-rose-50/70 text-rose-900 font-bold">
                  <td colSpan={6} className="px-4 py-2 text-xs uppercase tracking-wider">
                    Expense Budgets (Spending Ceilings)
                  </td>
                </tr>

                {expenseItems.map((item) => (
                  <tr
                    key={item.category}
                    onClick={() =>
                      onSelectCell({
                        reference: `tbl_Budget[Expense="${item.category}"]`,
                        value: `Planned: ${formatCurrency(item.planned, settings.currency)}, Actual: ${formatCurrency(item.actual, settings.currency)}`,
                        formula: `=SUMIF(tbl_Expenses[Category], "${item.category}", tbl_Expenses[Amount])`,
                        isCalculated: true,
                      })
                    }
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {item.category}
                    </td>

                    {/* Planned (Editable input) */}
                    <td
                      className={`px-4 py-2.5 text-right font-mono text-slate-700 ${inputCellClass}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(item.category, item.planned);
                      }}
                    >
                      {editingCategory === item.category ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            autoFocus
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => savePlanned(item.category, 'expense')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') savePlanned(item.category, 'expense');
                              if (e.key === 'Escape') setEditingCategory(null);
                            }}
                            className="w-24 rounded border border-blue-500 bg-white px-1.5 py-0.5 text-right font-mono text-xs font-bold text-slate-900 shadow-xs focus:outline-hidden"
                          />
                        </div>
                      ) : (
                        <span className="border-b border-dashed border-slate-400 hover:border-slate-700">
                          {formatCurrency(item.planned, settings.currency)}
                        </span>
                      )}
                    </td>

                    {/* Actual Amount (Calculated) */}
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.actual, settings.currency)}
                    </td>

                    {/* Difference (Planned - Actual) */}
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">
                      <span
                        className={
                          item.difference >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }
                      >
                        {item.difference >= 0 ? '+' : ''}
                        {formatCurrency(item.difference, settings.currency)}
                      </span>
                    </td>

                    {/* % Used */}
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">
                      <span
                        className={
                          item.percentUsed > 100
                            ? 'text-rose-700 font-bold'
                            : item.percentUsed > 80
                            ? 'text-amber-700 font-bold'
                            : 'text-slate-700'
                        }
                      >
                        {formatPercent(item.percentUsed, 0)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2.5 text-center">
                      {renderStatusBadge(item.status)}
                    </td>
                  </tr>
                ))}

                {/* Subtotal Expenses */}
                <tr className="bg-rose-100/50 font-bold text-slate-900 border-t border-rose-200">
                  <td className="px-4 py-2.5 uppercase text-[11px] tracking-wider text-rose-900">
                    Total Expenses
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatCurrency(totalPlannedExpenses, settings.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-rose-800">
                    {formatCurrency(totalActualExpenses, settings.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-700">
                    +{formatCurrency(expenseDiff, settings.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatPercent((totalActualExpenses / (totalPlannedExpenses || 1)) * 100, 0)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      On Track
                    </span>
                  </td>
                </tr>
              </tbody>
            )}

            {/* SECTION 3: NET INCOME / SAVINGS FOOTER ROW (ALWAYS RENDERED) */}
            <tfoot className="border-t-2 border-slate-400 bg-slate-900 text-white font-bold">
              <tr
                onClick={() =>
                  onSelectCell({
                    reference: 'tbl_Budget[Net_Income_Summary]',
                    value: formatCurrency(actualSavings, settings.currency),
                    formula: '=Total_Income - Total_Expenses',
                    isCalculated: true,
                  })
                }
                className="cursor-pointer hover:bg-slate-800"
              >
                <td className="px-4 py-3 uppercase tracking-wider text-xs text-emerald-400">
                  Net Income (Income - Expenses)
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-300">
                  {formatCurrency(plannedSavings, settings.currency)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-extrabold text-emerald-400">
                  {formatCurrency(actualSavings, settings.currency)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-emerald-300 font-extrabold">
                  +{formatCurrency(savingsDiff, settings.currency)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-emerald-300">
                  {formatPercent((actualSavings / (plannedSavings || 1)) * 100, 0)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                    Goal Surpassed
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
