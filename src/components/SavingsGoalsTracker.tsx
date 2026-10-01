import React, { useState } from 'react';
import {
  CategoryItem,
  SavingsGoal,
  SettingsState,
} from '../types/budget';
import { formatCurrency } from '../utils/formatters';
import { calculateSavingsGoalProgress } from '../utils/financialPlanning';
import {
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit2,
  Filter,
  Flame,
  Minus,
  Pencil,
  PiggyBank,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';

interface SavingsGoalsTrackerProps {
  savingsGoals: SavingsGoal[];
  onUpdateSavingsGoals: (goals: SavingsGoal[]) => void;
  categories: CategoryItem[];
  incomeCategories: CategoryItem[];
  settings: SettingsState;
  onSelectCell?: (info: { reference: string; value: string; formula?: string; isCalculated: boolean }) => void;
  currentMonthlySavings?: number;
  currentSavingsRate?: number;
}

export const SavingsGoalsTracker: React.FC<SavingsGoalsTrackerProps> = ({
  savingsGoals,
  onUpdateSavingsGoals,
  categories,
  incomeCategories,
  settings,
  onSelectCell,
  currentMonthlySavings = 500, // default fallback
  currentSavingsRate = 20,     // default fallback
}) => {
  // Modal states
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);
  const [contributionAmount, setContributionAmount] = useState<string>('100');

  // Filter state
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'completed'>('all');

  // Form states for Add/Edit Goal
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [categoryName, setCategoryName] = useState('Savings');
  const [targetDate, setTargetDate] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [goalColor, setGoalColor] = useState('#059669');
  const [goalNotes, setGoalNotes] = useState('');

  // Savings Goal Calculator Widget states
  const [calcTargetAmount, setCalcTargetAmount] = useState('5000');
  const [calcDuration, setCalcDuration] = useState('12');
  const [calcInterestRate, setCalcInterestRate] = useState('5.0');

  // Combined category options
  const allCategories = [
    ...categories.filter((c) => c.isActive).map((c) => c.name),
    ...incomeCategories.filter((c) => c.isActive).map((c) => c.name),
  ];
  const uniqueCategoryNames = Array.from(new Set(['Savings', 'Emergency Fund', 'Investments', ...allCategories]));

  // Color palette options for goals
  const COLOR_PALETTE = [
    { label: 'Emerald', hex: '#059669' },
    { label: 'Sky Blue', hex: '#0284c7' },
    { label: 'Indigo', hex: '#4f46e5' },
    { label: 'Violet', hex: '#8b5cf6' },
    { label: 'Amber', hex: '#d97706' },
    { label: 'Rose', hex: '#e11d48' },
    { label: 'Teal', hex: '#0d9488' },
    { label: 'Cyan', hex: '#0891b2' },
  ];

  // Aggregated calculations
  const goalProgress = savingsGoals.map(calculateSavingsGoalProgress);
  const totalTarget = goalProgress.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goalProgress.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalRemaining = Math.max(0, totalTarget - totalSaved);
  const overallProgressPct = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;
  const completedGoalsCount = goalProgress.filter((g) => g.isComplete).length;
  const totalMonthlyCommitment = savingsGoals.reduce((sum, g) => sum + (g.monthlyContribution || 0), 0);

  // Filtered goals
  const filteredGoals = savingsGoals.filter((goal) => {
    const isCompleted = goal.currentAmount >= goal.targetAmount;
    if (filterStatus === 'completed') return isCompleted;
    if (filterStatus === 'in_progress') return !isCompleted;
    return true;
  });

  // Open modal to add new goal
  const handleOpenAddModal = () => {
    setEditingGoal(null);
    setGoalName('');
    setTargetAmount('5000');
    setCurrentAmount('500');
    setCategoryName('Savings');
    setTargetDate('2026-12-31');
    setMonthlyContribution('250');
    setGoalColor('#059669');
    setGoalNotes('');
    setIsAddGoalModalOpen(true);
  };

  // Open modal to edit existing goal
  const handleOpenEditModal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setGoalName(goal.name);
    setTargetAmount(String(goal.targetAmount));
    setCurrentAmount(String(goal.currentAmount));
    setCategoryName(goal.categoryName || 'Savings');
    setTargetDate(goal.targetDate || '');
    setMonthlyContribution(goal.monthlyContribution ? String(goal.monthlyContribution) : '');
    setGoalColor(goal.color || '#059669');
    setGoalNotes(goal.notes || '');
    setIsAddGoalModalOpen(true);
  };

  // Save Add/Edit Goal
  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount) || 0;
    const current = parseFloat(currentAmount) || 0;
    const monthly = monthlyContribution ? parseFloat(monthlyContribution) || 0 : undefined;

    if (!goalName.trim() || target <= 0) return;

    if (editingGoal) {
      // Update existing
      const updated = savingsGoals.map((g) =>
        g.id === editingGoal.id
          ? {
              ...g,
              name: goalName.trim(),
              categoryName,
              targetAmount: target,
              currentAmount: current,
              targetDate: targetDate || undefined,
              monthlyContribution: monthly,
              color: goalColor,
              notes: goalNotes.trim() || undefined,
            }
          : g
      );
      onUpdateSavingsGoals(updated);
    } else {
      // Create new
      const newGoal: SavingsGoal = {
        id: `goal_${Date.now()}`,
        name: goalName.trim(),
        categoryName,
        targetAmount: target,
        currentAmount: current,
        targetDate: targetDate || undefined,
        monthlyContribution: monthly,
        color: goalColor,
        notes: goalNotes.trim() || undefined,
      };
      onUpdateSavingsGoals([...savingsGoals, newGoal]);
    }
    setIsAddGoalModalOpen(false);
  };

  // Delete goal
  const handleDeleteGoal = (goalId: string, goalName: string) => {
    if (window.confirm(`Are you sure you want to delete the savings goal "${goalName}"?`)) {
      onUpdateSavingsGoals(savingsGoals.filter((g) => g.id !== goalId));
    }
  };

  // Quick contribute
  const handleOpenContribute = (goal: SavingsGoal) => {
    setContributeGoal(goal);
    setContributionAmount('100');
  };

  const handleApplyContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoal) return;
    const added = parseFloat(contributionAmount) || 0;
    if (!Number.isFinite(added) || added <= 0) return;

    const updated = savingsGoals.map((g) => {
      if (g.id === contributeGoal.id) {
        const nextAmount = Math.max(0, g.currentAmount + added);
        return { ...g, currentAmount: nextAmount };
      }
      return g;
    });

    onUpdateSavingsGoals(updated);
    setContributeGoal(null);
  };

  const handleCreateGoalFromCalc = () => {
    setEditingGoal(null);
    setGoalName('My Savings Target');
    setTargetAmount(calcTargetAmount);
    
    // Calculate required monthly contribution
    const target = parseFloat(calcTargetAmount) || 0;
    const months = parseFloat(calcDuration) || 1;
    const rate = parseFloat(calcInterestRate) || 0;
    let monthly = target / months;
    if (target > 0 && months > 0 && rate > 0) {
      const i = (rate / 100) / 12;
      monthly = (target * i) / (Math.pow(1 + i, months) - 1);
    }
    
    setCurrentAmount('0');
    setCategoryName('Savings');
    
    // Target date = current date + months
    const today = new Date();
    today.setMonth(today.getMonth() + Math.round(months));
    const targetDateStr = today.toISOString().split('T')[0];
    setTargetDate(targetDateStr);
    
    setMonthlyContribution(monthly.toFixed(0));
    setGoalColor('#0284c7');
    setGoalNotes(`Calculated target using ${calcInterestRate}% est. interest rate over ${calcDuration} months.`);
    setIsAddGoalModalOpen(true);
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 lg:p-7 shadow-xs space-y-6">
      {/* ---------------------------------------------------- */}
      {/* 1. Header & Quick Controls */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                  Savings Goals & Target Tracking
                </h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200/60 shadow-2xs">
                  {savingsGoals.length} {savingsGoals.length === 1 ? 'Goal' : 'Goals'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Set category targets, track progress bars toward financial milestones, and allocate monthly savings.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600 border border-slate-200/60">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              All ({savingsGoals.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('in_progress')}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                filterStatus === 'in_progress'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              Active ({savingsGoals.length - completedGoalsCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('completed')}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                filterStatus === 'completed'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              Completed ({completedGoalsCount})
            </button>
          </div>

          {/* New Goal Button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Savings Goal</span>
            <span className="sm:hidden">Add Goal</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. Executive Overall Progress & Savings Goal Calculator */}
      {/* ---------------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Card: Cumulative Overall Progress */}
        <div className="lg:col-span-7 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 via-slate-50/40 to-blue-50/50 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-800">
                  Cumulative Savings Goal Progress
                </span>
                <span className="rounded-md bg-emerald-200/70 text-emerald-900 text-[10px] font-black px-1.5 py-0.5">
                  {overallProgressPct.toFixed(1)}% Achieved
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black text-slate-900">
                  {formatCurrency(totalSaved, settings.currency)}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  of {formatCurrency(totalTarget, settings.currency)} target
                </span>
              </div>
            </div>

            {/* Quick Metrics Capsules */}
            <div className="flex flex-wrap items-center gap-2 pt-4 text-[11px]">
              <div className="rounded-lg border border-slate-200/80 bg-white/95 px-2.5 py-1 shadow-3xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-tight">Remaining</span>
                <span className="font-extrabold text-slate-800">
                  {formatCurrency(totalRemaining, settings.currency)}
                </span>
              </div>

              <div className="rounded-lg border border-slate-200/80 bg-white/95 px-2.5 py-1 shadow-3xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-tight">Planned Inflow</span>
                <span className="font-extrabold text-blue-700">
                  {formatCurrency(totalMonthlyCommitment, settings.currency)}/mo
                </span>
              </div>

              <div className="rounded-lg border border-slate-200/80 bg-white/95 px-2.5 py-1 shadow-3xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-tight">Goals Met</span>
                <span className="font-extrabold text-emerald-700">
                  {completedGoalsCount} / {savingsGoals.length}
                </span>
              </div>
            </div>
          </div>

          {/* Master Progress Bar */}
          <div className="mt-5 space-y-1.5">
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 transition-all duration-500 shadow-xs"
                style={{ width: `${overallProgressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400">
              <span>$0.00</span>
              <span>50%</span>
              <span>{formatCurrency(totalTarget, settings.currency)}</span>
            </div>
          </div>
        </div>

        {/* Right Card: Savings Goal Calculator Widget */}
        <div className="lg:col-span-5 rounded-xl border border-blue-200/85 bg-gradient-to-br from-blue-50/50 via-slate-50/40 to-emerald-50/30 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <div className="flex items-center gap-1.5">
                <PiggyBank className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                <span className="text-xs uppercase font-extrabold tracking-wider text-blue-800">
                  Savings Goal Calculator
                </span>
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-800 border border-blue-200/60">
                Calculator Widget
              </span>
            </div>

            {/* Inputs grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
              {/* Target Amount */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-500">Target Amount ({settings.currency})</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={calcTargetAmount}
                  onChange={(e) => setCalcTargetAmount(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 font-extrabold focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Duration (Months) */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-500">Duration (Months)</label>
                <input
                  type="number"
                  min="1"
                  max="360"
                  step="1"
                  value={calcDuration}
                  onChange={(e) => setCalcDuration(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 font-bold focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Annual Interest Rate (%) */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-500">Est. APY (%)</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  value={calcInterestRate}
                  onChange={(e) => setCalcInterestRate(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 font-bold focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Calculations and Output displays */}
            {(() => {
              const targetVal = parseFloat(calcTargetAmount) || 0;
              const durationVal = parseFloat(calcDuration) || 1;
              const interestRateVal = parseFloat(calcInterestRate) || 0;

              let calculatedContribution = 0;
              let totalInterestEarned = 0;
              let principalDeposits = targetVal;

              if (targetVal > 0 && durationVal > 0) {
                if (interestRateVal > 0) {
                  const i = (interestRateVal / 100) / 12; // monthly compounding rate
                  calculatedContribution = (targetVal * i) / (Math.pow(1 + i, durationVal) - 1);
                  principalDeposits = calculatedContribution * durationVal;
                  totalInterestEarned = Math.max(0, targetVal - principalDeposits);
                } else {
                  calculatedContribution = targetVal / durationVal;
                  principalDeposits = targetVal;
                  totalInterestEarned = 0;
                }
              }

              return (
                <div className="mt-3.5 space-y-2 text-[11px]">
                  <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-2.5 flex items-center justify-between shadow-3xs">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Required Monthly Contribution</span>
                      <strong className="text-base font-black text-blue-900 leading-none">
                        {formatCurrency(calculatedContribution, settings.currency)}
                      </strong>
                    </div>

                    {totalInterestEarned > 0 && (
                      <div className="text-right">
                        <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-800 border border-emerald-200/50">
                          +{formatCurrency(totalInterestEarned, settings.currency)} interest earned!
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold px-1">
                    <span>Principal: {formatCurrency(principalDeposits, settings.currency)}</span>
                    <span>Compound APY: {calcInterestRate}%</span>
                  </div>
                </div>
              );
            })()}
          </div>

          <button
            type="button"
            onClick={handleCreateGoalFromCalc}
            disabled={!(parseFloat(calcTargetAmount) > 0)}
            className="mt-4 w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold py-1.5 text-xs transition-colors shadow-2xs hover:shadow-xs cursor-pointer flex items-center justify-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Apply to My Target Goals</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. Individual Goal Cards Grid */}
      {/* ---------------------------------------------------- */}
      {filteredGoals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <PiggyBank className="mx-auto h-10 w-10 text-slate-300" />
          <h4 className="mt-2 text-sm font-bold text-slate-700">No savings goals found</h4>
          <p className="text-xs text-slate-500 mt-1">
            {filterStatus !== 'all'
              ? 'Try switching your filter to "All Goals" to view your records.'
              : 'Create your first target (e.g. Emergency Fund, Vacation, Down Payment) to start tracking!'}
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Target</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {filteredGoals.map((goal) => {
            const progress = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
            const isFinished = goal.currentAmount >= goal.targetAmount;
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            const monthsLeft =
              goal.monthlyContribution && goal.monthlyContribution > 0 && remaining > 0
                ? Math.ceil(remaining / goal.monthlyContribution)
                : null;
            const colorHex = goal.color || '#059669';

            return (
              <div
                key={goal.id}
                className="group relative rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                onClick={() => {
                  if (onSelectCell) {
                    onSelectCell({
                      reference: `Dashboard!Goal_${goal.name.replace(/\s+/g, '_')}`,
                      value: `${formatCurrency(goal.currentAmount, settings.currency)} / ${formatCurrency(goal.targetAmount, settings.currency)} (${progress.toFixed(1)}%)`,
                      formula: `=GOAL_PROGRESS("${goal.name}", ${goal.currentAmount}, ${goal.targetAmount})`,
                      isCalculated: true,
                    });
                  }
                }}
              >
                {/* Top Row: Icon, Title, Category Badge & Action Buttons */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs font-black text-sm"
                        style={{ backgroundColor: colorHex }}
                      >
                        {isFinished ? <Award className="h-5 w-5" /> : <Target className="h-4 w-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                            {goal.name}
                          </h4>
                          {isFinished ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Goal Reached!</span>
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                              {goal.categoryName || 'General Savings'}
                            </span>
                          )}
                        </div>

                        {goal.notes && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{goal.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Edit & Delete Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(goal);
                        }}
                        title="Edit savings goal"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGoal(goal.id, goal.name);
                        }}
                        title="Delete savings goal"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Amounts & Percentage Display */}
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-lg sm:text-xl font-black text-slate-900">
                        {formatCurrency(goal.currentAmount, settings.currency)}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 ml-1.5">
                        saved of <strong className="text-slate-700">{formatCurrency(goal.targetAmount, settings.currency)}</strong>
                      </span>
                    </div>
                    <span
                      className="text-xs sm:text-sm font-black"
                      style={{ color: isFinished ? '#059669' : colorHex }}
                    >
                      {progress.toFixed(1)}%
                    </span>
                  </div>

                  {/* Visual Goal Progress Bar with Milestone Markers */}
                  <div className="space-y-2">
                    <div className="relative h-4.5 w-full rounded-full bg-slate-100 border border-slate-200/80 shadow-inner flex items-center overflow-hidden">
                      {/* Milestone Indicators (25%, 50%, 75% tick marks) */}
                      {[25, 50, 75].map((ms) => {
                        const isReached = progress >= ms;
                        return (
                          <div
                            key={ms}
                            style={{ left: `${ms}%` }}
                            className="absolute top-0 bottom-0 w-px border-l border-dashed border-slate-400/60 z-10 flex flex-col justify-between items-center"
                          >
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isReached ? 'bg-emerald-600 scale-110' : 'bg-slate-300'}`} />
                            <span className="absolute bottom-0 text-[6.5px] font-extrabold text-slate-400 -translate-x-1/2">{ms}%</span>
                          </div>
                        );
                      })}

                      {/* Actual progress bar */}
                      <div
                        className="h-full rounded-full transition-all duration-500 shadow-3xs"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: colorHex,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-0.5">
                      <span>
                        {remaining > 0
                          ? `${formatCurrency(remaining, settings.currency)} remaining`
                          : '100% Funded 🎉'}
                      </span>
                      {goal.targetDate && (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-400">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>Target: {goal.targetDate}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Milestone badges & Time-to-Goal Projections */}
                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100 text-xs text-slate-600 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">
                      <span>Milestones Progress</span>
                      <span>Target Date Projection</span>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2">
                      {/* Milestone Badges */}
                      <div className="flex items-center gap-2">
                        {[25, 50, 75].map((ms) => {
                          const isMet = progress >= ms;
                          return (
                            <span
                              key={ms}
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-black border ${
                                isMet
                                  ? 'bg-emerald-100/90 text-emerald-800 border-emerald-200/60 shadow-3xs'
                                  : 'bg-slate-100 text-slate-400 border-slate-200'
                              }`}
                            >
                              <span>{ms}%</span>
                              <span>{isMet ? '★' : '🔒'}</span>
                            </span>
                          );
                        })}
                      </div>

                      {/* Time-to-Goal Projections side by side */}
                      <div className="text-right space-y-0.5 shrink-0">
                        {goal.monthlyContribution ? (
                          <div className="text-[10px] text-slate-500 font-medium leading-tight">
                            Allocated Contribution: <strong className="text-slate-800 font-bold">{monthsLeft !== null ? `~${monthsLeft} mo` : 'Funded'}</strong>
                          </div>
                        ) : null}

                        <div className="text-[10px] text-slate-500 font-medium leading-tight">
                          Actual Surplus Rate: <strong className="text-blue-700 font-black">{remaining > 0 ? (currentMonthlySavings > 0 ? `~${Math.ceil(remaining / currentMonthlySavings)} mo` : 'Infinite') : 'Funded'}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer Info & Quick Deposit Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    {goal.monthlyContribution ? (
                      <span className="font-semibold text-slate-700">
                        Planned: +{formatCurrency(goal.monthlyContribution, settings.currency)}/mo
                      </span>
                    ) : null}
                    {monthsLeft !== null && (
                      <span className="rounded bg-slate-150 px-1.5 py-0.5 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                        ~{monthsLeft} mo remaining
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenContribute(goal);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Add Funds</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. Modal: Add / Edit Goal */}
      {/* ---------------------------------------------------- */}
      {isAddGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <Target className="h-4 w-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingGoal ? 'Edit Savings Goal' : 'Create New Savings Goal'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddGoalModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-3.5 text-xs">
              {/* Goal Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Goal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Fund, Vacation, Down Payment..."
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Linked Category */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Category *</label>
                <select
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-hidden cursor-pointer"
                >
                  {uniqueCategoryNames.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Amount & Initial Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Amount ({settings.currency}) *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="10000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-extrabold text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Currently Saved</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Target Date & Monthly Contribution */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Date (Optional)</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Planned Monthly Addition</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="e.g. 500"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Goal Accent Color */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Color Accent</label>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setGoalColor(c.hex)}
                      className={`h-7 w-7 rounded-full transition-transform cursor-pointer border-2 ${
                        goalColor === c.hex ? 'scale-110 border-slate-900 shadow-xs' : 'border-white hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Goal Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. For peace of mind and liquid financial safety..."
                  value={goalNotes}
                  onChange={(e) => setGoalNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddGoalModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>{editingGoal ? 'Update Goal' : 'Create Goal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. Modal: Quick Contribution / Deposit */}
      {/* ---------------------------------------------------- */}
      {contributeGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <PiggyBank className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Add Funds to Goal</h3>
                  <p className="text-[11px] text-slate-500">{contributeGoal.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContributeGoal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleApplyContribution} className="space-y-3.5 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Currently Saved:</span>
                  <strong className="text-slate-800">
                    {formatCurrency(contributeGoal.currentAmount, settings.currency)}
                  </strong>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-slate-500">Target Goal:</span>
                  <strong className="text-slate-800">
                    {formatCurrency(contributeGoal.targetAmount, settings.currency)}
                  </strong>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">Quick Increment</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['50', '100', '250', '500'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setContributionAmount(val)}
                      className={`rounded-lg border px-2 py-1 text-xs font-bold transition-all cursor-pointer ${
                        contributionAmount === val
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Contribution Amount ({settings.currency})
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="0.00"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-black text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setContributeGoal(null)}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Deposit Funds</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
