import React, { useState, useMemo } from 'react';
import {
  Debt,
  SettingsState,
} from '../../types/budget';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  DollarSign,
  HelpCircle,
  Info,
  Percent,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingDown,
  Trash2,
  ListCollapse,
} from 'lucide-react';

interface DebtPayoffSheetProps {
  debts: Debt[];
  onUpdateDebts: (debts: Debt[]) => void;
  settings: SettingsState;
  highlightInputs: boolean;
  onSelectCell: (info: { reference: string; value: string; formula?: string; isCalculated: boolean }) => void;
}

export const DebtPayoffSheet: React.FC<DebtPayoffSheetProps> = ({
  debts,
  onUpdateDebts,
  settings,
  highlightInputs,
  onSelectCell,
}) => {
  // Simulator inputs
  const [additionalPayment, setAdditionalPayment] = useState<number>(300);
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche' | 'minimums'>('snowball');

  // Interactive Debt Form
  const [newDebtName, setNewDebtName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newInterestRate, setNewInterestRate] = useState('');
  const [newMinimumPayment, setNewMinimumPayment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Table selection / Excel highlight
  const [activeCellRef, setActiveCellRef] = useState<string | null>(null);

  // Amortization table collapsed state
  const [isAmortizationExpanded, setIsAmortizationExpanded] = useState(true);

  // Active cell selection helper
  const handleCellSelect = (ref: string, val: string, formula?: string, isCalc = true) => {
    setActiveCellRef(ref);
    onSelectCell({
      reference: `DebtPayoff!${ref}`,
      value: val,
      formula,
      isCalculated: isCalc,
    });
  };

  // Add / Edit Debt handler
  const handleAddOrEditDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = parseFloat(newBalance);
    const rate = parseFloat(newInterestRate);
    const minPay = parseFloat(newMinimumPayment);

    if (!newDebtName.trim() || isNaN(bal) || bal <= 0 || isNaN(rate) || rate < 0 || isNaN(minPay) || minPay <= 0) {
      alert('Please fill out all fields with valid positive numbers.');
      return;
    }

    if (minPay >= bal) {
      alert('Minimum payment cannot be greater than or equal to the total balance.');
      return;
    }

    if (editingId) {
      // Edit
      const updated = debts.map((d) =>
        d.id === editingId
          ? {
              ...d,
              name: newDebtName.trim(),
              balance: bal,
              interestRate: rate,
              minimumPayment: minPay,
            }
          : d
      );
      onUpdateDebts(updated);
      setEditingId(null);
    } else {
      // Add
      const colors = ['#e11d48', '#0284c7', '#8b5cf6', '#d97706', '#0d9488', '#0891b2', '#4f46e5', '#10b981'];
      const randomColor = colors[debts.length % colors.length];
      const newDebt: Debt = {
        id: `debt_${Date.now()}`,
        name: newDebtName.trim(),
        balance: bal,
        interestRate: rate,
        minimumPayment: minPay,
        color: randomColor,
      };
      onUpdateDebts([...debts, newDebt]);
    }

    // Reset Form
    setNewDebtName('');
    setNewBalance('');
    setNewInterestRate('');
    setNewMinimumPayment('');
  };

  const handleEditClick = (debt: Debt) => {
    setEditingId(debt.id);
    setNewDebtName(debt.name);
    setNewBalance(String(debt.balance));
    setNewInterestRate(String(debt.interestRate));
    setNewMinimumPayment(String(debt.minimumPayment));
  };

  const handleDeleteDebt = (id: string) => {
    onUpdateDebts(debts.filter((d) => d.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setNewDebtName('');
      setNewBalance('');
      setNewInterestRate('');
      setNewMinimumPayment('');
    }
  };

  // ----------------------------------------------------
  // AMORTIZATION ENGINE & PRIORITIZATION
  // ----------------------------------------------------
  const payoffSimulation = useMemo(() => {
    if (debts.length === 0) {
      return {
        monthlySchedule: [],
        debtStats: {},
        overallStats: {
          totalMonths: 0,
          totalInterest: 0,
          totalPayments: 0,
          originalTotalBalance: 0,
          minimumsTotalMonths: 0,
          minimumsTotalInterest: 0,
          interestSaved: 0,
          monthsSaved: 0,
        },
        hasWarning: false,
        warningMessage: '',
      };
    }

    const originalTotalBalance = debts.reduce((sum, d) => sum + d.balance, 0);

    // Run BOTH the strategy simulation AND the "Minimums Only" baseline
    const runSimulation = (simStrategy: 'snowball' | 'avalanche' | 'minimums', simExtraPayment: number) => {
      // Clone debts to track active state & balances
      const activeDebts = debts.map((d) => ({
        ...d,
        currentBalance: d.balance,
        monthlyInterestPaid: 0,
        totalInterestPaid: 0,
        payoffMonth: 0,
      }));

      const monthlySchedule: any[] = [];
      let totalInterest = 0;
      let totalPayments = 0;
      let month = 0;
      const maxMonths = 360; // 30 year safety cap
      let warning = false;
      let warningMsg = '';

      // Total minimums at start
      const startMinPaymentsSum = activeDebts.reduce((sum, d) => sum + d.minimumPayment, 0);
      // Total monthly debt payment budget
      const totalMonthlyBudget = startMinPaymentsSum + simExtraPayment;

      while (activeDebts.some((d) => d.currentBalance > 0) && month < maxMonths) {
        month++;
        const currentActiveDebts = activeDebts.filter((d) => d.currentBalance > 0);

        // 1. Calculate Monthly Interest and verify if payments are sufficient
        let totalInterestThisMonth = 0;
        let totalMinPaymentsRequiredThisMonth = 0;

        for (const debt of currentActiveDebts) {
          const monthlyRate = debt.interestRate / 12 / 100;
          const interestCharge = debt.currentBalance * monthlyRate;

          if (interestCharge >= debt.minimumPayment) {
            warning = true;
            warningMsg = `Warning: The minimum payment for "${debt.name}" is less than its monthly interest charge (${formatCurrency(interestCharge, settings.currency)}). The balance is growing! Please increase payments.`;
          }

          debt.monthlyInterestPaid = interestCharge;
          debt.totalInterestPaid += interestCharge;
          totalInterestThisMonth += interestCharge;
          totalMinPaymentsRequiredThisMonth += debt.minimumPayment;
        }

        totalInterest += totalInterestThisMonth;

        // 2. Determine payment allocations
        const monthlyAllocation: Record<string, number> = {};
        let pool = totalMonthlyBudget;

        // If "minimums" or strategy has no extra, pool is just minimum payments required
        if (simStrategy === 'minimums') {
          pool = totalMinPaymentsRequiredThisMonth;
        }

        // Allocate minimum payments first
        for (const debt of currentActiveDebts) {
          const minNeeded = Math.min(debt.currentBalance + debt.monthlyInterestPaid, debt.minimumPayment);
          monthlyAllocation[debt.id] = minNeeded;
          pool -= minNeeded;
        }

        // Prioritize any leftover extra payment pool (and rolled-over minimums!)
        if (pool > 0 && currentActiveDebts.length > 0) {
          // Sort remaining active debts based on strategy
          let sortedPriorities = [...currentActiveDebts];
          if (simStrategy === 'snowball') {
            // Lowest balance first
            sortedPriorities.sort((a, b) => a.currentBalance - b.currentBalance);
          } else if (simStrategy === 'avalanche') {
            // Highest interest rate first
            sortedPriorities.sort((a, b) => b.interestRate - a.interestRate);
          }

          // Distribute the pool to priority debts
          for (const debt of sortedPriorities) {
            if (pool <= 0) break;
            const remainingToPayOff = debt.currentBalance + debt.monthlyInterestPaid - monthlyAllocation[debt.id];
            if (remainingToPayOff > 0) {
              const extraToPay = Math.min(remainingToPayOff, pool);
              monthlyAllocation[debt.id] += extraToPay;
              pool -= extraToPay;
            }
          }
        }

        // Apply payments to balances (deduct payment, add interest)
        const balanceState: Record<string, number> = {};
        let totalRemainingBalanceThisMonth = 0;
        let paymentMadeThisMonth = 0;

        for (const debt of activeDebts) {
          if (debt.currentBalance > 0) {
            const pay = monthlyAllocation[debt.id] || 0;
            paymentMadeThisMonth += pay;
            const newBal = Math.max(0, debt.currentBalance + debt.monthlyInterestPaid - pay);
            debt.currentBalance = newBal;

            if (newBal === 0 && debt.payoffMonth === 0) {
              debt.payoffMonth = month;
            }
            balanceState[debt.id] = newBal;
            totalRemainingBalanceThisMonth += newBal;
          } else {
            balanceState[debt.id] = 0;
          }
        }

        totalPayments += paymentMadeThisMonth;

        // Push monthly snapshot
        monthlySchedule.push({
          month,
          balances: balanceState,
          payment: paymentMadeThisMonth,
          interest: totalInterestThisMonth,
          totalRemaining: totalRemainingBalanceThisMonth,
        });

        // Loop safety
        if (totalRemainingBalanceThisMonth <= 0) {
          break;
        }
      }

      // Format debt stats
      const debtStats: Record<string, { payoffMonth: number; totalInterest: number }> = {};
      for (const debt of activeDebts) {
        debtStats[debt.id] = {
          payoffMonth: debt.payoffMonth || month,
          totalInterest: debt.totalInterestPaid,
        };
      }

      return {
        monthlySchedule,
        debtStats,
        totalMonths: month,
        totalInterest,
        totalPayments,
        hasWarning: warning,
        warningMessage: warningMsg,
      };
    };

    // Run active strategy
    const activeSimResult = runSimulation(strategy, additionalPayment);

    // Run "Minimum Payments Only" baseline (no additional payment, minimums strategy)
    const baselineSimResult = runSimulation('minimums', 0);

    const interestSaved = Math.max(0, baselineSimResult.totalInterest - activeSimResult.totalInterest);
    const monthsSaved = Math.max(0, baselineSimResult.totalMonths - activeSimResult.totalMonths);

    return {
      monthlySchedule: activeSimResult.monthlySchedule,
      debtStats: activeSimResult.debtStats,
      overallStats: {
        totalMonths: activeSimResult.totalMonths,
        totalInterest: activeSimResult.totalInterest,
        totalPayments: activeSimResult.totalPayments,
        originalTotalBalance,
        minimumsTotalMonths: baselineSimResult.totalMonths,
        minimumsTotalInterest: baselineSimResult.totalInterest,
        interestSaved,
        monthsSaved,
      },
      hasWarning: activeSimResult.hasWarning,
      warningMessage: activeSimResult.warningMessage,
    };
  }, [debts, additionalPayment, strategy, settings.currency]);

  // Convert month number to a real calendar month string
  const getPayoffDateString = (monthsFromNow: number) => {
    if (monthsFromNow <= 0) return 'Immediate';
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const currentMonthIdx = monthNames.indexOf(settings.month.substring(0, 3));
    const currentYear = settings.year;

    const totalMonths = (currentYear * 12) + (currentMonthIdx >= 0 ? currentMonthIdx : 0) + monthsFromNow;
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonthIdx = totalMonths % 12;

    return `${monthNames[targetMonthIdx]} ${targetYear}`;
  };

  const totalMinimumPaymentSum = debts.reduce((sum, d) => sum + d.minimumPayment, 0);

  // Class helper for inputs highlight
  const inputClass = highlightInputs
    ? 'bg-amber-50/70 border-amber-300 focus:border-amber-400 focus:ring-amber-200'
    : 'bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-100';

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ---------------------------------------------------- */}
      {/* Header Banner */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs shrink-0">
              <TrendingDown className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Debt Payoff Worksheet & Simulator
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Simulate acceleration strategies (Snowball vs. Avalanche) to destroy your debt sooner and save interest.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-100">
            <Calculator className="h-3.5 w-3.5" />
            <span>Interactive Amortization</span>
          </span>
        </div>
      </div>

      {/* Warning message from simulation */}
      {payoffSimulation.hasWarning && (
        <div className="flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 shadow-2xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <span className="font-bold">Debt Growth Warning: </span>
            {payoffSimulation.warningMessage}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Top Row: Executive Strategy Controller & Dashboard Cards */}
      {/* ---------------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Strategy Control Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-4 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-rose-600" />
              <span>Acceleration Settings</span>
            </h3>
          </div>

          {/* Strategy Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500">Acceleration Strategy</label>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setStrategy('snowball')}
                className={`rounded-md py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  strategy === 'snowball'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Prioritize lowest balances first (emotional/motivational win)"
              >
                Snowball
              </button>
              <button
                type="button"
                onClick={() => setStrategy('avalanche')}
                className={`rounded-md py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  strategy === 'avalanche'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Prioritize highest interest rates first (mathematically optimal)"
              >
                Avalanche
              </button>
              <button
                type="button"
                onClick={() => setStrategy('minimums')}
                className={`rounded-md py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  strategy === 'minimums'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Minimum monthly payments only"
              >
                Minimums
              </button>
            </div>
          </div>

          {/* Additional Monthly Snowball Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500">Additional Monthly Payment</label>
              <span className="font-mono text-xs font-bold text-rose-600">
                +{formatCurrency(additionalPayment, settings.currency)}/mo
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2000"
              step="50"
              value={additionalPayment}
              onChange={(e) => setAdditionalPayment(Number(e.target.value))}
              disabled={strategy === 'minimums'}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-rose-600 disabled:opacity-40"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>$0</span>
              <span>$1,000</span>
              <span>$2,000</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 leading-relaxed border border-slate-100">
            {strategy === 'snowball' && (
              <p>
                <strong>Debt Snowball Strategy:</strong> After paying minimums, all extra money ({formatCurrency(additionalPayment, settings.currency)} + rolled-over minimums of paid-off debts) is thrown at the <strong className="text-rose-700">lowest balance debt</strong>. This secures rapid psychological victories!
              </p>
            )}
            {strategy === 'avalanche' && (
              <p>
                <strong>Debt Avalanche Strategy:</strong> After paying minimums, all extra money is applied to the debt with the <strong className="text-rose-700">highest interest rate</strong>. This saves you the maximum amount of interest and pays off the total debt quickest!
              </p>
            )}
            {strategy === 'minimums' && (
              <p>
                <strong>Minimum Payments Only Baseline:</strong> Illustrates the interest and timeline of paying only the minimum contractual payments without using snowballing or extra buffers. Useful as a benchmark!
              </p>
            )}
          </div>
        </div>

        {/* Dynamic Financial KPI Cards */}
        <div className="lg:col-span-8 flex flex-col justify-between gap-4">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* KPI 1: Total Debt */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[100px]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Debt Balance</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                {formatCurrency(payoffSimulation.overallStats.originalTotalBalance, settings.currency)}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 mt-2 flex items-center gap-1">
                <CreditCard className="h-3 w-3 text-slate-400 shrink-0" />
                <span>Across {debts.length} outstanding accounts</span>
              </span>
            </div>

            {/* KPI 2: Final Payoff Month */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[100px]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Debt Free Goal</span>
              <span className="text-xl sm:text-2xl font-black text-rose-700 font-mono mt-1">
                {getPayoffDateString(payoffSimulation.overallStats.totalMonths)}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>In {payoffSimulation.overallStats.totalMonths} months total</span>
              </span>
            </div>

            {/* KPI 3: Interest Paid */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[100px]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Interest Paid</span>
              <span className="text-xl sm:text-2xl font-black text-amber-700 font-mono mt-1">
                {formatCurrency(payoffSimulation.overallStats.totalInterest, settings.currency)}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 mt-2">
                Equivalent to {((payoffSimulation.overallStats.totalInterest / (payoffSimulation.overallStats.originalTotalBalance || 1)) * 100).toFixed(1)}% of starting principal
              </span>
            </div>

            {/* KPI 4: Accelerated Savings */}
            <div className="rounded-xl border border-slate-200 bg-emerald-50/70 border-emerald-200 p-4 shadow-2xs flex flex-col justify-between min-h-[100px]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">Saved with Snowball</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-800 font-mono mt-1">
                {formatCurrency(payoffSimulation.overallStats.interestSaved, settings.currency)}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 mt-2 flex items-center gap-1">
                <span>Accelerated payoff by <strong className="underline">{payoffSimulation.overallStats.monthsSaved} months</strong> sooner!</span>
              </span>
            </div>
          </div>

          {/* Graphical paydown progress bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-rose-500" />
                <span>Overall Debt Amortization Progress</span>
              </span>
              <span className="font-mono text-xs font-bold text-slate-500">
                {debts.length > 0 ? '100% Amortized Schedule Calculated' : 'No debts entered'}
              </span>
            </div>

            {/* Simulated payoff distribution visualization */}
            {debts.length > 0 ? (
              <div className="space-y-4">
                <div className="relative h-6 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex">
                  {debts.map((debt, index) => {
                    const pctOfTotal = (debt.balance / payoffSimulation.overallStats.originalTotalBalance) * 100;
                    return (
                      <div
                        key={debt.id}
                        style={{
                          width: `${pctOfTotal}%`,
                          backgroundColor: debt.color || '#e11d48',
                        }}
                        className="h-full border-r border-white/20 transition-all hover:opacity-90 relative group cursor-pointer"
                        title={`${debt.name}: ${formatCurrency(debt.balance, settings.currency)} (${pctOfTotal.toFixed(1)}%)`}
                      />
                    );
                  })}
                </div>
                {/* Micro Color Legend for entered debts */}
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  {debts.map((debt) => (
                    <div key={debt.id} className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: debt.color }} />
                      <span className="font-semibold text-slate-700">{debt.name}</span>
                      <span className="font-mono text-slate-500">({formatCurrency(debt.balance, settings.currency)})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400 text-xs">
                <Info className="h-5 w-5 mb-1" />
                <span>Input debts below to visualize your combined paydown path</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Middle Grid: Excel Sheet Style Debt Ledger & Edit Form */}
      {/* ---------------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Form to Add / Edit Debts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-4">
          <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              {editingId ? 'Edit Outstanding Debt' : 'Add Outstanding Debt'}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setNewDebtName('');
                  setNewBalance('');
                  setNewInterestRate('');
                  setNewMinimumPayment('');
                }}
                className="text-xs text-rose-600 font-semibold hover:underline"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleAddOrEditDebt} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Debt Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Chase Visa, Car Loan"
                  value={newDebtName}
                  onChange={(e) => setNewDebtName(e.target.value)}
                  className={`w-full rounded-lg border py-2 pl-3 pr-8 text-xs font-semibold outline-none transition-all ${inputClass}`}
                />
                <CreditCard className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">Balance</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="5000"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    className={`w-full rounded-lg border py-2 pl-6 pr-1 text-xs font-mono font-bold outline-none transition-all ${inputClass}`}
                  />
                  <DollarSign className="absolute left-1.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">Rate (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    placeholder="18.9"
                    value={newInterestRate}
                    onChange={(e) => setNewInterestRate(e.target.value)}
                    className={`w-full rounded-lg border py-2 pl-2 pr-5 text-xs font-mono font-bold outline-none transition-all ${inputClass}`}
                  />
                  <Percent className="absolute right-1.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">Min. Pay</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="120"
                    value={newMinimumPayment}
                    onChange={(e) => setNewMinimumPayment(e.target.value)}
                    className={`w-full rounded-lg border py-2 pl-6 pr-1 text-xs font-mono font-bold outline-none transition-all ${inputClass}`}
                  />
                  <DollarSign className="absolute left-1.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{editingId ? 'Save Debt Modifications' : 'Add Outstanding Debt'}</span>
            </button>
          </form>

          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-500 leading-normal flex items-start gap-2">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-700 block">Amortization Tip:</strong>
              Your regular monthly debt payments should be modeled in your expense log under "Debt Payments" categories to maintain an accurate cashflow budget!
            </div>
          </div>
        </div>

        {/* Google Sheets Style Spreadsheet Grid for Debts */}
        <div className="rounded-2xl border border-[#cbddec] bg-white shadow-xs overflow-hidden lg:col-span-8 flex flex-col justify-between">
          <div className="bg-gradient-to-r from-[#eef6fc] to-[#f4f9fd] border-b border-[#cbddec] px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-bold text-[#1d4d7a] flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-600" />
              <span>tbl_Debt_Ledger • Double-entry formatted</span>
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              GRID: COLUMN A to F
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px] border-collapse">
              {/* Google Sheets Header: Column Letters Row */}
              <thead>
                <tr className="bg-slate-100 border-b border-[#cbddec] text-center text-slate-500 select-none text-[10px] font-bold h-6">
                  <td className="w-8 border-r border-[#cbddec] bg-[#f1f5f9]"></td>
                  <td className="border-r border-[#cbddec] text-left px-3">A</td>
                  <td className="border-r border-[#cbddec]">B</td>
                  <td className="border-r border-[#cbddec]">C</td>
                  <td className="border-r border-[#cbddec]">D</td>
                  <td className="border-r border-[#cbddec]">E</td>
                  <td className="border-r border-[#cbddec]">F</td>
                  <td className="w-20 bg-[#f1f5f9]"></td>
                </tr>
                {/* Table Field Titles Row */}
                <tr className="bg-slate-50/80 border-b border-[#cbddec] text-[#0c325c] font-black text-xs select-none">
                  <th className="border-r border-[#cbddec] bg-slate-100 text-center text-slate-400 text-[10px] h-8">#</th>
                  <th className="border-r border-[#cbddec] px-3 py-1.5 font-bold">Debt Name</th>
                  <th className="border-r border-[#cbddec] px-3 py-1.5 text-right font-bold w-28">Starting Balance</th>
                  <th className="border-r border-[#cbddec] px-3 py-1.5 text-right font-bold w-24">Interest Rate</th>
                  <th className="border-r border-[#cbddec] px-3 py-1.5 text-right font-bold w-28">Min. Monthly</th>
                  <th className="border-r border-[#cbddec] px-3 py-1.5 text-center font-bold w-32">Payoff Date</th>
                  <th className="border-r border-[#cbddec] px-3 py-1.5 text-right font-bold w-32">Est. Interest</th>
                  <th className="px-3 py-1.5 text-center font-bold">Actions</th>
                </tr>
              </thead>

              {/* Table Data Rows */}
              <tbody className="divide-y divide-[#cbddec]/70">
                {debts.map((debt, index) => {
                  const rId = index + 1;
                  const dStats = payoffSimulation.debtStats[debt.id] || { payoffMonth: 0, totalInterest: 0 };
                  const payoffStr = getPayoffDateString(dStats.payoffMonth);

                  // Unique cell highlights
                  const rowRef = `DebtPayoff!Row_${rId}`;

                  return (
                    <tr
                      key={debt.id}
                      onClick={() => handleCellSelect(`A${rId}`, `${debt.name} details`, `=tbl_Debt_Ledger[${debt.name}]`, false)}
                      className={`hover:bg-slate-50 border-b border-[#cbddec]/40 transition-colors cursor-pointer group ${
                        activeCellRef?.startsWith(`A${rId}`) ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      {/* Row Gutters */}
                      <td className="border-r border-[#cbddec] bg-slate-100 text-center font-medium text-slate-400 text-[10px] select-none h-9">
                        {rId}
                      </td>

                      {/* Column A: Name */}
                      <td className="border-r border-[#cbddec] px-3 py-1.5 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: debt.color }} />
                          <span>{debt.name}</span>
                        </div>
                      </td>

                      {/* Column B: Balance */}
                      <td className="border-r border-[#cbddec] px-3 py-1.5 text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(debt.balance, settings.currency)}
                      </td>

                      {/* Column C: Interest Rate */}
                      <td className="border-r border-[#cbddec] px-3 py-1.5 text-right font-mono text-slate-600">
                        {debt.interestRate.toFixed(2)}%
                      </td>

                      {/* Column D: Minimum payment */}
                      <td className="border-r border-[#cbddec] px-3 py-1.5 text-right font-mono text-slate-600">
                        {formatCurrency(debt.minimumPayment, settings.currency)}
                      </td>

                      {/* Column E: Payoff Date (Calculated) */}
                      <td className="border-r border-[#cbddec] px-3 py-1.5 text-center font-bold text-rose-600 bg-rose-50/20 font-mono">
                        {payoffStr}
                      </td>

                      {/* Column F: Total Interest Paid (Calculated) */}
                      <td className="border-r border-[#cbddec] px-3 py-1.5 text-right font-mono font-bold text-amber-700 bg-amber-50/10">
                        {formatCurrency(dStats.totalInterest, settings.currency)}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-1.5 text-center bg-slate-50/30">
                        <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleEditClick(debt); }}
                            className="rounded p-1 text-slate-600 hover:bg-slate-200 hover:text-slate-950 cursor-pointer"
                            title="Edit this account"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteDebt(debt.id); }}
                            className="rounded p-1 text-rose-600 hover:bg-rose-100 hover:text-rose-950 cursor-pointer"
                            title="Delete this account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Empty baseline placeholder */}
                {debts.length === 0 && (
                  <tr>
                    <td className="border-r border-[#cbddec] bg-slate-100 text-center font-medium text-slate-400 text-[10px] select-none h-12">1</td>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400 text-xs">
                      No outstanding debts added yet. Use the form on the left to initialize accounts.
                    </td>
                  </tr>
                )}

                {/* Totals & Excel Summary footer */}
                <tr className="bg-slate-100/90 font-black text-[#0c325c] border-t border-[#cbddec]">
                  <td className="border-r border-[#cbddec] bg-slate-150 text-center text-slate-400 text-[10px] select-none h-10">T</td>
                  <td className="border-r border-[#cbddec] px-3 py-2 text-xs font-bold text-slate-800">
                    Total Summary Formula
                  </td>
                  <td className="border-r border-[#cbddec] px-3 py-2 text-right font-mono font-extrabold text-slate-900 text-xs">
                    {formatCurrency(payoffSimulation.overallStats.originalTotalBalance, settings.currency)}
                  </td>
                  <td className="border-r border-[#cbddec] px-3 py-2 text-right font-mono text-slate-500 text-xs">
                    {debts.length > 0 ? `${(debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length).toFixed(2)}% avg` : '—'}
                  </td>
                  <td className="border-r border-[#cbddec] px-3 py-2 text-right font-mono text-slate-900 text-xs">
                    {formatCurrency(totalMinimumPaymentSum, settings.currency)}
                  </td>
                  <td className="border-r border-[#cbddec] px-3 py-2 text-center text-rose-700 font-black font-mono">
                    {debts.length > 0 ? getPayoffDateString(payoffSimulation.overallStats.totalMonths) : '—'}
                  </td>
                  <td className="border-r border-[#cbddec] px-3 py-2 text-right font-mono font-black text-amber-800 text-xs bg-amber-50/20">
                    {formatCurrency(payoffSimulation.overallStats.totalInterest, settings.currency)}
                  </td>
                  <td className="px-3 py-2 bg-slate-150 text-center text-[10px] text-slate-500 font-bold uppercase select-none">
                    Calculated
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Collapsible Monthly Amortization Schedule Table */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-2xl border border-[#cbddec] bg-white shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setIsAmortizationExpanded(!isAmortizationExpanded)}
          className="w-full bg-slate-50 hover:bg-slate-100 border-b border-[#cbddec] px-4 py-3 flex items-center justify-between transition-colors select-none text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ListCollapse className="h-4 w-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Interactive Month-by-Month Payoff Projection
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{isAmortizationExpanded ? 'Collapse' : 'Expand'} Projection Schedule</span>
            {isAmortizationExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {isAmortizationExpanded && (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs min-w-[700px] border-collapse relative">
              <thead className="sticky top-0 bg-slate-100 shadow-sm border-b border-[#cbddec] text-[#0c325c] font-bold z-10">
                <tr className="border-b border-[#cbddec] text-[10px] text-slate-500">
                  <th className="w-12 border-r border-[#cbddec] bg-slate-150 text-center py-1 select-none">#</th>
                  <th className="border-r border-[#cbddec] px-3 py-2 text-center w-20">Month</th>
                  {debts.map((debt) => (
                    <th key={debt.id} className="border-r border-[#cbddec] px-3 py-2 text-right">
                      {debt.name} Balance
                    </th>
                  ))}
                  <th className="border-r border-[#cbddec] px-3 py-2 text-right w-32 bg-amber-50/30">
                    Interest This Month
                  </th>
                  <th className="border-r border-[#cbddec] px-3 py-2 text-right w-32 bg-rose-50/30">
                    Total Monthly Payment
                  </th>
                  <th className="px-3 py-2 text-right w-32 bg-blue-50/30">
                    Cumulative Debt Left
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cbddec]/60">
                {payoffSimulation.monthlySchedule.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                    <td className="border-r border-[#cbddec] bg-slate-50 text-center text-[10px] text-slate-400 select-none py-1.5 font-mono">
                      {row.month}
                    </td>
                    <td className="border-r border-[#cbddec] px-3 py-1.5 text-center font-mono text-slate-600">
                      {getPayoffDateString(row.month)}
                    </td>
                    {debts.map((debt) => (
                      <td key={debt.id} className="border-r border-[#cbddec] px-3 py-1.5 text-right font-mono text-slate-700">
                        {formatCurrency(row.balances[debt.id] ?? 0, settings.currency)}
                      </td>
                    ))}
                    <td className="border-r border-[#cbddec] px-3 py-1.5 text-right font-mono text-amber-700 bg-amber-50/10">
                      {formatCurrency(row.interest, settings.currency)}
                    </td>
                    <td className="border-r border-[#cbddec] px-3 py-1.5 text-right font-mono font-semibold text-rose-600 bg-rose-50/10">
                      {formatCurrency(row.payment, settings.currency)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono font-bold text-blue-900 bg-blue-50/10">
                      {formatCurrency(row.totalRemaining, settings.currency)}
                    </td>
                  </tr>
                ))}

                {payoffSimulation.monthlySchedule.length === 0 && (
                  <tr>
                    <td colSpan={5 + debts.length} className="px-4 py-8 text-center text-slate-400 text-xs">
                      No paydown schedule computed. Input accounts above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
