import React, { useState, useEffect, useMemo } from 'react';
import { Lightbulb, X, CheckCircle2, AlertTriangle, Coins, Receipt, ArrowRight, Wallet, PiggyBank, Sparkles } from 'lucide-react';
import { ExpenseTransaction, IncomeTransaction, SettingsState } from '../types/budget';
import { formatCurrency } from '../utils/formatters';
import { sumExpenseTransactions, sumIncomeTransactions } from '../utils/formulas';

interface BudgetInsightWidgetProps {
  incomeTransactions: IncomeTransaction[];
  expenseTransactions: ExpenseTransaction[];
  settings: SettingsState;
}

interface HeuristicTip {
  id: string;
  title: string;
  recommendation: string;
  metricLabel: string;
  metricValue: string;
  theme: 'warning' | 'success' | 'info' | 'danger';
}

export const BudgetInsightWidget: React.FC<BudgetInsightWidgetProps> = ({
  incomeTransactions,
  expenseTransactions,
  settings,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // Start as true, compute on mount to prevent hydration mismatch

  // Get today's date key for storage comparison (e.g. "2026-10-01")
  const todayKey = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Check dismissal status on mount
  useEffect(() => {
    const dismissedDate = localStorage.getItem('budget_insight_dismissed_date');
    if (dismissedDate !== todayKey) {
      setIsDismissed(false);
    }
    
    // Trigger fade-in transition
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [todayKey]);

  // Handle manual tip dismissal for the day
  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem('budget_insight_dismissed_date', todayKey);
    setIsDismissed(true);
  };

  // Heuristic engine analyzing live transactions
  const dailyTip = useMemo<HeuristicTip>(() => {
    const totalInc = sumIncomeTransactions(incomeTransactions);
    const totalExp = sumExpenseTransactions(expenseTransactions);
    const netSurp = totalInc - totalExp;
    const rate = totalInc > 0 ? (netSurp / totalInc) * 100 : 0;

    // Group expenses by category
    const categoryTotals: Record<string, number> = {};
    expenseTransactions.forEach((t) => {
      const cat = t.category || 'Uncategorized';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (t.amount || 0);
    });

    let topCategory = 'None';
    let topCategoryAmount = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategory = cat;
      }
    });
    const topCategoryPercent = totalExp > 0 ? (topCategoryAmount / totalExp) * 100 : 0;

    // Check for subscription keyword indicators
    const hasSubscriptions = expenseTransactions.some((t) => {
      const descLower = (t.description || '').toLowerCase();
      return (
        descLower.includes('sub') ||
        descLower.includes('spotify') ||
        descLower.includes('netflix') ||
        descLower.includes('cloud') ||
        descLower.includes('recurring')
      );
    });

    const matchedTips: HeuristicTip[] = [];

    // Heuristic 1: Net Deficit (Expenses exceed income)
    if (totalExp > totalInc && totalInc > 0) {
      matchedTips.push({
        id: 'net_deficit',
        title: 'Deficit Strategy Triggered',
        recommendation: `Your total spending of ${formatCurrency(totalExp, settings.currency)} exceeds your total incoming deposits of ${formatCurrency(totalInc, settings.currency)}. This net deficit of ${formatCurrency(totalExp - totalInc, settings.currency)} puts severe pressure on reserves. We recommend pausing non-essential purchases for the next 7 days and utilizing the Zero-Based Budgeting technique to ensure basic necessities are prioritized first.`,
        metricLabel: 'Net Deficit Outlay',
        metricValue: formatCurrency(totalExp - totalInc, settings.currency),
        theme: 'danger',
      });
    }

    // Heuristic 2: Low Savings Rate
    if (rate < 10 && totalInc > 0) {
      matchedTips.push({
        id: 'low_savings_rate',
        title: 'Accelerate Savings Velocity',
        recommendation: `Your current monthly savings rate is ${rate.toFixed(1)}%, which is below the recommended 20% standard benchmark. To build a resilient emergency fund, try implementing the 'Pay Yourself First' technique: set up an automatic transfer of 10% of any incoming deposit directly into your savings account the day you are paid.`,
        metricLabel: 'Current Savings Rate',
        metricValue: `${rate.toFixed(1)}% (Target: 20%)`,
        theme: 'warning',
      });
    }

    // Heuristic 3: Subscriptions leak detection
    if (hasSubscriptions) {
      matchedTips.push({
        id: 'recurring_leak',
        title: 'Audit Recurring Subscriptions',
        recommendation: 'We detected subscription keywords in your transaction logs. Micro-transactions like streaming memberships, cloud storage, and monthly box subscriptions are notorious wealth leaks. We recommend reviewing your bank statements and cancelling any recurring subscription that you have not logged into or utilized within the past 30 days.',
        metricLabel: 'Subscription Overhead Audit',
        metricValue: 'Audit Recommended',
        theme: 'info',
      });
    }

    // Heuristic 4: Category concentration
    if (topCategoryAmount > 0 && topCategoryPercent > 35) {
      matchedTips.push({
        id: 'category_concentration',
        title: `Optimize '${topCategory}' Categories`,
        recommendation: `Your spending in '${topCategory}' represents ${topCategoryPercent.toFixed(0)}% of your entire monthly outlay (${formatCurrency(topCategoryAmount, settings.currency)}). When a single category dominates your budget, try establishing a weekly spending cap specifically for '${topCategory}'. Micro-milestones are much easier to stick to than monthly goals!`,
        metricLabel: `Top Category Ratio (${topCategory})`,
        metricValue: `${topCategoryPercent.toFixed(0)}% of expenses`,
        theme: 'warning',
      });
    }

    // Heuristic 5: Outlay frequency
    if (expenseTransactions.length > 15) {
      matchedTips.push({
        id: 'high_velocity',
        title: 'Reduce Transaction Velocity',
        recommendation: `You logged ${expenseTransactions.length} separate expense transactions this month. High transactional frequency, even for tiny amounts, erodes willpower and makes mental tracking difficult. Challenge yourself to a 'Zero-Spend Weekend' or consolidate your purchase frequency into designated bi-weekly trips.`,
        metricLabel: 'Monthly Outlay Count',
        metricValue: `${expenseTransactions.length} transactions`,
        theme: 'info',
      });
    }

    // Heuristic 6: Great Savings Rate
    if (rate >= 20) {
      matchedTips.push({
        id: 'great_savings_rate',
        title: 'Compound Savings Momentum',
        recommendation: `Exceptional financial health! Your current savings rate is ${rate.toFixed(1)}%, exceeding the golden 20% benchmark. To compound this advantage, transition your surplus funds into high-yield savings nodes, secure investments, or accelerated debt paydowns instead of leaving them idle in standard accounts.`,
        metricLabel: 'Surplus Saved',
        metricValue: `${rate.toFixed(1)}% (Excellent)`,
        theme: 'success',
      });
    }

    // Fallback default tip if no heuristics match
    matchedTips.push({
      id: 'default_zero_based',
      title: 'Practice Zero-Based Allocation',
      recommendation: "Ensure that every dollar of your incoming cashflow has a designated job. Plan your income down to the last penny across expenses, savings goals, and debts so that your unallocated balance equals zero. Budget compliance increases significantly when no money is left 'unassigned'.",
      metricLabel: 'Budgeting Principle',
      metricValue: 'Zero-Based Strategy',
      theme: 'success',
    });

    // Hash dayOfMonth to deterministically rotate matched tips
    const dayOfMonth = new Date().getDate();
    const selectedIndex = dayOfMonth % matchedTips.length;
    return matchedTips[selectedIndex] || matchedTips[0];
  }, [incomeTransactions, expenseTransactions, settings]);

  if (isDismissed) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-r from-indigo-50/40 via-blue-50/20 to-emerald-50/20 p-5 shadow-xs transition-all duration-550 ease-out ${
        isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
    >
      {/* Dismiss Button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white/80 hover:bg-slate-100 text-slate-400 hover:text-slate-700 shadow-3xs cursor-pointer transition-colors"
        title="Dismiss for today"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 pr-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/15">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100">
                Daily Budget Insight
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">• Heuristic Analyzer</span>
            </div>

            <h3 className="mt-1.5 text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              {dailyTip.title}
            </h3>

            <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-4xl">
              {dailyTip.recommendation}
            </p>
          </div>
        </div>

        {/* Quick Stats Check display */}
        <div className="rounded-xl border border-slate-200 bg-white/80 p-3.5 shrink-0 md:min-w-56 backdrop-blur-xs flex flex-col justify-between self-stretch md:self-auto shadow-2xs">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
            {dailyTip.metricLabel}
          </span>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs font-black text-slate-950">
              {dailyTip.metricValue}
            </span>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                dailyTip.theme === 'danger'
                  ? 'bg-rose-500 animate-pulse'
                  : dailyTip.theme === 'warning'
                  ? 'bg-amber-400'
                  : dailyTip.theme === 'success'
                  ? 'bg-emerald-500'
                  : 'bg-blue-500'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
