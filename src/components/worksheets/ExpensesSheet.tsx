import React, { useEffect, useState } from 'react';
import {
  CategoryItem,
  ExpenseTransaction,
  IncomeTransaction,
  RecurringTransaction,
  SettingsState,
} from '../../types/budget';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { sumExpenseTransactions } from '../../utils/formulas';
import { KPICard } from '../KPICard';
import { RecurringTransactionsModal } from '../RecurringTransactionsModal';
import {
  ArrowDownRight,
  Calculator,
  Calendar,
  CreditCard,
  Flame,
  Hash,
  Layers,
  Plus,
  Pencil,
  Receipt,
  RefreshCw,
  Repeat,
  Search,
  Sparkles,
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
  recurringTransactions?: RecurringTransaction[];
  onUpdateRecurringTransactions?: (rules: RecurringTransaction[]) => void;
}

export const ExpensesSheet: React.FC<ExpensesSheetProps> = ({
  transactions,
  onUpdateTransactions,
  categories,
  paymentMethods,
  settings,
  highlightInputs,
  onSelectCell,
  recurringTransactions = [],
  onUpdateRecurringTransactions,
}) => {
  const monthNumber = ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(settings.month) + 1;
  const activePeriodStart = `${settings.year}-${String(monthNumber).padStart(2, '0')}-01`;
  const [newDate, setNewDate] = useState(activePeriodStart);
  const [newCategory, setNewCategory] = useState(categories[0]?.name || 'Housing');
  const [newDescription, setNewDescription] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState(paymentMethods[0] || 'Credit Card');
  const [newAmount, setNewAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!editingId) setNewDate(activePeriodStart);
  }, [activePeriodStart, editingId]);

  const totalExpenses = sumExpenseTransactions(transactions);
  const txCount = transactions.length;
  const avgExpense = txCount > 0 ? totalExpenses / txCount : 0;

  const monthIndex = ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(settings.month);
  const previousMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;
  const previousYear = monthIndex === 0 ? settings.year - 1 : settings.year;
  const previousMonthTotal = sumExpenseTransactions(transactions.filter((tx) => {
    const d = new Date(`${tx.date}T00:00:00`);
    return d.getFullYear() === previousYear && d.getMonth() === previousMonthIndex;
  }));
  const expenseTrendPercent = previousMonthTotal > 0 ? ((totalExpenses - previousMonthTotal) / previousMonthTotal) * 100 : null;
  
  const largestTx = transactions.reduce((max, tx) => (tx.amount > max.amount ? tx : max), {
    amount: 0,
    category: 'None',
    description: 'None',
  } as ExpenseTransaction);

  // Recurring statistics
  const activeExpenseRules = recurringTransactions.filter((r) => r.type === 'expense' && r.isActive);
  const monthlyRecurringExpense = activeExpenseRules.reduce((sum, r) => sum + r.amount, 0);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    if (editingId) {
      onUpdateTransactions(transactions.map((tx) =>
        tx.id === editingId
          ? { ...tx, date: newDate, category: newCategory, description: newDescription.trim() || 'Expense', paymentMethod: newPaymentMethod, amount: amountNum }
          : tx
      ));
      setEditingId(null);
      setNewDescription('');
      setNewAmount('');
      return;
    }

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

  const handleEditTransaction = (tx: ExpenseTransaction) => {
    setEditingId(tx.id);
    setNewDate(tx.date);
    setNewCategory(tx.category);
    setNewDescription(tx.description);
    setNewPaymentMethod(tx.paymentMethod);
    setNewAmount(String(tx.amount));
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

  const filteredTotal = filteredTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);

  const inputCellClass = highlightInputs
    ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300/40'
    : 'bg-white border-slate-300';

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ---------------------------------------------------- */}
      {/* Header Banner */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              4. Expense Transactions
            </h2>
            <span className="rounded-md bg-rose-100 px-2.5 py-0.5 font-mono text-xs font-bold text-rose-800 border border-rose-200">
              tbl_Expenses
            </span>
          </div>
          <p className="text-xs text-slate-500 sm:text-sm">
            Record all outbound expenditures and payments for {settings.month} {settings.year}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600 shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Active Period: <strong>{settings.month} {settings.year}</strong></span>
          </div>

          {/* Quick Recurring Manager Trigger */}
          {onUpdateRecurringTransactions && (
            <button
              type="button"
              onClick={() => setIsRecurringModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100/80 px-2.5 py-1 font-bold text-rose-800 shadow-2xs transition-all cursor-pointer"
            >
              <Repeat className="h-3.5 w-3.5 text-rose-600" />
              <span>Recurring Rules</span>
              <span className="rounded-full bg-rose-200/80 px-1.5 py-0.2 text-[10px] font-black text-rose-900">
                {activeExpenseRules.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* KPI Cards: Total Expenses, Transaction Count, Largest Expense */}
      {/* ---------------------------------------------------- */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <KPICard
          title="Total Expenses"
          value={formatCurrency(totalExpenses, settings.currency)}
          subtitle="Sum of recorded spending"
          icon={<Receipt className="h-5 w-5" />}
          theme="red"
          trend={{ text: expenseTrendPercent === null ? 'No prior-month data' : `${expenseTrendPercent >= 0 ? '↑' : '↓'} ${Math.abs(expenseTrendPercent).toFixed(1)}% vs. last month`, isPositive: expenseTrendPercent === null ? true : expenseTrendPercent <= 0 }}
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
          title="Transaction Count"
          value={String(txCount)}
          subtitle="Total receipts logged"
          icon={<Hash className="h-5 w-5" />}
          theme="blue"
          onClick={() =>
            onSelectCell({
              reference: 'Expenses!Summary_Count',
              value: String(txCount),
              formula: '=COUNTA(tbl_Expenses[Description])',
              isCalculated: true,
            })
          }
        />

        <KPICard
          title="Largest Single Expense"
          value={formatCurrency(largestTx.amount, settings.currency)}
          subtitle={`${largestTx.category}: ${largestTx.description}`}
          icon={<Flame className="h-5 w-5" />}
          theme="orange"
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

      {/* ---------------------------------------------------- */}
      {/* Recurring Expense Automation Capsule Banner */}
      {/* ---------------------------------------------------- */}
      {onUpdateRecurringTransactions && (
        <div className="rounded-xl border border-rose-200/80 bg-gradient-to-r from-rose-50/80 via-white to-amber-50/50 p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white shadow-2xs shrink-0">
              <Repeat className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900">
                  Recurring Expense Schedules
                </span>
                <span className="rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5">
                  {formatCurrency(monthlyRecurringExpense, settings.currency)}/mo scheduled
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {activeExpenseRules.length} repeating bills (rent, utilities, subscriptions) can be auto-posted into your ledger.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsRecurringModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 px-3 py-1.5 text-xs font-bold text-white shadow-2xs cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Post to {settings.month}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRecurringModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer"
            >
              <span>Manage Schedules</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Add New Expense Form Card */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Log New Expense Transaction
          </h3>
          <span className="text-xs text-slate-400">
            Auto-formatted to currency standard
          </span>
        </div>

        <form onSubmit={handleAddTransaction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 items-end">
          {/* 1. Date */}
          <div className="space-y-1 sm:col-span-1 lg:col-span-2">
            <label className="text-xs font-semibold text-slate-600">1. Date</label>
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
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <label className="text-xs font-semibold text-slate-600">3. Description</label>
            <input
              type="text"
              placeholder="e.g. Grocery trip, Monthly rent..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              required
              className={`w-full rounded-lg border px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-hidden ${inputCellClass}`}
            />
          </div>

          {/* 4. Payment Method */}
          <div className="space-y-1 sm:col-span-1 lg:col-span-2">
            <label className="text-xs font-semibold text-slate-600">4. Payment</label>
            <select
              value={newPaymentMethod}
              onChange={(e) => setNewPaymentMethod(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-hidden ${inputCellClass}`}
            >
              {paymentMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Amount */}
          <div className="flex gap-2 sm:col-span-1 lg:col-span-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-slate-600">5. Amount</label>
              <div className="relative">
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
            </div>

            <button
              type="submit"
              className="mt-auto inline-flex items-center justify-center gap-1 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 cursor-pointer h-[34px]"
            >
              {editingId ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>{editingId ? 'Save' : 'Add'}</span>
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setNewDescription('');
                  setNewAmount('');
                }}
                className="mt-auto inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer h-[34px]"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Enhanced Google Spreadsheet Table: tbl_Expenses */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-slate-300 bg-white shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#f8f9fa] p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900">
                Expense Transactions Ledger
              </span>
              <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-rose-900 border border-rose-200">
                tbl_Expenses
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-300 text-xs text-slate-500">
              <span>Count: <strong className="text-slate-800">{filteredTransactions.length}</strong></span>
              <span>•</span>
              <span>Total: <strong className="text-rose-700">{formatCurrency(filteredTotal, settings.currency)}</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search rows..."
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

            {/* Payment Filter */}
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

        {/* The Exact Google Spreadsheet Table with Column Letters Header & Row Numbers Gutter */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px] border-collapse">
            {/* Google Sheets Header: Column Letters Row (A, B, C, D, E, F) */}
            <thead>
              <tr className="bg-[#f1f3f4] text-slate-500 font-semibold text-[11px] select-none border-b border-slate-300">
                <th className="w-10 px-1 py-1 text-center border-r border-slate-300 font-mono text-[10px]">
                  #
                </th>
                <th className="w-32 px-3 py-1 text-center border-r border-slate-300 tracking-wider">
                  A
                </th>
                <th className="w-40 px-3 py-1 text-center border-r border-slate-300 tracking-wider">
                  B
                </th>
                <th className="px-3 py-1 text-center border-r border-slate-300 tracking-wider">
                  C
                </th>
                <th className="w-36 px-3 py-1 text-center border-r border-slate-300 tracking-wider">
                  D
                </th>
                <th className="w-36 px-3 py-1 text-center border-r border-slate-300 tracking-wider">
                  E
                </th>
                <th className="w-16 px-2 py-1 text-center tracking-wider">
                  F
                </th>
              </tr>

              {/* Data Column Names Header */}
              <tr className="border-b border-slate-300 bg-[#f8f9fa] text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-2 py-2.5 w-10 text-center border-r border-slate-300 bg-[#eef1f4]">
                  •
                </th>
                <th className="px-3 py-2.5 w-32 border-r border-slate-300">
                  1. Date
                </th>
                <th className="px-3 py-2.5 w-40 border-r border-slate-300">
                  2. Category
                </th>
                <th className="px-3 py-2.5 border-r border-slate-300">
                  3. Description
                </th>
                <th className="px-3 py-2.5 w-36 border-r border-slate-300">
                  4. Payment
                </th>
                <th className="px-3 py-2.5 w-36 text-right border-r border-slate-300">
                  5. Amount
                </th>
                <th className="px-2 py-2.5 w-16 text-center">
                  Action
                </th>
              </tr>
            </thead>

            {/* Google Sheets Data Rows with Row Number Gutter */}
            <tbody className="divide-y divide-slate-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 bg-white">
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
                        formula: `=tbl_Expenses[@Amount]`,
                        isCalculated: false,
                      })
                    }
                    className="hover:bg-rose-50/50 transition-colors cursor-pointer group"
                  >
                    {/* Google Sheets Row Number Gutter */}
                    <td className="w-10 px-1 py-2.5 text-center font-mono text-[11px] text-slate-400 bg-[#f8f9fa] border-r border-slate-200 select-none group-hover:bg-rose-100/70 group-hover:text-rose-900 group-hover:font-bold transition-colors">
                      {idx + 1}
                    </td>

                    {/* Column A: Date */}
                    <td className="px-3 py-2.5 font-medium text-slate-600 border-r border-slate-200/80 font-mono text-[11px]">
                      {formatDate(tx.date, settings.dateFormat)}
                    </td>

                    {/* Column B: Category */}
                    <td className="px-3 py-2.5 border-r border-slate-200/80">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 border border-slate-200">
                        {tx.category}
                      </span>
                    </td>

                    {/* Column C: Description with Recurring badge if applicable */}
                    <td className="px-3 py-2.5 font-medium text-slate-800 border-r border-slate-200/80">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{tx.description}</span>
                        {(tx.isRecurring || tx.recurringId) && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded bg-blue-50 border border-blue-200 px-1.5 py-0.2 text-[10px] font-bold text-blue-700"
                            title="Auto-generated from Recurring Expense schedule"
                          >
                            <Repeat className="h-3 w-3" />
                            <span>Auto</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Column D: Payment Method */}
                    <td className="px-3 py-2.5 border-r border-slate-200/80">
                      <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 font-medium border border-blue-100">
                        <CreditCard className="h-3 w-3" />
                        <span>{tx.paymentMethod}</span>
                      </span>
                    </td>

                    {/* Column E: Amount */}
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 border-r border-slate-200/80 tabular-nums">
                      {formatCurrency(tx.amount, settings.currency)}
                    </td>

                    {/* Column F: Action */}
                    <td className="px-2 py-2.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTransaction(tx);
                        }}
                        className="mr-2 text-slate-400 hover:text-blue-600 cursor-pointer p-1 rounded hover:bg-blue-50"
                        title="Edit transaction"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTransaction(tx.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer p-1 rounded hover:bg-rose-50"
                        title="Delete transaction"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Google Sheets Totals Row */}
            <tfoot className="border-t-2 border-slate-300 bg-[#f8f9fa] font-bold">
              <tr
                onClick={() =>
                  onSelectCell({
                    reference: 'tbl_Expenses[[#Totals],[Amount]]',
                    value: formatCurrency(totalExpenses, settings.currency),
                    formula: '=SUM(tbl_Expenses[Amount])',
                    isCalculated: true,
                  })
                }
                className="cursor-pointer hover:bg-slate-100/90 transition-colors"
              >
                <td className="w-10 px-1 py-3 text-center font-mono text-[11px] text-rose-800 bg-[#eef1f4] border-r border-slate-300 font-extrabold">
                  ∑
                </td>
                <td colSpan={4} className="px-3 py-3 text-right text-xs uppercase tracking-wider text-slate-700 border-r border-slate-300">
                  Total Expenses ({filteredTransactions.length} items):
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm font-black text-rose-700 border-r border-slate-300 tabular-nums">
                  {formatCurrency(filteredTotal, settings.currency)}
                </td>
                <td className="px-2 py-3 text-center">
                  <span className="font-mono text-[10px] text-slate-400" title="SUM Formula">
                    fx
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Recurring Transactions Modal */}
      {/* ---------------------------------------------------- */}
      {onUpdateRecurringTransactions && (
        <RecurringTransactionsModal
          isOpen={isRecurringModalOpen}
          onClose={() => setIsRecurringModalOpen(false)}
          recurringTransactions={recurringTransactions}
          onUpdateRecurringTransactions={onUpdateRecurringTransactions}
          incomeCategories={[]}
          expenseCategories={categories}
          paymentMethods={paymentMethods}
          settings={settings}
          incomeTransactions={[]}
          expenseTransactions={transactions}
          onAddIncomeTransactions={() => {}}
          onAddExpenseTransactions={onUpdateTransactions}
          initialTypeFilter="expense"
        />
      )}
    </div>
  );
};
