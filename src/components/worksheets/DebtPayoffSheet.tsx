import React, { useState, useMemo } from 'react';
import { validateDebtDraftValues } from '../../utils/financialPlanning';
import {
  Debt,
  DebtPayment,
  FinancialAsset,
  SettingsState,
} from '../../types/budget';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  TrendingDown,
  Calculator,
  AlertCircle,
  Sparkles,
  CreditCard,
  CheckCircle2,
  Percent,
  Plus,
  RefreshCw,
  Trash2,
  ListCollapse,
  ChevronUp,
  ChevronDown,
  Info,
  Scale,
  Calendar,
  PiggyBank,
  Check
} from 'lucide-react';

interface DebtPayoffSheetProps {
  debts: Debt[];
  debtPayments: DebtPayment[];
  financialAssets: FinancialAsset[];
  onUpdateDebts: (debts: Debt[]) => void;
  onUpdateDebtPayments: (payments: DebtPayment[]) => void;
  settings: SettingsState;
  highlightInputs: boolean;
  onSelectCell: (info: { reference: string; value: string; formula?: string; isCalculated: boolean }) => void;
}

export const DebtPayoffSheet: React.FC<DebtPayoffSheetProps> = ({
  debts,
  debtPayments,
  financialAssets,
  onUpdateDebts,
  onUpdateDebtPayments,
  settings,
  highlightInputs,
  onSelectCell,
}) => {
  // Strategy States
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche' | 'minimums'>('snowball');
  const [additionalPayment, setAdditionalPayment] = useState<number>(150);
  const [isAmortizationExpanded, setIsAmortizationExpanded] = useState<boolean>(true);

  // Form states to Add / Edit Debt
  const [newDebtName, setNewDebtName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newInterestRate, setNewInterestRate] = useState('');
  const [newMinimumPayment, setNewMinimumPayment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paymentDebtId, setPaymentDebtId] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentInterest, setPaymentInterest] = useState('');
  const [paymentDate, setPaymentDate] = useState(`${settings.year}-${String(['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(settings.month) + 1).padStart(2, '0')}-01`);

  // Table selection / Excel highlight
  const [activeCellRef, setActiveCellRef] = useState<string | null>(null);

  const handleCellSelect = (ref: string, val: string, formula = '', isCalculated = false) => {
    setActiveCellRef(ref);
    onSelectCell({ reference: `DebtPayoff!${ref}`, value: val, formula, isCalculated });
  };

  // Color options for debts
  const DEBT_COLORS = ['#e11d48', '#d97706', '#059669', '#2563eb', '#7c3aed', '#db2777', '#4b5563', '#0891b2'];

  const handleAddOrEditDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = parseFloat(newBalance);
    const rate = parseFloat(newInterestRate);
    const minPay = parseFloat(newMinimumPayment);

    if (!newDebtName.trim() || !validateDebtDraftValues(bal, rate, minPay)) {
      alert('Please fill out all fields with valid positive numbers.');
      return;
    }

    if (editingId) {
      // Save Edit
      onUpdateDebts(debts.map((d) =>
        d.id === editingId
          ? { ...d, name: newDebtName.trim(), balance: bal, interestRate: rate, minimumPayment: minPay }
          : d
      ));
      setEditingId(null);
    } else {
      // Add New Debt
      const newDebt: Debt = {
        id: `debt_${Date.now()}`,
        name: newDebtName.trim(),
        balance: bal,
        openingBalance: bal,
        interestRate: rate,
        minimumPayment: minPay,
        color: DEBT_COLORS[debts.length % DEBT_COLORS.length],
      };
      onUpdateDebts([...debts, newDebt]);
    }

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
    if (confirm('Are you sure you want to delete this debt? This resets its payoff schedule calculations.')) {
      onUpdateDebts(debts.filter((d) => d.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setNewDebtName('');
        setNewBalance('');
        setNewInterestRate('');
        setNewMinimumPayment('');
      }
    }
  };

  // Amortization Schedule Core Simulator Engine
  const payoffSimulation = useMemo(() => {
    const originalTotalBalance = debts.reduce((sum, d) => sum + d.balance, 0);
    if (debts.length === 0) {
      return {
        monthlySchedule: [],
        debtStats: {},
        scenarios: [],
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

    const runSimulation = (simStrategy: 'snowball' | 'avalanche' | 'minimums', extraPayment: number) => {
      // Create deep copy of debts
      let activeDebts = debts.map((d) => ({
        id: d.id,
        name: d.name,
        balance: d.balance,
        interestRate: d.interestRate,
        minimumPayment: d.minimumPayment,
        totalInterestPaid: 0,
        payoffMonth: null as number | null,
      }));

      const monthlySchedule = [];
      let month = 0;
      let totalInterest = 0;
      let totalPayments = 0;
      const maxSimulationMonths = 360; // 30-year loop ceiling
      let warning = false;
      let warningMsg = '';

      while (activeDebts.some((d) => d.balance > 0) && month < maxSimulationMonths) {
        month += 1;

        // 1. Calculate monthly accrued interest
        activeDebts.forEach((d) => {
          if (d.balance > 0) {
            const monthlyInterest = d.balance * (d.interestRate / 100 / 12);
            d.totalInterestPaid += monthlyInterest;
            totalInterest += monthlyInterest;
            d.balance += monthlyInterest;
          }
        });

        // 2. Determine available extra accelerator buffer
        let baseContractualMinimumSum = 0;
        let activeDebtsForPayment = activeDebts.filter((d) => d.balance > 0);

        activeDebtsForPayment.forEach((d) => {
          baseContractualMinimumSum += d.minimumPayment;
        });

        // Extra snowball is extra payment + minimum payments rolled over from previously paid off debts
        const totalAllocatedMonthlyPool = baseContractualMinimumSum + (simStrategy === 'minimums' ? 0 : extraPayment);
        let unusedBufferForAccelerator = totalAllocatedMonthlyPool;

        // 3. Step A: Pay contractual minimums first
        const balanceState: Record<string, number> = {};
        let paymentMadeThisMonth = 0;

        // Map state for table output
        const tempDebtPayments: Record<string, number> = {};
        activeDebts.forEach((d) => {
          tempDebtPayments[d.id] = 0;
        });

        activeDebtsForPayment.forEach((d) => {
          const contractualMin = Math.min(d.balance, d.minimumPayment);
          d.balance -= contractualMin;
          unusedBufferForAccelerator -= contractualMin;
          paymentMadeThisMonth += contractualMin;
          tempDebtPayments[d.id] += contractualMin;
        });

        // 4. Step B: Apply accelerator buffer to target priority debt
        if (unusedBufferForAccelerator > 0 && simStrategy !== 'minimums' && activeDebtsForPayment.length > 0) {
          // Sort active debts by strategy
          let priorityDebtId = activeDebtsForPayment[0].id;

          if (simStrategy === 'snowball') {
            // Snowball: lowest balance first
            const sorted = [...activeDebtsForPayment].sort((a, b) => a.balance - b.balance);
            priorityDebtId = sorted[0].id;
          } else if (simStrategy === 'avalanche') {
            // Avalanche: highest interest rate first
            const sorted = [...activeDebtsForPayment].sort((a, b) => b.interestRate - a.interestRate);
            priorityDebtId = sorted[0].id;
          }

          const targetDebt = activeDebtsForPayment.find((d) => d.id === priorityDebtId);
          if (targetDebt) {
            const additionalAccPay = Math.min(targetDebt.balance, unusedBufferForAccelerator);
            targetDebt.balance -= additionalAccPay;
            paymentMadeThisMonth += additionalAccPay;
            tempDebtPayments[targetDebt.id] += additionalAccPay;
          }
        }

        totalPayments += paymentMadeThisMonth;

        // 5. Check if any debt got fully paid off this month
        activeDebts.forEach((d) => {
          if (d.balance <= 0 && d.payoffMonth === null) {
            d.payoffMonth = month;
          }
          balanceState[d.id] = Math.max(0, d.balance);
        });

        // Loop checks & safety limits
        const totalRemainingBalanceThisMonth = activeDebts.reduce((sum, d) => sum + d.balance, 0);
        const totalInterestThisMonth = activeDebts.reduce((sum, d) => sum + (d.balance > 0 ? d.balance * (d.interestRate / 100 / 12) : 0), 0);

        if (paymentMadeThisMonth <= totalInterestThisMonth && totalRemainingBalanceThisMonth > 0) {
          warning = true;
          warningMsg = `Critical: Your allocated payments (${formatCurrency(paymentMadeThisMonth, settings.currency)}) are insufficient to cover accrued interest (${formatCurrency(totalInterestThisMonth, settings.currency)}). Your outstanding liabilities are growing negatively. Increase your extra payment slider immediately to trigger paydowns.`;
          break;
        }

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

    // Dynamic Multi-Scenario Payoff Planner
    const scenarios = [
      { name: 'Minimum Payments', extra: 0, label: 'Minimums Only' },
      { name: 'Moderate Extra', extra: 150, label: '+$150/mo' },
      { name: 'Accelerated Plan', extra: 300, label: '+$300/mo' },
      { name: 'Power Paydown', extra: 500, label: '+$500/mo' },
      { name: 'Debt Crusher', extra: 1000, label: '+$1,000/mo' },
    ].map((scenario) => {
      const res = runSimulation(strategy, scenario.extra);
      return {
        ...scenario,
        months: res.totalMonths,
        interest: res.totalInterest,
        totalPayments: res.totalPayments,
      };
    });

    return {
      monthlySchedule: activeSimResult.monthlySchedule,
      debtStats: activeSimResult.debtStats,
      scenarios,
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

  const handleRecordDebtPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const debt = debts.find((item) => item.id === paymentDebtId);
    const amount = parseFloat(paymentAmount);
    const interest = parseFloat(paymentInterest || '0');
    if (!debt || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(interest) || interest < 0 || interest > amount) {
      alert('Enter a valid debt payment and interest amount.');
      return;
    }
    const principal = amount - interest;
    if (principal > debt.balance + 0.01) {
      alert('Principal cannot exceed the debt balance.');
      return;
    }
    const payment: DebtPayment = {
      id: `debt_payment_${Date.now()}`,
      date: paymentDate,
      debtId: debt.id,
      accountId: paymentAccountId || undefined,
      amount,
      principal,
      interest,
    };
    onUpdateDebtPayments([...debtPayments, payment]);
    onUpdateDebts(debts.map((item) => item.id === debt.id ? { ...item, balance: Math.max(0, item.balance - principal) } : item));
    setPaymentAmount('');
    setPaymentInterest('');
  };

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
    ? 'bg-amber-50/70 border-amber-300 focus:border-amber-400 focus:ring-amber-200 focus:ring-2'
    : 'bg-white border-slate-200 focus:border-rose-500 focus:ring-rose-100 focus:ring-2';

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-4 sm:p-6 lg:p-8 selection:bg-rose-500/10 selection:text-rose-700">
      
      {/* ---------------------------------------------------- */}
      {/* Header Banner */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-14 items-center justify-center rounded-xl bg-linear-to-tr from-rose-600 to-pink-600 text-white shadow-md shadow-rose-600/10 shrink-0">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
                Debt Payoff Worksheet & Simulator
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Calculate payoff pathways, test snowball/avalanche strategies, and record live loan interest amortizations.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg select-none">
            <Calculator className="h-3.5 w-3.5 text-rose-500" /> Amortization Matrix
          </span>
        </div>
      </div>

      {/* Warning message from simulation */}
      {payoffSimulation.hasWarning && (
        <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 shadow-2xs font-semibold leading-relaxed">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <span className="font-extrabold text-rose-950 block text-sm mb-0.5">Negative Amortization Alert</span>
            {payoffSimulation.warningMessage}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Actual Payment Record Form Ledger */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-2xl border border-emerald-250 bg-linear-to-tr from-emerald-50/15 via-white to-slate-50 p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 h-32 w-32 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="mb-4">
          <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Check className="h-4.5 w-4.5 text-emerald-600" />
            <span>Record an actual debt payment</span>
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5 leading-relaxed">
            Record real-world debt paydowns here. The simulator below is scenario-only and never modifies your actual balances.
          </p>
        </div>
        <form onSubmit={handleRecordDebtPayment} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Select Debt</label>
            <select 
              value={paymentDebtId} 
              onChange={(e) => setPaymentDebtId(e.target.value)} 
              className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold text-slate-800 cursor-pointer h-10 ${inputClass}`}
            >
              <option value="">Select debt account</option>
              {debts.map((debt) => <option key={debt.id} value={debt.id}>{debt.name} (${debt.balance.toFixed(0)})</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Funding Account</label>
            <select 
              value={paymentAccountId} 
              onChange={(e) => setPaymentAccountId(e.target.value)} 
              className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold text-slate-800 cursor-pointer h-10 ${inputClass}`}
            >
              <option value="">Select funding source</option>
              {financialAssets.filter((asset) => asset.category === 'Cash' || asset.category === 'Bank').map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.name} (${asset.amount.toFixed(0)})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Payment Date</label>
            <input 
              type="date" 
              value={paymentDate} 
              onChange={(e) => setPaymentDate(e.target.value)} 
              className={`w-full rounded-xl border px-3 py-2 text-xs font-mono font-bold text-slate-800 h-10 ${inputClass}`} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Total payment ($)</label>
            <input 
              type="number" 
              min="0.01" 
              step="0.01" 
              placeholder="0.00" 
              value={paymentAmount} 
              onChange={(e) => setPaymentAmount(e.target.value)} 
              className={`w-full rounded-xl border px-3 py-2 text-xs font-mono font-bold text-slate-800 h-10 ${inputClass}`} 
            />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
            <div className="space-y-1 w-full">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Interest portion ($)</label>
              <input 
                type="number" 
                min="0" 
                step="0.01" 
                placeholder="Interest" 
                value={paymentInterest} 
                onChange={(e) => setPaymentInterest(e.target.value)} 
                className={`w-full rounded-xl border px-3 py-2 text-xs font-mono font-bold text-slate-800 h-10 ${inputClass}`} 
              />
            </div>
            <button 
              type="submit" 
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs h-10 px-4 transition-colors cursor-pointer border border-emerald-500 whitespace-nowrap"
            >
              Record Payment
            </button>
          </div>
        </form>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Executive Strategy Controller & Dashboard Cards */}
      {/* ---------------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Strategy Control Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-4 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
              <span>Acceleration Engine</span>
            </h3>
          </div>

          {/* Strategy Toggle (Zero Pill Underline tabs styled) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Acceleration Strategy</label>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setStrategy('snowball')}
                className={`rounded-lg py-2 text-xs font-black transition-all cursor-pointer select-none text-center ${
                  strategy === 'snowball'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950 font-bold'
                }`}
                title="Prioritize lowest balances first (emotional/motivational win)"
              >
                Snowball
              </button>
              <button
                type="button"
                onClick={() => setStrategy('avalanche')}
                className={`rounded-lg py-2 text-xs font-black transition-all cursor-pointer select-none text-center ${
                  strategy === 'avalanche'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950 font-bold'
                }`}
                title="Prioritize highest interest rates first (mathematically optimal)"
              >
                Avalanche
              </button>
              <button
                type="button"
                onClick={() => setStrategy('minimums')}
                className={`rounded-lg py-2 text-xs font-black transition-all cursor-pointer select-none text-center ${
                  strategy === 'minimums'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950 font-bold'
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
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Extra monthly payoff</label>
              <span className="font-mono text-xs font-black text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">
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
            <div className="flex items-center justify-between text-[9px] font-black text-slate-400 select-none">
              <span>$0</span>
              <span>$1,000</span>
              <span>$2,000</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-[11px] text-slate-600 leading-relaxed border border-slate-100 font-medium">
            {strategy === 'snowball' && (
              <p>
                <strong>Snowball Principle:</strong> Contractual minimums are paid across all debts, then any excess pool (<strong className="text-rose-600">{formatCurrency(additionalPayment, settings.currency)}</strong>) is strictly allocated to the <strong className="text-rose-700 font-black">lowest outstanding balance</strong>. This triggers rapid behavioral milestones!
              </p>
            )}
            {strategy === 'avalanche' && (
              <p>
                <strong>Avalanche Principle:</strong> Contractual minimums are paid, then excess resources are channeled to the <strong className="text-rose-700 font-black">highest interest rate</strong> loan first. This minimizes aggregate interest expense and is mathematically optimal.
              </p>
            )}
            {strategy === 'minimums' && (
              <p>
                <strong>Baseline:</strong> Demonstrates your payoff horizon when paying only minimum contractual payments. Zero additional monthly snowball is applied. Useful as a benchmark.
              </p>
            )}
          </div>
        </div>

        {/* Dynamic Financial KPI Cards */}
        <div className="lg:col-span-8 flex flex-col justify-between gap-4">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* KPI 1: Total Debt */}
            <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-2xs flex flex-col justify-between min-h-[110px]">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Total Debt Balance</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                {formatCurrency(payoffSimulation.overallStats.originalTotalBalance, settings.currency)}
              </span>
              <span className="text-[10px] font-bold text-slate-500 mt-2 flex items-center gap-1">
                <CreditCard className="h-3 w-3 text-slate-400 shrink-0" />
                <span>Across {debts.length} outstanding accounts</span>
              </span>
            </div>

            {/* KPI 2: Final Payoff Month */}
            <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-2xs flex flex-col justify-between min-h-[110px]">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Debt Free Horizon</span>
              <span className="text-xl sm:text-2xl font-black text-rose-700 font-mono mt-1">
                {getPayoffDateString(payoffSimulation.overallStats.totalMonths)}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>In {payoffSimulation.overallStats.totalMonths} months total</span>
              </span>
            </div>

            {/* KPI 3: Interest Paid */}
            <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-2xs flex flex-col justify-between min-h-[110px]">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Total Interest Cost</span>
              <span className="text-xl sm:text-2xl font-black text-amber-700 font-mono mt-1">
                {formatCurrency(payoffSimulation.overallStats.totalInterest, settings.currency)}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 mt-2">
                Equivalent to {((payoffSimulation.overallStats.totalInterest / (payoffSimulation.overallStats.originalTotalBalance || 1)) * 100).toFixed(1)}% of initial principal
              </span>
            </div>

            {/* KPI 4: Accelerated Savings */}
            <div className="rounded-xl border border-emerald-250 bg-emerald-50/50 p-4.5 shadow-2xs flex flex-col justify-between min-h-[110px]">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 block">Snowball Savings</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-800 font-mono mt-1">
                {formatCurrency(payoffSimulation.overallStats.interestSaved, settings.currency)}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 mt-2 flex items-center gap-1">
                <span>Payoff accelerated by <strong className="underline">{payoffSimulation.overallStats.monthsSaved} months</strong>!</span>
              </span>
            </div>
          </div>

          {/* Graphical paydown progress bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-rose-500" />
                <span>Liability Allocation Matrix</span>
              </span>
              <span className="font-mono text-xs font-semibold text-slate-500">
                {debts.length > 0 ? '100% Amortized Schedule Calculated' : 'No debts entered'}
              </span>
            </div>

            {/* Simulated payoff distribution visualization */}
            {debts.length > 0 ? (
              <div className="space-y-4">
                <div className="relative h-6 w-full rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex">
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
                {/* Micro Color Legend for entered debts (unboxed metadata) */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                  {debts.map((debt) => (
                    <div key={debt.id} className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: debt.color }} />
                      <span className="font-bold text-slate-700">{debt.name}</span>
                      <span aria-hidden="true" className="text-slate-300">•</span>
                      <span className="font-mono text-slate-500 font-semibold">{formatCurrency(debt.balance, settings.currency)}</span>
                    </div>
                  ))}
                </div>

                {/* Scenario payoff timeline simulator */}
                <div className="mt-5 pt-4 border-t border-slate-150 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Interactive Multi-Scenario Timeline Simulator
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                        Compare additional payment scenarios side-by-side. Click any option to update your plan selection.
                      </p>
                    </div>
                    <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase tracking-wider">
                      Live Simulation
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {payoffSimulation.scenarios?.map((scen) => {
                      const isActive = scen.extra === additionalPayment;
                      const isMinOnly = scen.extra === 0;
                      const monthsSaved = Math.max(0, payoffSimulation.overallStats.minimumsTotalMonths - scen.months);
                      const interestSaved = Math.max(0, payoffSimulation.overallStats.minimumsTotalInterest - scen.interest);

                      return (
                        <div
                          key={scen.name}
                          onClick={() => {
                            if (scen.extra !== undefined) {
                              setAdditionalPayment(scen.extra);
                            }
                          }}
                          className={`group/scen rounded-xl border p-3.5 transition-all duration-200 cursor-pointer text-left flex flex-col justify-between select-none ${
                            isActive
                              ? 'border-rose-300 bg-rose-50/15 shadow-2xs ring-1 ring-rose-200'
                              : 'border-slate-150 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-200'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-rose-700' : 'text-slate-400'}`}>
                                {scen.label}
                              </span>
                              {isActive && <Check className="h-3 w-3 text-rose-600" />}
                            </div>
                            <div>
                              <span className="font-mono text-base font-black text-slate-950 block leading-none">
                                {scen.months} mos
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                                to zero balance
                              </span>
                            </div>
                          </div>

                          {/* Graphical timeline bar */}
                          <div className="relative w-full h-1.5 rounded-full bg-slate-200/60 overflow-hidden my-2.5">
                            <div
                              style={{ width: `${Math.max(12, Math.min(100, (scen.months / (payoffSimulation.overallStats.minimumsTotalMonths || 120)) * 100))}%` }}
                              className={`h-full rounded-full transition-all duration-300 ${
                                isActive ? 'bg-rose-600' : 'bg-slate-400 group-hover/scen:bg-slate-500'
                              }`}
                            />
                          </div>

                          <div className="space-y-1 text-[9px] font-bold text-slate-500 mt-1">
                            <span className="font-mono block truncate">Cost: {formatCurrency(scen.interest, settings.currency)}</span>
                            {monthsSaved > 0 ? (
                              <span className="font-black text-emerald-600 block truncate">
                                Saved {monthsSaved}m (-{formatCurrency(interestSaved, settings.currency)})
                              </span>
                            ) : (
                              isMinOnly && <span className="text-slate-400 block uppercase tracking-wider font-black">Baseline</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Info className="h-7 w-7 text-rose-400 mb-2" />
                <span className="font-bold text-slate-700">No Combined Paydown Calculated</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Input your outstanding debt records below to simulate strategy pathways.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Debt Ledger & Edit Form */}
      {/* ---------------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Form to Add / Edit Debts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-4">
          <div className="border-b border-slate-150 pb-3 mb-4 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
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
                className="text-xs text-rose-600 font-extrabold hover:underline"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleAddOrEditDebt} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Debt Account Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Chase Visa, Auto Loan"
                  value={newDebtName}
                  onChange={(e) => setNewDebtName(e.target.value)}
                  className={`w-full rounded-xl border py-2.5 pl-3.5 pr-9 text-xs font-semibold outline-none transition-all h-10 ${inputClass}`}
                />
                <CreditCard className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Balance</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="5000"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    className={`w-full rounded-xl border py-2.5 pl-6 pr-1 text-xs font-mono font-bold outline-none transition-all h-10 ${inputClass}`}
                  />
                  <span className="absolute left-2.5 top-2.5 font-mono text-xs text-slate-400 font-bold">$</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Rate (%)</label>
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
                    className={`w-full rounded-xl border py-2.5 pl-2 pr-5 text-xs font-mono font-bold outline-none transition-all h-10 ${inputClass}`}
                  />
                  <Percent className="absolute right-2.5 top-3.5 h-3 w-3 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Min. Pay</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="120"
                    value={newMinimumPayment}
                    onChange={(e) => setNewMinimumPayment(e.target.value)}
                    className={`w-full rounded-xl border py-2.5 pl-6 pr-1 text-xs font-mono font-bold outline-none transition-all h-10 ${inputClass}`}
                  />
                  <span className="absolute left-2.5 top-2.5 font-mono text-xs text-slate-400 font-bold">$</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs py-3.5 shadow-md shadow-rose-600/10 hover:shadow-rose-600/15 border border-rose-500 transition-all cursor-pointer h-10 select-none uppercase tracking-wider"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>{editingId ? 'Save Debt Modifications' : 'Add Debt Account'}</span>
            </button>
          </form>

          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-[11px] text-slate-500 leading-normal flex items-start gap-2.5 font-medium">
            <Info className="h-4.5 w-4.5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-700 block font-bold mb-0.5">Dual-Ledger Accounting:</strong>
              Your regular monthly debt payments should be modeled in your expense log under "Debt Payments" categories to maintain an accurate cashflow budget!
            </div>
          </div>
        </div>

        {/* Google Sheets Style Spreadsheet Grid for Debts */}
        <div className="rounded-2xl border border-[#cbddec] bg-white shadow-xs overflow-hidden lg:col-span-8 flex flex-col justify-between">
          <div className="bg-gradient-to-r from-[#eef6fc] to-[#f4f9fd] border-b border-[#cbddec] px-4 py-3 flex items-center justify-between select-none">
            <span className="text-xs font-black text-[#1d4d7a] flex items-center gap-1.5 uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
              <span>tbl_Debt_Ledger • Double-entry formatted</span>
            </span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">
              GRID: COLUMN A to F
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px] border-collapse">
              {/* Google Sheets Header: Column Letters Row */}
              <thead>
                <tr className="bg-slate-100 border-b border-[#cbddec] text-center text-slate-500 select-none text-[10px] font-bold h-6">
                  <td className="w-8 border-r border-[#cbddec] bg-[#f1f5f9]"></td>
                  <td className="border-r border-[#cbddec] text-left px-3 font-mono">A</td>
                  <td className="border-r border-[#cbddec] font-mono">B</td>
                  <td className="border-r border-[#cbddec] font-mono">C</td>
                  <td className="border-r border-[#cbddec] font-mono">D</td>
                  <td className="border-r border-[#cbddec] font-mono">E</td>
                  <td className="border-r border-[#cbddec] font-mono">F</td>
                  <td className="w-20 bg-[#f1f5f9]"></td>
                </tr>
                {/* Table Field Titles Row */}
                <tr className="bg-slate-50/80 border-b border-[#cbddec] text-[#0c325c] font-black text-xs select-none">
                  <th className="border-r border-[#cbddec] bg-slate-100 text-center text-slate-400 text-[10px] h-8">#</th>
                  <th className="border-r border-[#cbddec] px-3 py-1.5 font-black uppercase tracking-wider">Debt Name</th>
                  <th className="border-r border-[#cbddec] px-3 py-1.5 text-right font-black uppercase tracking-wider w-28">Starting Balance</th>
                  <th className="border-r border-[#cbddec] px-3 py-1.5 text-right font-black uppercase tracking-wider w-24">Interest Rate</th>
                  <th className="border-r border-[#cbddec] px-3 py-1.5 text-right font-black uppercase tracking-wider w-28">Min. Monthly</th>
                  <th className="border-r border-[#cbddec] px-3 py-1.5 text-center font-black uppercase tracking-wider w-32">Payoff Date</th>
                  <th className="border-r border-[#cbddec] px-3 py-1.5 text-right font-black uppercase tracking-wider w-32">Est. Interest</th>
                  <th className="px-3 py-1.5 text-center font-black uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              {/* Table Data Rows */}
              <tbody className="divide-y divide-[#cbddec]/70">
                {debts.map((debt, index) => {
                  const rId = index + 1;
                  const dStats = payoffSimulation.debtStats[debt.id] || { payoffMonth: 0, totalInterest: 0 };
                  const payoffStr = getPayoffDateString(dStats.payoffMonth);

                  return (
                    <tr
                      key={debt.id}
                      onClick={() => handleCellSelect(`A${rId}`, `${debt.name} details`, `=tbl_Debt_Ledger[${debt.name}]`, false)}
                      className={`hover:bg-slate-50 border-b border-[#cbddec]/40 transition-colors cursor-pointer group ${
                        activeCellRef?.startsWith(`A${rId}`) ? 'bg-blue-50/60 font-bold' : ''
                      }`}
                    >
                      {/* Row Gutters */}
                      <td className="border-r border-[#cbddec] bg-slate-100 text-center font-bold text-slate-400 text-[10px] select-none h-9 font-mono">
                        {rId}
                      </td>

                      {/* Column A: Name */}
                      <td className="border-r border-[#cbddec] px-3 py-1.5 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: debt.color }} />
                          <span>{debt.name}</span>
                        </div>
                      </td>

                      {/* Column B: Balance */}
                      <td className="border-r border-[#cbddec] px-3 py-1.5 text-right font-mono font-bold text-slate-800">
                        {formatCurrency(debt.balance, settings.currency)}
                      </td>

                      {/* Column C: Interest Rate */}
                      <td className="border-r border-[#cbddec] px-3 py-1.5 text-right font-mono text-slate-600 font-semibold">
                        {debt.interestRate.toFixed(2)}%
                      </td>

                      {/* Column D: Minimum payment */}
                      <td className="border-r border-[#cbddec] px-3 py-1.5 text-right font-mono text-slate-600 font-semibold">
                        {formatCurrency(debt.minimumPayment, settings.currency)}
                      </td>

                      {/* Column E: Payoff Date (Calculated) */}
                      <td className="border-r border-[#cbddec] px-3 py-1.5 text-center font-black text-rose-600 bg-rose-50/10 font-mono">
                        {payoffStr}
                      </td>

                      {/* Column F: Total Interest Paid (Calculated) */}
                      <td className="border-r border-[#cbddec] px-3 py-1.5 text-right font-mono font-bold text-amber-700 bg-amber-50/10">
                        {formatCurrency(dStats.totalInterest, settings.currency)}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-1.5 text-center bg-slate-50/30">
                        <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-all">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleEditClick(debt); }}
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-950 cursor-pointer transition-colors"
                            title="Edit this account"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteDebt(debt.id); }}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-100 hover:text-rose-950 cursor-pointer transition-colors"
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
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400 font-semibold bg-slate-50/10">
                      No outstanding debts added yet. Use the left panel form to register liabilities and generate schedules.
                    </td>
                  </tr>
                )}

                {/* Totals & Excel Summary footer */}
                <tr className="bg-slate-100/90 font-black text-[#0c325c] border-t border-[#cbddec]">
                  <td className="border-r border-[#cbddec] bg-slate-150 text-center text-slate-400 text-[10px] select-none h-10">T</td>
                  <td className="border-r border-[#cbddec] px-3 py-2 text-xs font-bold text-slate-800">
                    Total Summary Formula
                  </td>
                  <td className="border-r border-[#cbddec] px-3 py-2 text-right font-mono font-black text-slate-900 text-xs">
                    {formatCurrency(payoffSimulation.overallStats.originalTotalBalance, settings.currency)}
                  </td>
                  <td className="border-r border-[#cbddec] px-3 py-2 text-right font-mono text-slate-500 text-xs">
                    {debts.length > 0 ? `${(debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length).toFixed(2)}% avg` : '—'}
                  </td>
                  <td className="border-r border-[#cbddec] px-3 py-2 text-right font-mono text-slate-900 text-xs font-black">
                    {formatCurrency(totalMinimumPaymentSum, settings.currency)}
                  </td>
                  <td className="border-r border-[#cbddec] px-3 py-2 text-center text-rose-700 font-black font-mono">
                    {debts.length > 0 ? getPayoffDateString(payoffSimulation.overallStats.totalMonths) : '—'}
                  </td>
                  <td className="border-r border-[#cbddec] px-3 py-2 text-right font-mono font-black text-amber-800 text-xs bg-amber-50/20">
                    {formatCurrency(payoffSimulation.overallStats.totalInterest, settings.currency)}
                  </td>
                  <td className="px-3 py-2 bg-slate-150 text-center text-[9px] text-slate-500 font-black uppercase select-none">
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
          className="w-full bg-slate-50 hover:bg-slate-100 border-b border-[#cbddec] px-4 py-3.5 flex items-center justify-between transition-colors select-none text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ListCollapse className="h-4.5 w-4.5 text-rose-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Interactive Month-by-Month Payoff Projection
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 font-bold select-none">
            <span>{isAmortizationExpanded ? 'Collapse' : 'Expand'} Projection Schedule</span>
            {isAmortizationExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {isAmortizationExpanded && (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs min-w-[700px] border-collapse relative">
              <thead className="sticky top-0 bg-slate-100 shadow-xs border-b border-[#cbddec] text-[#0c325c] font-black z-10">
                <tr className="border-b border-[#cbddec] text-[10px] text-slate-500 select-none">
                  <th className="w-12 border-r border-[#cbddec] bg-slate-150 text-center py-1.5">#</th>
                  <th className="border-r border-[#cbddec] px-3 py-2 text-center w-20">Month</th>
                  {debts.map((debt) => (
                    <th key={debt.id} className="border-r border-[#cbddec] px-3 py-2 text-right">
                      {debt.name} Balance
                    </th>
                  ))}
                  <th className="border-r border-[#cbddec] px-3 py-2 text-right w-32 bg-amber-50/20">
                    Interest Accrued
                  </th>
                  <th className="border-r border-[#cbddec] px-3 py-2 text-right w-32 bg-rose-50/20">
                    Total Payment
                  </th>
                  <th className="px-3 py-2 text-right w-32 bg-blue-50/20">
                    Cumulative Remaining
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cbddec]/60">
                {payoffSimulation.monthlySchedule.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                    <td className="border-r border-[#cbddec] bg-slate-50 text-center text-[10px] text-slate-400 select-none py-1.5 font-mono font-bold">
                      {row.month}
                    </td>
                    <td className="border-r border-[#cbddec] px-3 py-1.5 text-center font-mono text-slate-600 font-bold">
                      {getPayoffDateString(row.month)}
                    </td>
                    {debts.map((debt) => (
                      <td key={debt.id} className="border-r border-[#cbddec] px-3 py-1.5 text-right font-mono text-slate-700 font-semibold">
                        {formatCurrency(row.balances[debt.id] ?? 0, settings.currency)}
                      </td>
                    ))}
                    <td className="border-r border-[#cbddec] px-3 py-1.5 text-right font-mono text-amber-700 bg-amber-50/5">
                      {formatCurrency(row.interest, settings.currency)}
                    </td>
                    <td className="border-r border-[#cbddec] px-3 py-1.5 text-right font-mono font-semibold text-rose-600 bg-rose-50/5">
                      {formatCurrency(row.payment, settings.currency)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono font-bold text-blue-900 bg-blue-50/5">
                      {formatCurrency(row.totalRemaining, settings.currency)}
                    </td>
                  </tr>
                ))}

                {payoffSimulation.monthlySchedule.length === 0 && (
                  <tr>
                    <td colSpan={5 + debts.length} className="px-4 py-10 text-center text-slate-400 font-semibold bg-slate-50/5">
                      No payoff schedule computed. Input debt accounts to initialize calculations.
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
