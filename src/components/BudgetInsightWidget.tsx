import React, { useState, useEffect, useMemo } from 'react';
import { Lightbulb, X, TrendingUp, PiggyBank, ArrowRight, ShieldCheck } from 'lucide-react';
import { ExpenseTransaction, IncomeTransaction, SettingsState } from '../types/budget';
import { formatCurrency } from '../utils/formatters';
import { sumExpenseTransactions, sumIncomeTransactions } from '../utils/formulas';

interface BudgetInsightWidgetProps {
  incomeTransactions: IncomeTransaction[];
  expenseTransactions: ExpenseTransaction[];
  settings: SettingsState;
  plannedExpenses: Record<string, number>;
}

interface HeuristicTip {
  id: string;
  title: string;
  recommendation: string;
  metricLabel: string;
  metricValue: string;
  theme: 'warning' | 'success' | 'info' | 'danger';
}

const ProgressRing: React.FC<{ percentage: number; label: string }> = ({ percentage, label }) => {
  const radius = 24;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  // Cap percentage shown at 100 on the circle but keep number
  const cappedPercent = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (cappedPercent / 100) * circumference;

  let strokeColor = 'text-indigo-600';
  if (percentage >= 100) {
    strokeColor = 'text-rose-600 animate-pulse';
  } else if (percentage >= 90) {
    strokeColor = 'text-amber-500';
  } else if (percentage > 0) {
    strokeColor = 'text-emerald-500';
  }

  return (
    <div className="flex items-center gap-2.5 bg-white/70 hover:bg-white/95 transition-all p-2 rounded-xl border border-slate-150 shadow-3xs backdrop-blur-xs select-none">
      <div className="relative flex items-center justify-center h-11 w-11 shrink-0">
        <svg className="h-11 w-11 transform -rotate-90">
          <circle
            className="text-slate-150"
            strokeWidth={stroke}
            stroke="currentColor"
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            className={`${strokeColor} transition-all duration-500 ease-out`}
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <span className="absolute text-[9px] font-black text-slate-800 font-mono">
          {percentage}%
        </span>
      </div>
      <div className="min-w-0 pr-1">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">
          Budget Spent
        </span>
        <span className="text-[10px] font-bold text-slate-700 truncate block max-w-28" title={label}>
          {label}
        </span>
      </div>
    </div>
  );
};

export const BudgetInsightWidget: React.FC<BudgetInsightWidgetProps> = ({
  incomeTransactions,
  expenseTransactions,
  settings,
  plannedExpenses,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // Start as true, compute on mount to prevent hydration mismatch
  const [targetReduction, setTargetReduction] = useState(10); // Default to 10% reduction

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

  // Group expenses by category
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    expenseTransactions.forEach((t) => {
      const cat = t.category || 'Uncategorized';
      totals[cat] = (totals[cat] || 0) + (t.amount || 0);
    });
    return totals;
  }, [expenseTransactions]);

  // Find top expense category and its spent budget percentage
  const topCategoryInfo = useMemo(() => {
    let topCategory = 'None';
    let topCategoryAmount = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategory = cat;
      }
    });

    const plannedLimit = plannedExpenses[topCategory] || 0;
    const spentPercent = plannedLimit > 0 ? (topCategoryAmount / plannedLimit) * 100 : 0;

    return {
      category: topCategory,
      amount: topCategoryAmount,
      planned: plannedLimit,
      percent: Math.round(spentPercent),
    };
  }, [categoryTotals, plannedExpenses]);

  // Find top spending category in the last 30 days and its historical monthly average
  const topCategory30DaysInfo = useMemo(() => {
    if (expenseTransactions.length === 0) {
      return { category: 'None', amount: 0, historicalAverage: 0, exceedsAverage: false, difference: 0, percentExceeded: 0 };
    }

    // 1. Establish reference "today" date based on the latest transaction date (to support templates gracefully)
    const transactionTimestamps = expenseTransactions
      .map((t) => new Date(t.date).getTime())
      .filter((time) => !isNaN(time));
    const refDate = transactionTimestamps.length > 0 ? new Date(Math.max(...transactionTimestamps)) : new Date();

    // 30 days window start date
    const start30DaysAgo = new Date(refDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Filter transactions in the last 30 days
    const last30DaysTx = expenseTransactions.filter((t) => {
      const txDate = new Date(t.date);
      return txDate >= start30DaysAgo && txDate <= refDate;
    });

    // Sum last 30 days by category
    const cat30Totals: Record<string, number> = {};
    last30DaysTx.forEach((t) => {
      const cat = t.category || 'Uncategorized';
      cat30Totals[cat] = (cat30Totals[cat] || 0) + (t.amount || 0);
    });

    let topCategory = 'None';
    let topCategoryAmount = 0;
    Object.entries(cat30Totals).forEach(([cat, amt]) => {
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategory = cat;
      }
    });

    // 2. Filter transactions older than 30 days to calculate historical monthly average
    const historicalTx = expenseTransactions.filter((t) => {
      const txDate = new Date(t.date);
      return txDate < start30DaysAgo;
    });

    // Group historical transactions by Year-Month and sum for this specific category
    const historicalMonthlySums: Record<string, number> = {};
    historicalTx.forEach((t) => {
      if (t.category === topCategory) {
        const txDate = new Date(t.date);
        const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        historicalMonthlySums[key] = (historicalMonthlySums[key] || 0) + (t.amount || 0);
      }
    });

    const monthsCount = Object.keys(historicalMonthlySums).length;
    let historicalAverage = 0;

    if (monthsCount > 0) {
      const totalHistoricalSpend = Object.values(historicalMonthlySums).reduce((a, b) => a + b, 0);
      historicalAverage = totalHistoricalSpend / monthsCount;
    } else {
      // Robust Fallback: If no historical transactions, fallback to planned budget for this category
      historicalAverage = plannedExpenses[topCategory] || 0;
    }

    const exceedsAverage = topCategoryAmount > historicalAverage && historicalAverage > 0;
    const difference = exceedsAverage ? topCategoryAmount - historicalAverage : 0;
    const percentExceeded = historicalAverage > 0 ? (difference / historicalAverage) * 100 : 0;

    return {
      category: topCategory,
      amount: topCategoryAmount,
      historicalAverage,
      exceedsAverage,
      difference,
      percentExceeded: Math.round(percentExceeded),
    };
  }, [expenseTransactions, plannedExpenses]);

  // Heuristic engine analyzing live transactions
  const dailyTip = useMemo<HeuristicTip>(() => {
    const totalInc = sumIncomeTransactions(incomeTransactions);
    const totalExp = sumExpenseTransactions(expenseTransactions);
    const netSurp = totalInc - totalExp;
    const rate = totalInc > 0 ? (netSurp / totalInc) * 100 : 0;

    let topCategory = topCategoryInfo.category;
    const topCategoryPercent = totalExp > 0 ? (topCategoryInfo.amount / totalExp) * 100 : 0;

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

    // Heuristic 0 (Highest priority): Top Category exceeds historical monthly average
    if (topCategory30DaysInfo.exceedsAverage) {
      matchedTips.push({
        id: 'historical_excess',
        title: `Spend Reduction Alert: '${topCategory30DaysInfo.category}'`,
        recommendation: `Your spending on '${topCategory30DaysInfo.category}' over the last 30 days (${formatCurrency(topCategory30DaysInfo.amount, settings.currency)}) has exceeded your historical monthly average of ${formatCurrency(topCategory30DaysInfo.historicalAverage, settings.currency)} by ${topCategory30DaysInfo.percentExceeded}%. To curb this trend, we recommend setting up a 24-hour cooling-off period before completing checkouts in this category.`,
        metricLabel: 'Excess vs. Avg',
        metricValue: `+${formatCurrency(topCategory30DaysInfo.difference, settings.currency)} (${topCategory30DaysInfo.percentExceeded}% high)`,
        theme: 'danger',
      });
    }

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
    if (topCategoryInfo.amount > 0 && topCategoryPercent > 35) {
      matchedTips.push({
        id: 'category_concentration',
        title: `Optimize '${topCategory}' Categories`,
        recommendation: `Your spending in '${topCategory}' represents ${topCategoryPercent.toFixed(0)}% of your entire monthly outlay (${formatCurrency(topCategoryInfo.amount, settings.currency)}). When a single category dominates your budget, try establishing a weekly spending cap specifically for '${topCategory}'. Micro-milestones are much easier to stick to than monthly goals!`,
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
  }, [incomeTransactions, expenseTransactions, settings, topCategoryInfo, topCategory30DaysInfo]);

  // Financial Impact Calculations
  const financialImpact = useMemo(() => {
    const topCategoryName = topCategoryInfo.category;
    const monthlySpend = topCategoryInfo.amount;
    
    const monthlySavings = monthlySpend * (targetReduction / 100);
    const annualSavings = monthlySavings * 12;
    const originalAnnualOutlay = monthlySpend * 12;
    const newAnnualOutlay = originalAnnualOutlay - annualSavings;

    return {
      topCategoryName,
      monthlySpend,
      monthlySavings,
      annualSavings,
      originalAnnualOutlay,
      newAnnualOutlay,
    };
  }, [topCategoryInfo, targetReduction]);

  if (isDismissed) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-r from-indigo-50/40 via-blue-50/15 to-emerald-50/20 p-5 shadow-xs transition-all duration-550 ease-out space-y-5 ${
        isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
    >
      {/* Dismiss Button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white/80 hover:bg-slate-100 text-slate-400 hover:text-slate-700 shadow-3xs cursor-pointer transition-colors z-10"
        title="Dismiss for today"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Row 1: Daily Tip Segment */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 pr-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/15">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50/85 px-2 py-0.5 rounded-md border border-indigo-100">
                Daily Budget Insight
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">• Heuristic Analyzer</span>
            </div>

            <h3 className="mt-1.5 text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              {dailyTip.title}
            </h3>

            <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-4xl font-medium">
              {dailyTip.recommendation}
            </p>
          </div>
        </div>

        {/* Visual elements container: Progress Ring + Stat Badge */}
        <div className="flex flex-wrap items-center gap-3 self-stretch lg:self-auto shrink-0">
          {/* Progress Ring for top Category spend vs budget if planned */}
          {topCategoryInfo.planned > 0 && (
            <ProgressRing
              percentage={topCategoryInfo.percent}
              label={topCategoryInfo.category}
            />
          )}

          {/* Quick Stats Check display */}
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shrink-0 min-w-[170px] backdrop-blur-xs flex flex-col justify-between shadow-2xs">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">
              {dailyTip.metricLabel}
            </span>
            <div className="mt-1.5 flex items-center justify-between gap-3">
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

      {/* Divider */}
      <div className="border-t border-slate-200/60" />

      {/* Row 2: Financial Impact Simulator Module */}
      {financialImpact.monthlySpend > 0 ? (
        <div className="bg-white/70 rounded-2xl border border-slate-200 p-4 sm:p-5 backdrop-blur-xs shadow-3xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            {/* Simulation Header / Explanation */}
            <div className="space-y-1.5 max-w-lg">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 shadow-3xs shrink-0">
                  <PiggyBank className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Financial Impact Simulator
                </h4>
              </div>
              <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                By optimizing and cutting down outlays on your top expense category (<strong>{financialImpact.topCategoryName}</strong>) by just <strong className="text-emerald-600">{targetReduction}%</strong>, you retain substantial capital annually. Experiment with targets below to project long-term compounding effects.
              </p>
            </div>

            {/* Slider control */}
            <div className="w-full md:w-60 bg-slate-50 border border-slate-150 p-3 rounded-xl shadow-4xs shrink-0">
              <div className="flex justify-between items-center mb-1.5 text-[10px] font-bold text-slate-500">
                <span>REDUCTION TARGET</span>
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-150 px-1.5 py-0.5 rounded font-black font-mono">
                  {targetReduction}%
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={targetReduction}
                onChange={(e) => setTargetReduction(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-hidden"
              />
              <div className="flex justify-between text-[8px] font-black text-slate-400 mt-1">
                <span>5% (Gentle)</span>
                <span>50% (Aggressive)</span>
              </div>
            </div>
          </div>

          {/* Quick Projection Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
            <div className="rounded-xl border border-slate-150 bg-slate-50/50 p-3 flex flex-col justify-between">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">
                Current Annual Outlay
              </span>
              <span className="text-sm font-black text-slate-800 mt-1 font-mono">
                {formatCurrency(financialImpact.originalAnnualOutlay, settings.currency)}
              </span>
              <span className="text-[9px] text-slate-400 font-bold mt-0.5">
                Based on current monthly pacing
              </span>
            </div>

            <div className="rounded-xl border border-emerald-250 bg-emerald-50/40 p-3 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute right-2 top-2 opacity-10">
                <TrendingUp className="h-10 w-10 text-emerald-600" />
              </div>
              <span className="text-[8px] font-black text-emerald-800 uppercase tracking-wider block">
                Annualized Savings
              </span>
              <span className="text-base font-black text-emerald-700 mt-1 font-mono flex items-center gap-1">
                {formatCurrency(financialImpact.annualSavings, settings.currency)}
              </span>
              <span className="text-[9px] text-emerald-600/95 font-bold mt-0.5">
                Saved annually from a {targetReduction}% reduction!
              </span>
            </div>

            <div className="rounded-xl border border-slate-150 bg-slate-50/50 p-3 flex flex-col justify-between">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">
                Target Annual Outlay
              </span>
              <span className="text-sm font-black text-slate-800 mt-1 font-mono">
                {formatCurrency(financialImpact.newAnnualOutlay, settings.currency)}
              </span>
              <span className="text-[9px] text-slate-400 font-bold mt-0.5 flex items-center gap-0.5">
                New pacing <ArrowRight className="h-2.5 w-2.5" /> optimized health
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/50 rounded-xl border border-dashed border-slate-200 p-4 text-center text-slate-400 text-xs">
          <ShieldCheck className="h-6 w-6 text-indigo-500 mx-auto mb-1.5" />
          <span className="font-bold text-slate-700">No Outlays Detected Yet</span>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Log some expense transactions in the 'Expenses' sheet to compute your top outlay category and simulate potential annual savings impact.
          </p>
        </div>
      )}
    </div>
  );
};
