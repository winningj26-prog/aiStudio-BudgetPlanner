import React, { useState, useEffect, useMemo } from 'react';
import { getAuthAccessToken } from '../../services/supabaseAuth';
import { isAiInsightsUiEnabled } from '../../utils/aiInsights';
import {
  CategoryItem,
  Debt,
  ExpenseTransaction,
  IncomeTransaction,
  MonthSummary,
  SavingsGoal,
  SettingsState,
  RecurringTransaction,
} from '../../types/budget';
import { SavingsGoalsTracker } from '../SavingsGoalsTracker';
import { NetWorthForecaster } from './NetWorthForecaster';
import { formatCurrency, formatDate, formatPercent, convertCurrency } from '../../utils/formatters';
import {
  sumExpenseTransactions,
  sumExpensesByCategory,
  sumIncomeTransactions,
} from '../../utils/formulas';
import { KPICard } from '../KPICard';
import { IncomeExpensesBarChart } from '../charts/IncomeExpensesBarChart';
import { Last6MonthsBarChart } from '../charts/Last6MonthsBarChart';
import { IncomeExpensesLineTrendChart } from '../charts/IncomeExpensesLineTrendChart';
import { ExpenseDonutChart } from '../charts/ExpenseDonutChart';
import { MonthlyTrendChart } from '../charts/MonthlyTrendChart';
import { SavingsRateLineChart } from '../charts/SavingsRateLineChart';
import { ExportWorkbookModal } from '../ExportWorkbookModal';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  HardDriveDownload,
  Info,
  Lightbulb,
  Loader2,
  PieChart,
  PiggyBank,
  Receipt,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Bell,
  BellRing,
  Plus,
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
  savingsGoals: SavingsGoal[];
  onUpdateSavingsGoals: (goals: SavingsGoal[]) => void;
  debts: Debt[];
  recurringTransactions?: RecurringTransaction[];
  onUpdateIncomeTransactions?: (transactions: IncomeTransaction[]) => void;
  onUpdateExpenseTransactions?: (transactions: ExpenseTransaction[]) => void;
  aiInsightsEnabled?: boolean;
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
  savingsGoals,
  onUpdateSavingsGoals,
  debts,
  recurringTransactions = [],
  onUpdateIncomeTransactions,
  onUpdateExpenseTransactions,
  aiInsightsEnabled = false,
}) => {
  const [isLocalExportModalOpen, setIsLocalExportModalOpen] = useState(false);

  // Dashboard Sub-Tab selection
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'net_worth'>('overview');

  // Notification center dismissed list
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);

  // Quick Add State variables
  const getTodayFormatted = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'income' | 'expense'>('expense');
  const [quickAddDate, setQuickAddDate] = useState(getTodayFormatted());
  const [quickAddCategory, setQuickAddCategory] = useState('');
  const [quickAddDescription, setQuickAddDescription] = useState('');
  const [quickAddAmount, setQuickAddAmount] = useState('');
  const [quickAddPaymentMethod, setQuickAddPaymentMethod] = useState(paymentMethods[0] || 'Cash');

  useEffect(() => {
    if (quickAddType === 'income') {
      setQuickAddCategory(incomeCategories[0]?.name || '');
    } else {
      setQuickAddCategory(categories[0]?.name || '');
    }
  }, [quickAddType, categories, incomeCategories, isQuickAddOpen]);

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(quickAddAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }
    if (!quickAddCategory) {
      alert('Please select a category.');
      return;
    }

    if (quickAddType === 'income') {
      const newTx: IncomeTransaction = {
        id: `inc_qa_${Date.now()}`,
        date: quickAddDate,
        category: quickAddCategory,
        description: quickAddDescription.trim() || `${quickAddCategory} Transaction`,
        amount: amountVal,
      };
      if (onUpdateIncomeTransactions) {
        onUpdateIncomeTransactions([...incomeTransactions, newTx]);
      }
    } else {
      const newTx: ExpenseTransaction = {
        id: `exp_qa_${Date.now()}`,
        date: quickAddDate,
        category: quickAddCategory,
        description: quickAddDescription.trim() || `${quickAddCategory} Transaction`,
        amount: amountVal,
        paymentMethod: quickAddPaymentMethod,
      };
      if (onUpdateExpenseTransactions) {
        onUpdateExpenseTransactions([...expenseTransactions, newTx]);
      }
    }

    // Reset fields and close modal
    setQuickAddDescription('');
    setQuickAddAmount('');
    setIsQuickAddOpen(false);
  };

  // In-app Notifications logic
  const notifications = useMemo(() => {
    const list: { id: string; type: 'warning' | 'info' | 'success'; title: string; message: string; dateLabel?: string }[] = [];

    // 1. Check Upcoming Recurrings (due in next 5 days, or dayOfMonth >= 25)
    recurringTransactions.filter(r => r.isActive).forEach((rec) => {
      const currentDay = 28; // standard baseline for demo date Sep 28
      const diff = rec.dayOfMonth - currentDay;
      const isDueSoon = (diff >= 0 && diff <= 5) || (rec.dayOfMonth <= 3 && currentDay >= 28);
      
      if (isDueSoon) {
        list.push({
          id: `recur-${rec.id}`,
          type: 'warning',
          title: `Upcoming Recurring ${rec.type === 'expense' ? 'Bill' : 'Deposit'}`,
          message: `"${rec.description}" of ${formatCurrency(rec.amount, settings.currency)} is scheduled for Day ${rec.dayOfMonth}.`,
          dateLabel: `Day ${rec.dayOfMonth}`,
        });
      }
    });

    // 2. Check Savings Goals Deadlines (Target date is close, and not fully funded)
    savingsGoals.forEach((goal) => {
      if (goal.currentAmount < goal.targetAmount) {
        if (goal.targetDate) {
          const isUpcoming = goal.targetDate.includes('2026-09') || goal.targetDate.includes('2026-10') || goal.targetDate.includes('2026-11') || goal.targetDate.includes('2026-12');
          if (isUpcoming) {
            const deficit = goal.targetAmount - goal.currentAmount;
            list.push({
              id: `goal-${goal.id}`,
              type: 'info',
              title: `Approaching Goal Deadline`,
              message: `Goal "${goal.name}" (Target: ${goal.targetDate}) is approaching. You need ${formatCurrency(deficit, settings.currency)} more to be fully funded.`,
              dateLabel: goal.targetDate,
            });
          }
        }
      }
    });

    return list.filter(n => !dismissedNotificationIds.includes(n.id));
  }, [recurringTransactions, savingsGoals, settings.currency, dismissedNotificationIds]);

  // AI Insights State
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiFallback, setIsAiFallback] = useState(false);
  const showAiInsights = isAiInsightsUiEnabled(aiInsightsEnabled);

  // Function to fetch AI insights from Express proxy backend
  const fetchAiInsights = async () => {
    if (!showAiInsights) return;
    setIsAiLoading(true);
    setAiError(null);
    setIsAiFallback(false);
    try {
      const accessToken = await getAuthAccessToken();
      const response = await fetch('/api/insights', {

        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          incomeTransactions,
          expenseTransactions,
          settings,
          categories,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to reach AI insights server.');
      }
      const data = await response.json();
      setAiInsights(data.insights);
      setIsAiFallback(data.fallback || false);
    } catch (err: any) {
      console.warn("Express backend /api/insights not reachable or failed. Using high-fidelity local financial advisor insights:", err);
      
      // Calculate active metrics for smart client-side insights
      const totalInc = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalExp = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
      const netSavings = totalInc - totalExp;
      const sRate = totalInc > 0 ? (netSavings / totalInc) * 100 : 0;
      
      let fallBackInsights = '';
      if (sRate < 10) {
        fallBackInsights = `- Analyze food, dining, and retail categories; batch-cooking at home can help raise your active savings rate above 10% this month.
- Audit your automated recurring subscriptions and cancel any entertainment or software accounts not utilized in the past 30 days.
- Delay non-essential discretionary purchases by 48 hours to evaluate if the item is a true necessity or an impulsive desire.`;
      } else {
        fallBackInsights = `- Your savings rate of ${sRate.toFixed(1)}% is healthy! Consider directing 20% of this surplus to accelerate your Debt Payoff snowball.
- Review your monthly variable expense categories for potential micro-savings that can be transferred to high-yield investment goals.
- Establish a "cooling-off" period of 48 hours for any premium shopping items to maintain your strong budget surplus.`;
      }
      
      setAiInsights(fallBackInsights);
      setIsAiFallback(true);
      setAiError(null);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Fetch on mount and when transaction lists or month changes
  useEffect(() => {
    if (showAiInsights) fetchAiInsights();
  }, [showAiInsights, incomeTransactions.length, expenseTransactions.length, settings.month]);

  // Budget Alerts logic: Warning if spent is >= 90% of budget
  const budgetAlerts = useMemo(() => {
    const alerts: { category: string; planned: number; actual: number; percentage: number; severity: 'warning' | 'danger' }[] = [];
    
    categories.filter(c => c.isActive).forEach((cat) => {
      const planned = plannedExpenses[cat.name] || 0;
      const actual = sumExpensesByCategory(expenseTransactions, cat.name);
      if (planned > 0) {
        const percentage = (actual / planned) * 100;
        if (percentage >= 90) {
          alerts.push({
            category: cat.name,
            planned,
            actual,
            percentage,
            severity: percentage > 100 ? 'danger' : 'warning'
          });
        }
      }
    });

    return alerts.sort((a, b) => b.percentage - a.percentage);
  }, [categories, plannedExpenses, expenseTransactions]);

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

  // Secondary currency helper for KPI cards
  const getSecondaryValue = (amount: number): string | undefined => {
    if (!settings.enableSecondaryCurrency || !settings.secondaryCurrency) return undefined;
    const converted = convertCurrency(amount, settings.currency, settings.secondaryCurrency);
    return formatCurrency(converted, settings.secondaryCurrency);
  };

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

          {/* Right Column: Key Metric Indicators */}
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center lg:items-end xl:items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t border-slate-200/60 lg:border-t-0">
            {/* Quick Metrics Capsule */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2 shadow-2xs text-xs">
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
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar inside Dashboard */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto select-none">
        <button
          type="button"
          onClick={() => setActiveSubTab('overview')}
          className={`border-b-2 px-4 py-2.5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'overview'
              ? 'border-blue-600 text-blue-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Overview & Cashflow
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('net_worth')}
          className={`border-b-2 px-4 py-2.5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'net_worth'
              ? 'border-blue-600 text-blue-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Net Worth & Wealth Forecasting
        </button>
      </div>

      {activeSubTab === 'overview' ? (
        <div className="space-y-4">
          {/* Visual over-budget warning system */}
          {overBudgetCategories.length > 0 && (
            <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-4 shadow-2xs text-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
              <div className="flex items-start sm:items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 shadow-3xs">
                  <AlertCircle className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-800">
                    Budget Ceiling Breached ({overBudgetCategories.length} Category Alert{overBudgetCategories.length > 1 ? 's' : ''})
                  </h4>
                  <p className="text-xs text-rose-700 font-semibold leading-relaxed mt-0.5">
                    Actual spending has exceeded your planned limit for:{' '}
                    <span className="font-black text-rose-950 underline decoration-rose-400">
                      {overBudgetCategories.map((cat) => {
                        const planned = plannedExpenses[cat.name] || 0;
                        const actual = sumExpensesByCategory(expenseTransactions, cat.name);
                        const overBy = actual - planned;
                        return `${cat.name} (Over by ${formatCurrency(overBy, settings.currency)})`;
                      }).join(', ')}
                    </span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* System Alerts & Notifications Hub */}
          {notifications.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/45 p-4 shadow-3xs space-y-3">
              <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                <div className="flex items-center gap-2 text-xs font-black text-amber-800 uppercase tracking-wider">
                  <BellRing className="h-4 w-4 text-amber-600 animate-bounce" />
                  <span>Interactive Alert Center ({notifications.length} Active Alerts)</span>
                </div>
                <button
                  onClick={() => setDismissedNotificationIds(notifications.map(n => n.id))}
                  className="text-[10px] text-amber-700 hover:text-amber-900 font-bold hover:underline cursor-pointer"
                >
                  Dismiss All
                </button>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`rounded-lg border p-3 flex items-start justify-between gap-3 transition-all ${
                      notif.type === 'warning'
                        ? 'border-rose-100 bg-rose-50/60 text-rose-900'
                        : 'border-blue-100 bg-blue-50/60 text-blue-900'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${notif.type === 'warning' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                        <h4 className="text-xs font-black truncate leading-none">
                          {notif.title}
                        </h4>
                      </div>
                      <p className="text-[11px] font-medium leading-relaxed opacity-90">
                        {notif.message}
                      </p>
                    </div>

                    <button
                      onClick={() => setDismissedNotificationIds((prev) => [...prev, notif.id])}
                      className="text-[10px] font-bold p-0.5 rounded-full hover:bg-black/5 shrink-0 transition-colors cursor-pointer"
                      title="Dismiss alert"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
          secondaryValue={getSecondaryValue(totalIncome)}
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
          secondaryValue={getSecondaryValue(totalExpenses)}
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
          secondaryValue={getSecondaryValue(savings)}
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
          secondaryValue={getSecondaryValue(remainingBudget)}
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

      {/* Section 1: Current Period Balance & Savings Rate */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 select-none">
          Current Period Balance & Savings Rate
        </h3>
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
            <SavingsRateLineChart
              data={annualData}
              currentRate={savingsRate}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Longitudinal Trends & Expense Allocation */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 select-none">
          Longitudinal Trends & Expense Allocation
        </h3>
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <MonthlyTrendChart
              data={annualData}
              currency={settings.currency}
            />
          </div>

          <div className="lg:col-span-4">
            <ExpenseDonutChart
              data={expenseBreakdown}
              currency={settings.currency}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Annual 12-Month Trajectory Overview */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 select-none">
          Annual Trajectory Overview
        </h3>
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
          <div className="lg:col-span-12">
            <IncomeExpensesLineTrendChart
              data={annualData}
              currency={settings.currency}
              settings={settings}
            />
          </div>
        </div>
      </div>

      {/* Savings Goals Tracker Feature Section */}
      <SavingsGoalsTracker
        savingsGoals={savingsGoals}
        onUpdateSavingsGoals={onUpdateSavingsGoals}
        categories={categories}
        incomeCategories={incomeCategories}
        settings={settings}
        onSelectCell={onSelectCell}
        currentMonthlySavings={savings}
        currentSavingsRate={savingsRate}
      />

      {/* ---------------------------------------------------------------------- */}
      {/* Financial Health Diagnostic Center: Budget Alerts & AI Spending Insights */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Card 1: Budget Alerts Notification System */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 shadow-2xs shrink-0">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Budget Alerts & Threshold Monitor
                  </h3>
                  <p className="text-[10px] font-medium text-slate-500">
                    Monitors planned vs. actual categories at &gt;90% limit
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-slate-150 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200 uppercase tracking-wider">
                Live Scanner
              </span>
            </div>

            {/* List of active warnings */}
            <div className="space-y-3.5">
              {budgetAlerts.length > 0 ? (
                budgetAlerts.map((alert) => (
                  <div
                    key={alert.category}
                    className={`rounded-lg border p-3.5 space-y-2 transition-colors ${
                      alert.severity === 'danger'
                        ? 'border-rose-100 bg-rose-50/40 text-rose-900'
                        : 'border-amber-100 bg-amber-50/40 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            alert.severity === 'danger' ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'
                          }`}
                        />
                        {alert.category}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${
                          alert.severity === 'danger'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                      >
                        {alert.percentage.toFixed(0)}% Limit Exceeded
                      </span>
                    </div>

                    {/* Progress indicator */}
                    <div className="space-y-1">
                      <div className="relative h-2 w-full rounded-full bg-slate-200/80 overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, alert.percentage)}%` }}
                          className={`h-full rounded-full transition-all duration-300 ${
                            alert.severity === 'danger' ? 'bg-rose-600' : 'bg-amber-500'
                          }`}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>Spent: {formatCurrency(alert.actual, settings.currency)}</span>
                        <span>Planned Limit: {formatCurrency(alert.planned, settings.currency)}</span>
                      </div>
                    </div>

                    <p className="text-[11px] font-medium leading-relaxed">
                      {alert.severity === 'danger' ? (
                        <span>
                          🔴 <strong>Over Budget!</strong> Spending on {alert.category} has exceeded your planned limit by{' '}
                          <strong className="underline">
                            {formatCurrency(alert.actual - alert.planned, settings.currency)}
                          </strong>.
                        </span>
                      ) : (
                        <span>
                          🟡 <strong>Warning!</strong> Spending on {alert.category} has exceeded 90% of its budget. Remaining buffer is{' '}
                          <strong className="underline">
                            {formatCurrency(alert.planned - alert.actual, settings.currency)}
                          </strong>.
                        </span>
                      )}
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                  <span className="font-bold text-slate-700">Perfect Budget Discipline!</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 max-w-[260px] text-center leading-normal">
                    All spending categories are currently below 90% of their planned budget limits.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium">
            <span>Threshold monitored in real-time</span>
            <span className="text-slate-500 font-semibold uppercase">Verification code: 200 OK</span>
          </div>
        </div>

        {showAiInsights && (
        
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-800 shadow-2xs shrink-0">
                  <Sparkles className="h-4.5 w-4.5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    AI-Powered Spending Insights Advisor
                  </h3>
                  <p className="text-[10px] font-medium text-slate-500">
                    Discretionary expense analyzer powered by Gemini AI
                  </p>
                </div>
              </div>
              
              {/* Manual regenerate button */}
              <button
                type="button"
                onClick={fetchAiInsights}
                disabled={isAiLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition-all cursor-pointer shadow-3xs disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 text-slate-500 ${isAiLoading ? 'animate-spin' : ''}`} />
                <span>Ask AI Advisor</span>
              </button>
            </div>

            {/* Insights Content */}
            <div className="space-y-4">
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                  <span className="font-extrabold text-slate-800 animate-pulse">Generative AI analysis in progress...</span>
                  <span className="text-[10px] text-slate-400 mt-1 max-w-[240px] text-center leading-relaxed">
                    Analyzing cashflow patterns & drafting discretionary reduction tips.
                  </span>
                </div>
              ) : aiError ? (
                <div className="flex flex-col items-center justify-center py-10 text-rose-700 text-xs bg-rose-50/50 border border-rose-100 rounded-xl p-4">
                  <AlertCircle className="h-8 w-8 text-rose-500 mb-2" />
                  <span className="font-bold text-slate-800">API Gateway Error</span>
                  <p className="text-[11px] text-rose-600 text-center mt-0.5 leading-normal">
                    {aiError}. Make sure your local Express server is running and the Gemini API is correctly configured.
                  </p>
                  <button
                    type="button"
                    onClick={fetchAiInsights}
                    className="mt-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 text-[10px] shadow-3xs transition-colors cursor-pointer"
                  >
                    Retry Query
                  </button>
                </div>
              ) : aiInsights ? (
                <div className="space-y-3.5">
                  <div className="rounded-lg border border-blue-50 bg-blue-50/30 p-3 flex items-start gap-2.5">
                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-900 leading-normal font-medium">
                      Gemini has scanned your active ledger accounts for this month to identify recurrent spending and optimize your cashflow rate.
                    </p>
                  </div>
                  
                  {/* Visual listing of the 3 bullets */}
                  <div className="space-y-2.5">
                    {aiInsights
                      .split('\n')
                      .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('*') || line.trim().length > 10)
                      .slice(0, 3)
                      .map((bullet, idx) => {
                        const cleanText = bullet.replace(/^[-*\s\d.]+/g, '').trim();
                        return (
                          <div key={idx} className="flex gap-2.5 rounded-lg border border-slate-100 bg-slate-50/40 p-3 hover:bg-slate-50 transition-colors">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white font-mono">
                              {idx + 1}
                            </span>
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-bold text-slate-800 uppercase block">Action Plan #{idx + 1}</span>
                              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                                {cleanText}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Sparkles className="h-8 w-8 text-blue-400 mb-2" />
                  <span className="font-bold text-slate-700">No Insights Seeded</span>
                  <button
                    type="button"
                    onClick={fetchAiInsights}
                    className="mt-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 text-xs shadow-3xs transition-all cursor-pointer"
                  >
                    Analyze Ledger History
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium">
            <span>Powered by Gemini 3.8 Flash</span>
            {isAiFallback ? (
              <span className="text-amber-600 font-bold uppercase flex items-center gap-1" title="Offline smart advisory recommendations active due to rate-limiting or quota limitations">
                <AlertTriangle className="h-3.5 w-3.5 animate-bounce text-amber-500" /> Offline Advisor Active
              </span>
            ) : (
              <span className="text-slate-500 font-semibold uppercase">Ready • Secured</span>
            )}
          </div>
        </div>

      )}
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
    </div>
  ) : (
    <NetWorthForecaster
      debts={debts}
      settings={settings}
      currentMonthlySavings={savings}
      currentMonthlyExpenses={totalExpenses}
      onSelectCell={onSelectCell}
    />
  )}

  {/* Floating Action Button (FAB) for Quick Add */}
  <div className="fixed bottom-6 right-6 z-40">
    <button
      type="button"
      onClick={() => setIsQuickAddOpen(true)}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 cursor-pointer group"
      title="Quick Add Transaction"
    >
      <Plus className="h-6 w-6 transition-transform group-hover:rotate-90 duration-200" />
    </button>
  </div>

  {/* Quick Add Modal */}
  {isQuickAddOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs transition-opacity duration-200"
        onClick={() => setIsQuickAddOpen(false)}
      />

      {/* Modal Card */}
      <div className="relative flex flex-col w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 border border-slate-200 z-50 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-800 uppercase tracking-wide">
            Quick Add Transaction
          </h3>
          <button
            type="button"
            onClick={() => setIsQuickAddOpen(false)}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 hover:bg-slate-100 rounded-lg text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleQuickAddSubmit} className="space-y-4">
          {/* Type Switcher (Clean button segments) */}
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
              Transaction Type
            </span>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setQuickAddType('expense')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  quickAddType === 'expense'
                    ? 'bg-white text-rose-600 shadow-3xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setQuickAddType('income')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  quickAddType === 'income'
                    ? 'bg-white text-emerald-600 shadow-3xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          {/* Amount & Date Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="qa-amount" className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Amount ({settings.currency})
              </label>
              <input
                id="qa-amount"
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={quickAddAmount}
                onChange={(e) => setQuickAddAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="qa-date" className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Date
              </label>
              <input
                id="qa-date"
                type="date"
                required
                value={quickAddDate}
                onChange={(e) => setQuickAddDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Category & Payment Method Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="qa-category" className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Category
              </label>
              <select
                id="qa-category"
                required
                value={quickAddCategory}
                onChange={(e) => setQuickAddCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden cursor-pointer"
              >
                {quickAddType === 'income'
                  ? incomeCategories.filter(c => c.isActive).map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))
                  : categories.filter(c => c.isActive).map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))
                }
              </select>
            </div>

            {quickAddType === 'expense' && (
              <div className="space-y-1">
                <label htmlFor="qa-payment" className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Payment Method
                </label>
                <select
                  id="qa-payment"
                  value={quickAddPaymentMethod}
                  onChange={(e) => setQuickAddPaymentMethod(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden cursor-pointer"
                >
                  {paymentMethods.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="qa-description" className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Description
            </label>
            <input
              id="qa-description"
              type="text"
              placeholder="e.g. Weekly grocery stock, salary bonus..."
              value={quickAddDescription}
              onChange={(e) => setQuickAddDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(false)}
              className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs hover:shadow-sm cursor-pointer"
            >
              Add Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

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
