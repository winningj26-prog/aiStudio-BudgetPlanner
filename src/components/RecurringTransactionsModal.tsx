import React, { useState } from 'react';
import {
  CategoryItem,
  ExpenseTransaction,
  IncomeTransaction,
  RecurringTransaction,
  SettingsState,
} from '../types/budget';
import { formatCurrency } from '../utils/formatters';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  Edit2,
  FileSpreadsheet,
  Filter,
  Layers,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Repeat,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

interface RecurringTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurringTransactions: RecurringTransaction[];
  onUpdateRecurringTransactions: (rules: RecurringTransaction[]) => void;
  incomeCategories: CategoryItem[];
  expenseCategories: CategoryItem[];
  paymentMethods: string[];
  settings: SettingsState;
  incomeTransactions: IncomeTransaction[];
  expenseTransactions: ExpenseTransaction[];
  onAddIncomeTransactions: (txs: IncomeTransaction[]) => void;
  onAddExpenseTransactions: (txs: ExpenseTransaction[]) => void;
  initialTypeFilter?: 'all' | 'income' | 'expense';
}

export const RecurringTransactionsModal: React.FC<RecurringTransactionsModalProps> = ({
  isOpen,
  onClose,
  recurringTransactions,
  onUpdateRecurringTransactions,
  incomeCategories,
  expenseCategories,
  paymentMethods,
  settings,
  incomeTransactions,
  expenseTransactions,
  onAddIncomeTransactions,
  onAddExpenseTransactions,
  initialTypeFilter = 'all',
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>(initialTypeFilter);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringTransaction | null>(null);
  const [postNotice, setPostNotice] = useState<{ message: string; count: number } | null>(null);

  // Form states
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState(paymentMethods[0] || 'Bank');
  const [formDayOfMonth, setFormDayOfMonth] = useState<number>(1);
  const [formFrequency, setFormFrequency] = useState<'monthly' | 'bi-weekly' | 'weekly' | 'yearly'>('monthly');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formNotes, setFormNotes] = useState('');

  if (!isOpen) return null;

  // Month lookup for posting
  const MONTH_MAP: Record<string, string> = {
    January: '01',
    February: '02',
    March: '03',
    April: '04',
    May: '05',
    June: '06',
    July: '07',
    August: '08',
    September: '09',
    October: '10',
    November: '11',
    December: '12',
  };

  const currentMonthNum = MONTH_MAP[settings.month] || '01';

  // Monthly sums
  const activeIncomeRules = recurringTransactions.filter((r) => r.type === 'income' && r.isActive);
  const activeExpenseRules = recurringTransactions.filter((r) => r.type === 'expense' && r.isActive);
  const monthlyRecurringIncome = activeIncomeRules.reduce((sum, r) => sum + r.amount, 0);
  const monthlyRecurringExpense = activeExpenseRules.reduce((sum, r) => sum + r.amount, 0);
  const netMonthlyRecurring = monthlyRecurringIncome - monthlyRecurringExpense;

  // Filtered rules
  const displayedRules = recurringTransactions.filter((r) => {
    if (activeTab === 'income') return r.type === 'income';
    if (activeTab === 'expense') return r.type === 'expense';
    return true;
  });

  // Open Form to Add
  const handleOpenAdd = (type: 'income' | 'expense' = 'expense') => {
    setEditingRule(null);
    setFormType(type);
    setFormDescription('');
    setFormAmount('');
    const defaultCat =
      type === 'income'
        ? incomeCategories[0]?.name || 'Salary'
        : expenseCategories[0]?.name || 'Housing';
    setFormCategory(defaultCat);
    setFormPaymentMethod(paymentMethods[0] || 'Bank');
    setFormDayOfMonth(1);
    setFormFrequency('monthly');
    setFormIsActive(true);
    setFormNotes('');
    setIsFormOpen(true);
  };

  // Open Form to Edit
  const handleOpenEdit = (rule: RecurringTransaction) => {
    setEditingRule(rule);
    setFormType(rule.type);
    setFormDescription(rule.description);
    setFormAmount(String(rule.amount));
    setFormCategory(rule.category);
    setFormPaymentMethod(rule.paymentMethod || paymentMethods[0] || 'Bank');
    setFormDayOfMonth(rule.dayOfMonth);
    setFormFrequency(rule.frequency);
    setFormIsActive(rule.isActive);
    setFormNotes(rule.notes || '');
    setIsFormOpen(true);
  };

  // Save Rule
  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(formAmount) || 0;
    if (!formDescription.trim() || amountVal <= 0) return;

    if (editingRule) {
      const updated = recurringTransactions.map((r) =>
        r.id === editingRule.id
          ? {
              ...r,
              type: formType,
              description: formDescription.trim(),
              amount: amountVal,
              category: formCategory,
              paymentMethod: formType === 'expense' ? formPaymentMethod : undefined,
              dayOfMonth: Math.min(31, Math.max(1, formDayOfMonth)),
              frequency: formFrequency,
              isActive: formIsActive,
              notes: formNotes.trim() || undefined,
            }
          : r
      );
      onUpdateRecurringTransactions(updated);
    } else {
      const newRule: RecurringTransaction = {
        id: `rec_${Date.now()}`,
        type: formType,
        description: formDescription.trim(),
        amount: amountVal,
        category: formCategory,
        paymentMethod: formType === 'expense' ? formPaymentMethod : undefined,
        dayOfMonth: Math.min(31, Math.max(1, formDayOfMonth)),
        frequency: formFrequency,
        isActive: formIsActive,
        notes: formNotes.trim() || undefined,
      };
      onUpdateRecurringTransactions([...recurringTransactions, newRule]);
    }

    setIsFormOpen(false);
  };

  // Toggle rule active status
  const handleToggleActive = (ruleId: string) => {
    const updated = recurringTransactions.map((r) =>
      r.id === ruleId ? { ...r, isActive: !r.isActive } : r
    );
    onUpdateRecurringTransactions(updated);
  };

  // Delete rule
  const handleDeleteRule = (ruleId: string, desc: string) => {
    if (window.confirm(`Delete recurring rule "${desc}"?`)) {
      onUpdateRecurringTransactions(recurringTransactions.filter((r) => r.id !== ruleId));
    }
  };

  // One-click post / generate transactions for active month
  const handlePostToActiveMonth = () => {
    const targetRules = recurringTransactions.filter((r) => {
      if (!r.isActive) return false;
      if (activeTab === 'income') return r.type === 'income';
      if (activeTab === 'expense') return r.type === 'expense';
      return true;
    });

    const newIncomes: IncomeTransaction[] = [];
    const newExpenses: ExpenseTransaction[] = [];
    let postedCount = 0;

    targetRules.forEach((rule) => {
      const dayPadded = String(Math.min(28, rule.dayOfMonth)).padStart(2, '0');
      const targetDate = `${settings.year}-${currentMonthNum}-${dayPadded}`;

      if (rule.type === 'income') {
        // Check if already posted for this recurring rule in current month
        const alreadyExists = incomeTransactions.some(
          (t) =>
            t.recurringId === rule.id ||
            (t.description.toLowerCase() === rule.description.toLowerCase() &&
              t.date.startsWith(`${settings.year}-${currentMonthNum}`))
        );

        if (!alreadyExists) {
          newIncomes.push({
            id: `inc_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            date: targetDate,
            category: rule.category,
            description: rule.description,
            amount: rule.amount,
            recurringId: rule.id,
            isRecurring: true,
          });
          postedCount++;
        }
      } else {
        // Expense check
        const alreadyExists = expenseTransactions.some(
          (t) =>
            t.recurringId === rule.id ||
            (t.description.toLowerCase() === rule.description.toLowerCase() &&
              t.date.startsWith(`${settings.year}-${currentMonthNum}`))
        );

        if (!alreadyExists) {
          newExpenses.push({
            id: `exp_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            date: targetDate,
            category: rule.category,
            description: rule.description,
            paymentMethod: rule.paymentMethod || 'Bank',
            amount: rule.amount,
            recurringId: rule.id,
            isRecurring: true,
          });
          postedCount++;
        }
      }
    });

    if (newIncomes.length > 0) {
      onAddIncomeTransactions([...incomeTransactions, ...newIncomes]);
    }
    if (newExpenses.length > 0) {
      onAddExpenseTransactions([...expenseTransactions, ...newExpenses]);
    }

    if (postedCount > 0) {
      setPostNotice({
        message: `Generated and posted ${postedCount} recurring ${
          postedCount === 1 ? 'transaction' : 'transactions'
        } into the ${settings.month} ${settings.year} ledgers!`,
        count: postedCount,
      });
    } else {
      setPostNotice({
        message: `All active recurring transactions have already been generated for ${settings.month} ${settings.year}. No duplicates created.`,
        count: 0,
      });
    }

    setTimeout(() => {
      setPostNotice(null);
    }, 4500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-50/70 via-white to-slate-50 p-4 sm:p-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                  Recurring Transaction Module
                </h3>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                  Automation
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Define repeating monthly revenues and expenses to auto-populate into your ledgers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback Alert Notice */}
        {postNotice && (
          <div
            className={`mx-4 sm:mx-6 mt-4 flex items-center gap-2.5 rounded-xl p-3 text-xs font-semibold border animate-in fade-in ${
              postNotice.count > 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{postNotice.message}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Top Recurring Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/60 p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800 uppercase text-[10px] tracking-wider">
                  Recurring Income
                </span>
                <Coins className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <div className="mt-1 text-base sm:text-lg font-black text-emerald-950">
                {formatCurrency(monthlyRecurringIncome, settings.currency)}/mo
              </div>
              <div className="text-[11px] text-emerald-700 mt-0.5">
                {activeIncomeRules.length} active income {activeIncomeRules.length === 1 ? 'rule' : 'rules'}
              </div>
            </div>

            <div className="rounded-xl border border-rose-200/90 bg-rose-50/60 p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-rose-800 uppercase text-[10px] tracking-wider">
                  Recurring Expenses
                </span>
                <CreditCard className="h-3.5 w-3.5 text-rose-600" />
              </div>
              <div className="mt-1 text-base sm:text-lg font-black text-rose-950">
                {formatCurrency(monthlyRecurringExpense, settings.currency)}/mo
              </div>
              <div className="text-[11px] text-rose-700 mt-0.5">
                {activeExpenseRules.length} active expense {activeExpenseRules.length === 1 ? 'rule' : 'rules'}
              </div>
            </div>

            <div className="rounded-xl border border-blue-200/90 bg-blue-50/60 p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-800 uppercase text-[10px] tracking-wider">
                  Net Recurring Cashflow
                </span>
                <Repeat className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div
                className={`mt-1 text-base sm:text-lg font-black ${
                  netMonthlyRecurring >= 0 ? 'text-blue-950' : 'text-rose-950'
                }`}
              >
                {formatCurrency(netMonthlyRecurring, settings.currency)}/mo
              </div>
              <div className="text-[11px] text-blue-700 mt-0.5">
                {netMonthlyRecurring >= 0 ? 'Surplus buffer' : 'Deficit buffer'}
              </div>
            </div>
          </div>

          {/* Action Toolbar: Filter Tabs, Post to Ledger Button, Add New Rule */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {/* Filter Tabs */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`rounded-lg px-3 py-1 transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                All Schedules ({recurringTransactions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('income')}
                className={`rounded-lg px-3 py-1 transition-all cursor-pointer ${
                  activeTab === 'income'
                    ? 'bg-white text-teal-800 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Income ({activeIncomeRules.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('expense')}
                className={`rounded-lg px-3 py-1 transition-all cursor-pointer ${
                  activeTab === 'expense'
                    ? 'bg-white text-rose-800 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Expenses ({activeExpenseRules.length})
              </button>
            </div>

            {/* Right Buttons: Generate / Post & Add Rule */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePostToActiveMonth}
                title={`Generate transactions for ${settings.month} ${settings.year} without duplicates`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Post to {settings.month}</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAdd(activeTab === 'income' ? 'income' : 'expense')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-600" />
                <span>New Rule</span>
              </button>
            </div>
          </div>

          {/* Table / List of Recurring Schedules */}
          {displayedRules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <Repeat className="mx-auto h-9 w-9 text-slate-300" />
              <h4 className="mt-2 text-sm font-bold text-slate-700">No recurring rules found</h4>
              <p className="text-xs text-slate-500 mt-1">
                Create a recurring salary, rent, utility or subscription schedule to save time.
              </p>
              <button
                type="button"
                onClick={() => handleOpenAdd('expense')}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Rule</span>
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[620px]">
                  <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-3.5 py-2.5 w-20">Type</th>
                      <th className="px-3.5 py-2.5">Description</th>
                      <th className="px-3.5 py-2.5 w-36">Category</th>
                      <th className="px-3.5 py-2.5 w-28">Repeat Day</th>
                      <th className="px-3.5 py-2.5 w-32 text-right">Amount</th>
                      <th className="px-3.5 py-2.5 w-20 text-center">Status</th>
                      <th className="px-3 py-2.5 w-20 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedRules.map((rule) => {
                      const isIncome = rule.type === 'income';

                      return (
                        <tr
                          key={rule.id}
                          className={`hover:bg-blue-50/30 transition-colors ${
                            !rule.isActive ? 'opacity-50 bg-slate-50/50' : ''
                          }`}
                        >
                          {/* Type */}
                          <td className="px-3.5 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                                isIncome
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {isIncome ? 'Income' : 'Expense'}
                            </span>
                          </td>

                          {/* Description */}
                          <td className="px-3.5 py-3 font-semibold text-slate-900">
                            <div>{rule.description}</div>
                            {rule.notes && (
                              <div className="text-[11px] text-slate-400 font-normal">{rule.notes}</div>
                            )}
                          </td>

                          {/* Category & Payment Method */}
                          <td className="px-3.5 py-3 text-slate-600">
                            <div className="font-medium">{rule.category}</div>
                            {rule.paymentMethod && (
                              <div className="text-[10px] text-slate-400">via {rule.paymentMethod}</div>
                            )}
                          </td>

                          {/* Repeat Day */}
                          <td className="px-3.5 py-3">
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span>Day {rule.dayOfMonth}</span>
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="px-3.5 py-3 text-right">
                            <span
                              className={`font-black text-sm ${
                                isIncome ? 'text-teal-700' : 'text-slate-900'
                              }`}
                            >
                              {isIncome ? '+' : '-'}
                              {formatCurrency(rule.amount, settings.currency)}
                            </span>
                          </td>

                          {/* Active Toggle */}
                          <td className="px-3.5 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(rule.id)}
                              className={`rounded-full p-1 transition-colors cursor-pointer ${
                                rule.isActive
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-slate-300 hover:bg-slate-100'
                              }`}
                              title={rule.isActive ? 'Active rule (Click to pause)' : 'Paused (Click to activate)'}
                            >
                              <Power className="h-4 w-4" />
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(rule)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                                title="Edit rule"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRule(rule.id, rule.description)}
                                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                title="Delete rule"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* Sub-Modal / Drawer: Add / Edit Recurring Rule */}
        {/* ---------------------------------------------------- */}
        {isFormOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <Repeat className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingRule ? 'Edit Recurring Schedule' : 'Create Recurring Schedule'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRule} className="space-y-3.5 text-xs">
                {/* Type Selection */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transaction Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormType('income');
                        if (!editingRule) {
                          setFormCategory(incomeCategories[0]?.name || 'Salary');
                        }
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 font-bold cursor-pointer transition-all ${
                        formType === 'income'
                          ? 'border-teal-600 bg-teal-50 text-teal-800 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Coins className="h-4 w-4 text-teal-600" />
                      <span>Income Deposit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormType('expense');
                        if (!editingRule) {
                          setFormCategory(expenseCategories[0]?.name || 'Housing');
                        }
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 font-bold cursor-pointer transition-all ${
                        formType === 'expense'
                          ? 'border-rose-600 bg-rose-50 text-rose-800 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard className="h-4 w-4 text-rose-600" />
                      <span>Expense Payment</span>
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monthly Salary, Rent, Netflix, Electric Bill..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Category & Amount */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Category *</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-hidden cursor-pointer"
                    >
                      {(formType === 'income' ? incomeCategories : expenseCategories)
                        .filter((c) => c.isActive)
                        .map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Amount ({settings.currency}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Payment Method (if expense) & Day of Month */}
                <div className="grid grid-cols-2 gap-3">
                  {formType === 'expense' ? (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                      <select
                        value={formPaymentMethod}
                        onChange={(e) => setFormPaymentMethod(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-hidden cursor-pointer"
                      >
                        {paymentMethods.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Frequency</label>
                      <select
                        value={formFrequency}
                        onChange={(e) => setFormFrequency(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-hidden cursor-pointer"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="bi-weekly">Bi-weekly</option>
                        <option value="weekly">Weekly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Day of Month (1 - 31)</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={formDayOfMonth}
                      onChange={(e) => setFormDayOfMonth(parseInt(e.target.value, 10) || 1)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Active Switch */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="rule-active-toggle"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="rule-active-toggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Enable and auto-generate this recurring transaction
                  </label>
                </div>

                {/* Notes */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Autopay active, due on the 1st..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>{editingRule ? 'Update Rule' : 'Save Rule'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 sm:px-6 py-3 shrink-0">
          <div className="text-xs text-slate-500">
            Active period: <strong className="text-slate-800">{settings.month} {settings.year}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-200 hover:bg-slate-300 px-4 py-1.5 text-xs font-bold text-slate-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
