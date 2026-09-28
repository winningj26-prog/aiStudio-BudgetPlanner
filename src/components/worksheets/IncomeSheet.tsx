import React, { useState } from 'react';
import {
  CategoryItem,
  CurrencyCode,
  IncomeTransaction,
  SettingsState,
} from '../../types/budget';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { sumIncomeTransactions } from '../../utils/formulas';
import { KPICard } from '../KPICard';
import {
  ArrowDownCircle,
  Calculator,
  Calendar,
  CheckCircle2,
  DollarSign,
  Hash,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';

interface IncomeSheetProps {
  transactions: IncomeTransaction[];
  onUpdateTransactions: (transactions: IncomeTransaction[]) => void;
  categories: CategoryItem[];
  settings: SettingsState;
  highlightInputs: boolean;
  onSelectCell: (info: { reference: string; value: string; formula?: string; isCalculated: boolean }) => void;
}

export const IncomeSheet: React.FC<IncomeSheetProps> = ({
  transactions,
  onUpdateTransactions,
  categories,
  settings,
  highlightInputs,
  onSelectCell,
}) => {
  const [newDate, setNewDate] = useState('2026-01-25');
  const [newCategory, setNewCategory] = useState(categories[0]?.name || 'Salary');
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const totalIncome = sumIncomeTransactions(transactions);
  const txCount = transactions.length;
  const avgIncome = txCount > 0 ? totalIncome / txCount : 0;

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const newTx: IncomeTransaction = {
      id: `inc_tx_${Date.now()}`,
      date: newDate,
      category: newCategory,
      description: newDescription.trim() || 'Income',
      amount: amountNum,
    };

    onUpdateTransactions([...transactions, newTx]);
    setNewDescription('');
    setNewAmount('');
  };

  const handleDeleteTransaction = (id: string) => {
    onUpdateTransactions(transactions.filter((tx) => tx.id !== id));
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesCat = categoryFilter === 'All' || tx.category === categoryFilter;
    const matchesSearch =
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.date.includes(searchTerm);
    return matchesCat && matchesSearch;
  });

  const inputCellClass = highlightInputs
    ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300/40'
    : 'bg-white border-slate-300';

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              3. Income Transactions
            </h2>
            <span className="rounded-md bg-teal-100 px-2 py-0.5 font-mono text-xs font-semibold text-teal-800">
              tbl_Income
            </span>
          </div>
          <p className="text-xs text-slate-500 sm:text-sm">
            Log all sources of incoming revenue for {settings.month} {settings.year}.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span>Active Period: <strong>{settings.month} {settings.year}</strong></span>
        </div>
      </div>

      {/* KPI Cards: Total Income, Number of Transactions, Average Income */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <KPICard
          title="Total Income"
          value={formatCurrency(totalIncome, settings.currency)}
          subtitle="Sum of all recorded income"
          icon={<Wallet className="h-5 w-5" />}
          theme="green"
          trend={{ text: '↑ 12.0% vs. last month', isPositive: true }}
          onClick={() =>
            onSelectCell({
              reference: 'tbl_Income[[#Totals],[Amount]]',
              value: formatCurrency(totalIncome, settings.currency),
              formula: '=SUM(tbl_Income[Amount])',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Number of Transactions"
          value={String(txCount)}
          subtitle="Recorded income deposits"
          icon={<Hash className="h-5 w-5" />}
          theme="blue"
          onClick={() =>
            onSelectCell({
              reference: 'Income!Summary_Count',
              value: String(txCount),
              formula: '=COUNTA(tbl_Income[Category])',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Average Income Transaction"
          value={formatCurrency(avgIncome, settings.currency)}
          subtitle="Mean amount per transaction"
          icon={<Calculator className="h-5 w-5" />}
          theme="purple"
          onClick={() =>
            onSelectCell({
              reference: 'Income!Summary_Average',
              value: formatCurrency(avgIncome, settings.currency),
              formula: '=AVERAGE(tbl_Income[Amount])',
              isCalculated: true,
            })
          }
        />
      </div>

      {/* Add New Income Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-800">
            Record New Income Transaction
          </h3>
          <span className="text-xs text-slate-400">All fields are user inputs</span>
        </div>

        <form onSubmit={handleAddTransaction} className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 items-end">
          {/* 1. Date */}
          <div className="space-y-1 sm:col-span-1 lg:col-span-2">
            <label className="text-xs font-semibold text-slate-600">1. Date</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              className={`w-full rounded-lg border px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-teal-500 focus:outline-hidden ${inputCellClass}`}
            />
          </div>

          {/* 2. Category */}
          <div className="space-y-1 sm:col-span-1 lg:col-span-3">
            <label className="text-xs font-semibold text-slate-600">2. Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-teal-500 focus:outline-hidden ${inputCellClass}`}
            >
              {categories
                .filter((c) => c.isActive)
                .map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>

          {/* 3. Description */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <label className="text-xs font-semibold text-slate-600">3. Description</label>
            <input
              type="text"
              placeholder="e.g. Regular Salary, Freelance project..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              required
              className={`w-full rounded-lg border px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-teal-500 focus:outline-hidden ${inputCellClass}`}
            />
          </div>

          {/* 4. Amount */}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-slate-600">4. Amount</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  required
                  className={`w-full rounded-lg border px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs focus:border-teal-500 focus:outline-hidden ${inputCellClass}`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-auto inline-flex items-center justify-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 cursor-pointer h-[34px]"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          </div>
        </form>
      </div>

      {/* Primary Table: tbl_Income */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-800">
              Income Transactions Ledger
            </span>
            <span className="text-xs text-slate-500">
              ({filteredTransactions.length} of {transactions.length} rows)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-auto rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 shadow-2xs focus:border-teal-500 focus:outline-hidden"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-teal-500 focus:outline-hidden"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* The Exact Table with Required Columns: Date | Category | Description | Amount */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[550px]">
            <thead className="border-b border-slate-200 bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-32">1. Date</th>
                <th className="px-4 py-3 w-48">2. Category</th>
                <th className="px-4 py-3">3. Description</th>
                <th className="px-4 py-3 w-36 text-right">4. Amount</th>
                <th className="px-3 py-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No income transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    onClick={() =>
                      onSelectCell({
                        reference: `tbl_Income[Amount][${idx + 1}]`,
                        value: formatCurrency(tx.amount, settings.currency),
                        isCalculated: false,
                      })
                    }
                    className="hover:bg-teal-50/40 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-slate-600">
                      {formatDate(tx.date, settings.dateFormat)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 border border-teal-200">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {tx.description}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(tx.amount, settings.currency)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTransaction(tx.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete transaction"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Total Row */}
            <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold">
              <tr
                onClick={() =>
                  onSelectCell({
                    reference: 'tbl_Income[[#Totals],[Amount]]',
                    value: formatCurrency(totalIncome, settings.currency),
                    formula: '=SUM(tbl_Income[Amount])',
                    isCalculated: true,
                  })
                }
                className="cursor-pointer hover:bg-slate-100/80"
              >
                <td colSpan={3} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-700">
                  Total Income:
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-extrabold text-teal-800">
                  {formatCurrency(totalIncome, settings.currency)}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="font-mono text-[10px] text-slate-400" title="SUM formula">
                    ∑
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
