import React, { useState } from 'react';
import {
  CategoryItem,
  ExpenseTransaction,
  SettingsState,
} from '../../types/budget';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { sumExpenseTransactions } from '../../utils/formulas';
import { KPICard } from '../KPICard';
import {
  ArrowDownRight,
  Calculator,
  Calendar,
  CreditCard,
  Flame,
  Hash,
  Layers,
  Plus,
  Receipt,
  Search,
  Trash2,
} from 'lucide-react';

interface ExpensesSheetProps {
  transactions: ExpenseTransaction[];
  onUpdateTransactions: (transactions: ExpenseTransaction[]) => void;
  categories: CategoryItem[];
  paymentMethods: string[];
  settings: SettingsState;
  highlightInputs: boolean;
  onSelectCell: (info: { reference: string; value: string; formula?: string; isCalculated: boolean }) => void;
}

export const ExpensesSheet: React.FC<ExpensesSheetProps> = ({
  transactions,
  onUpdateTransactions,
  categories,
  paymentMethods,
  settings,
  highlightInputs,
  onSelectCell,
}) => {
  const [newDate, setNewDate] = useState('2026-01-28');
  const [newCategory, setNewCategory] = useState(categories[0]?.name || 'Housing');
  const [newDescription, setNewDescription] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState(paymentMethods[0] || 'Credit Card');
  const [newAmount, setNewAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');

  const totalExpenses = sumExpenseTransactions(transactions);
  const txCount = transactions.length;
  const avgExpense = txCount > 0 ? totalExpenses / txCount : 0;
  
  const largestTx = transactions.reduce((max, tx) => (tx.amount > max.amount ? tx : max), {
    amount: 0,
    category: 'None',
    description: 'None',
  } as ExpenseTransaction);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const newTx: ExpenseTransaction = {
      id: `exp_tx_${Date.now()}`,
      date: newDate,
      category: newCategory,
      description: newDescription.trim() || 'Expense',
      paymentMethod: newPaymentMethod,
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
    const matchesPayment = paymentFilter === 'All' || tx.paymentMethod === paymentFilter;
    const matchesSearch =
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.date.includes(searchTerm);
    return matchesCat && matchesPayment && matchesSearch;
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
              4. Expense Transactions
            </h2>
            <span className="rounded-md bg-rose-100 px-2 py-0.5 font-mono text-xs font-semibold text-rose-800">
              tbl_Expenses
            </span>
          </div>
          <p className="text-xs text-slate-500 sm:text-sm">
            Record, categorize, and audit day-to-day outlays for {settings.month} {settings.year}.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span>Active Period: <strong>{settings.month} {settings.year}</strong></span>
        </div>
      </div>

      {/* KPI Cards: Total Expenses, Number of Transactions, Average Expense, Largest Expense */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Expenses"
          value={formatCurrency(totalExpenses, settings.currency)}
          subtitle="Total spend for active month"
          icon={<Receipt className="h-5 w-5" />}
          theme="red"
          trend={{ text: '↓ -18.5% vs. last month', isPositive: true }}
          onClick={() =>
            onSelectCell({
              reference: 'tbl_Expenses[[#Totals],[Amount]]',
              value: formatCurrency(totalExpenses, settings.currency),
              formula: '=SUM(tbl_Expenses[Amount])',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Number of Transactions"
          value={String(txCount)}
          subtitle="Expense receipts logged"
          icon={<Hash className="h-5 w-5" />}
          theme="blue"
          onClick={() =>
            onSelectCell({
              reference: 'Expenses!Summary_Count',
              value: String(txCount),
              formula: '=COUNTA(tbl_Expenses[Category])',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Average Expense"
          value={formatCurrency(avgExpense, settings.currency)}
          subtitle="Mean cost per transaction"
          icon={<Calculator className="h-5 w-5" />}
          theme="orange"
          onClick={() =>
            onSelectCell({
              reference: 'Expenses!Summary_Average',
              value: formatCurrency(avgExpense, settings.currency),
              formula: '=AVERAGE(tbl_Expenses[Amount])',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Largest Expense"
          value={formatCurrency(largestTx.amount, settings.currency)}
          subtitle={`${largestTx.category} (${largestTx.description})`}
          icon={<Flame className="h-5 w-5" />}
          theme="purple"
          onClick={() =>
            onSelectCell({
              reference: 'Expenses!Summary_Max',
              value: formatCurrency(largestTx.amount, settings.currency),
              formula: '=MAX(tbl_Expenses[Amount])',
              isCalculated: true,
            })
          }
        />
      </div>

      {/* Add New Expense Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-800">
            Record New Expense Transaction
          </h3>
          <span className="text-xs text-slate-400">User input entry</span>
        </div>

        <form onSubmit={handleAddTransaction} className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 items-end">
          {/* 1. Transaction Date */}
          <div className="space-y-1 sm:col-span-1 lg:col-span-2">
            <label className="text-xs font-semibold text-slate-600">1. Transaction Date</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              className={`w-full rounded-lg border px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-hidden ${inputCellClass}`}
            />
          </div>

          {/* 2. Category */}
          <div className="space-y-1 sm:col-span-1 lg:col-span-2">
            <label className="text-xs font-semibold text-slate-600">2. Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-hidden ${inputCellClass}`}
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
          <div className="space-y-1 sm:col-span-2 md:col-span-1 lg:col-span-3">
            <label className="text-xs font-semibold text-slate-600">3. Description</label>
            <input
              type="text"
              placeholder="e.g. Rent, Weekly Grocery, Coffee..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              required
              className={`w-full rounded-lg border px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-hidden ${inputCellClass}`}
            />
          </div>

          {/* 4. Payment Method */}
          <div className="space-y-1 sm:col-span-1 lg:col-span-2">
            <label className="text-xs font-semibold text-slate-600">4. Payment Method</label>
            <select
              value={newPaymentMethod}
              onChange={(e) => setNewPaymentMethod(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-hidden ${inputCellClass}`}
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Amount */}
          <div className="flex gap-2 sm:col-span-1 md:col-span-2 lg:col-span-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-slate-600">5. Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                required
                className={`w-full rounded-lg border px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-hidden ${inputCellClass}`}
              />
            </div>

            <button
              type="submit"
              className="mt-auto inline-flex items-center justify-center gap-1 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 cursor-pointer h-[34px]"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          </div>
        </form>
      </div>

      {/* Primary Table: tbl_Expenses */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-800">
              Expense Transactions Ledger
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
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-auto rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-hidden"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-hidden"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Payment Method Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-hidden"
            >
              <option value="All">All Payment Types</option>
              {paymentMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* The Exact Table with Required Columns:
            1. Transaction Date
            2. Category
            3. Description
            4. Payment Method
            5. Amount
        */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="border-b border-slate-200 bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-32">1. Transaction Date</th>
                <th className="px-4 py-3 w-40">2. Category</th>
                <th className="px-4 py-3">3. Description</th>
                <th className="px-4 py-3 w-36">4. Payment Method</th>
                <th className="px-4 py-3 w-36 text-right">5. Amount</th>
                <th className="px-3 py-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No expense transactions found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    onClick={() =>
                      onSelectCell({
                        reference: `tbl_Expenses[Amount][${idx + 1}]`,
                        value: formatCurrency(tx.amount, settings.currency),
                        isCalculated: false,
                      })
                    }
                    className="hover:bg-rose-50/40 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-slate-600">
                      {formatDate(tx.date, settings.dateFormat)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 border border-slate-200">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {tx.description}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 font-medium border border-blue-100">
                        <CreditCard className="h-3 w-3" />
                        {tx.paymentMethod}
                      </span>
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
                    reference: 'tbl_Expenses[[#Totals],[Amount]]',
                    value: formatCurrency(totalExpenses, settings.currency),
                    formula: '=SUM(tbl_Expenses[Amount])',
                    isCalculated: true,
                  })
                }
                className="cursor-pointer hover:bg-slate-100/80"
              >
                <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-700">
                  Total Expenses:
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-extrabold text-rose-700">
                  {formatCurrency(totalExpenses, settings.currency)}
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
