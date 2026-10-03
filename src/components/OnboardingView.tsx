import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Plus, ShieldCheck, Trash2, Wallet, Scale, PiggyBank, User, Landmark, HelpCircle } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Debt, FinancialAsset } from '../types/budget';
import type { ToolkitPlanId, ToolkitEntitlementResponse } from '../types/toolkit';
import { completeToolkitOnboarding, getMobileMoneyPaymentInfo, loadToolkitAccountSession } from '../services/toolkitAccount';
import { MobileMoneyPaymentView } from './MobileMoneyPaymentView';

export interface OnboardingFinancialPosition {
  openingCashBalance: number;
  financialAssets: FinancialAsset[];
  debts: Debt[];
}

interface OnboardingViewProps {
  user: SupabaseUser;
  session: ToolkitEntitlementResponse | null;
  onComplete: (session: ToolkitEntitlementResponse | null, financialPosition: OnboardingFinancialPosition) => void;
}

const planDetails: Record<ToolkitPlanId, { name: string; description: string; features: string[] }> = {
  free: { name: 'Free', description: 'Basic workspace to plan and monitor limits.', features: ['Manual Entry', 'Local Data Sync', 'Standard Reports'] },
  plus: { name: 'Plus', description: 'Add automatic secure cloud saves.', features: ['Everything in Free', 'Cloud Database Sync', 'Multi-device Access', 'Export to Excel'] },
  pro: { name: 'Pro', description: 'Add AI and advanced budgeting tools.', features: ['Everything in Plus', 'AI Insights', 'Advanced Analytics', 'Automation'] },
};

const ASSET_CATEGORIES: FinancialAsset['category'][] = [
  'Cash',
  'Bank',
  'Investment',
  'Real Estate',
  'Vehicle',
  'Business',
  'Retirement',
  'Receivable',
  'Other',
];

const emptyAsset = (): FinancialAsset => ({
  id: `onboarding_asset_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  name: '',
  amount: 0,
  openingAmount: 0,
  category: 'Bank',
});

const emptyDebt = (): Debt => ({
  id: `onboarding_debt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  name: '',
  balance: 0,
  openingBalance: 0,
  interestRate: 0,
  minimumPayment: 0,
});

export const OnboardingView: React.FC<OnboardingViewProps> = ({ user, onComplete }) => {
  const [displayName, setDisplayName] = useState((user.user_metadata?.full_name as string | undefined) ?? '');
  const [planId, setPlanId] = useState<ToolkitPlanId>('free');
  const [paymentPlan, setPaymentPlan] = useState<'plus' | 'pro' | null>(() => {
    const value = new URLSearchParams(window.location.search).get('mobile_money');
    return value === 'plus' || value === 'pro' ? value as 'plus' | 'pro' : null;
  });
  const [openingCashBalance, setOpeningCashBalance] = useState(0);
  const [financialAssets, setFinancialAssets] = useState<FinancialAsset[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [planPrices, setPlanPrices] = useState<Record<'plus' | 'pro', string>>({ plus: 'Loading…', pro: 'Loading…' });

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getMobileMoneyPaymentInfo('plus'), getMobileMoneyPaymentInfo('pro')])
      .then(([plus, pro]) => {
        if (!cancelled) setPlanPrices({
          plus: `${plus.currency} ${plus.amount.toLocaleString()}`,
          pro: `${pro.currency} ${pro.amount.toLocaleString()}`,
        });
      })
      .catch(() => {
        if (!cancelled) setPlanPrices({ plus: 'Price unavailable', pro: 'Price unavailable' });
      });
    return () => { cancelled = true; };
  }, []);

  const estimatedOpeningAssets = useMemo(
    () => Math.max(0, openingCashBalance) + financialAssets.reduce((sum, asset) => sum + Math.max(0, Number(asset.amount) || 0), 0),
    [openingCashBalance, financialAssets],
  );
  const estimatedOpeningDebts = useMemo(
    () => debts.reduce((sum, debt) => sum + Math.max(0, Number(debt.balance) || 0), 0),
    [debts],
  );
  const estimatedOpeningNetWorth = estimatedOpeningAssets - estimatedOpeningDebts;

  const finishWithFreshSession = async () => {
    const session = await loadToolkitAccountSession(user);
    if (!session) {
      onComplete(null, { openingCashBalance: 0, financialAssets: [], debts: [] });
      return;
    }
    onComplete(session, {
      openingCashBalance: Math.max(0, Number(openingCashBalance) || 0),
      financialAssets: financialAssets
        .filter((asset) => asset.name.trim() && Number(asset.amount) > 0)
        .map((asset) => ({
          ...asset,
          amount: Number(asset.amount),
          openingAmount: Number(asset.openingAmount ?? asset.amount),
          name: asset.name.trim(),
        })),
      debts: debts
        .filter((debt) => debt.name.trim() && Number(debt.balance) > 0)
        .map((debt) => ({
          ...debt,
          balance: Number(debt.balance),
          openingBalance: Number(debt.openingBalance ?? debt.balance),
          interestRate: Number(debt.interestRate) || 0,
          minimumPayment: Number(debt.minimumPayment) || 0,
          name: debt.name.trim(),
        })),
    });
  };

  const handleApproved = async () => {
    try {
      window.history.replaceState({}, '', window.location.pathname);
      await finishWithFreshSession();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to finish onboarding.');
    }
  };

  const handleContinue = async () => {
    if (!displayName.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }

    const invalidAsset = financialAssets.find((asset) => !asset.name.trim() || !Number.isFinite(Number(asset.amount)) || Number(asset.amount) <= 0);
    if (invalidAsset) {
      setErrorMessage('Complete or remove each asset before continuing.');
      return;
    }

    const invalidDebt = debts.find((debt) =>
      !debt.name.trim()
      || !Number.isFinite(Number(debt.balance))
      || Number(debt.balance) <= 0
      || !Number.isFinite(Number(debt.interestRate))
      || Number(debt.interestRate) < 0
      || !Number.isFinite(Number(debt.minimumPayment))
      || Number(debt.minimumPayment) <= 0
      || Number(debt.minimumPayment) >= Number(debt.balance),
    );
    if (invalidDebt) {
      setErrorMessage('Each debt needs a balance, interest rate, and minimum payment below the current balance.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await completeToolkitOnboarding(user, displayName.trim(), planId);
      if (planId === 'free') {
        await finishWithFreshSession();
        return;
      }
      window.history.replaceState({}, '', `?mobile_money=${planId}`);
      setPaymentPlan(planId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to complete onboarding.');
    } finally {
      setLoading(false);
    }
  };

  if (paymentPlan) {
    return (
      <MobileMoneyPaymentView
        user={user}
        planId={paymentPlan}
        onBack={() => setPaymentPlan(null)}
        onApproved={handleApproved}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <div className="mx-auto max-w-5xl space-y-10">
        
        {/* Header Branding Panel */}
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/5 animate-pulse">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Workspace Initialization
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-sans">
              Set Up Your Financial Position
            </h1>
            <p className="mx-auto max-w-3xl text-xs sm:text-sm text-slate-400 font-semibold leading-relaxed">
              Define your starting line. Recording pre-existing cash, assets, and liabilities ensures absolute balance sheet accuracy. New transactions then build on this baseline.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          
          {/* Section 1: About You */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/30 p-5 sm:p-6 backdrop-blur-xs relative overflow-hidden">
            <div className="absolute right-0 top-0 h-32 w-32 bg-radial from-indigo-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <User className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">1. Personal Profile</h2>
            </div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
              Display Name
              <input 
                value={displayName} 
                maxLength={120} 
                onChange={(event) => setDisplayName(event.target.value)} 
                autoComplete="name" 
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-600 font-medium" 
                placeholder="e.g. Jane Doe" 
              />
            </label>
            <p className="mt-3 text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <span>Account Identity:</span>
              <span className="font-mono text-slate-400 font-bold">{user.email}</span>
            </p>
          </section>

          {/* Section 2: Starting Financial Position */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/30 p-5 sm:p-6 backdrop-blur-xs relative overflow-hidden space-y-6">
            <div className="absolute right-0 top-0 h-48 w-48 bg-radial from-emerald-500/5 to-transparent pointer-events-none" />
            
            {/* Header Block with Live Net Worth Counter */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Wallet className="h-4.5 w-4.5" />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">2. Balance Sheet Entry</h2>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  Enter existing balances. You can skip sections or add items as needed.
                </p>
              </div>

              {/* Dynamic Live Calculations */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-right shadow-xs select-none shrink-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Projected Opening Net Worth</p>
                <p className="mt-1 text-xl font-black text-white font-mono tracking-tight">
                  {estimatedOpeningNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Quick Informational Guide */}
            <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 px-4 py-3 text-xs text-blue-300 leading-normal flex items-start gap-2.5 font-medium">
              <HelpCircle className="h-4.5 w-4.5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong>Starting Balance vs Activity</strong>: Setting starting positions establishes your initial capital pool. None of these values are registered as current-month income or expense transactions.
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              
              {/* Cash on Hand Card */}
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-4 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-200 font-black text-xs uppercase tracking-wider">
                    <PiggyBank className="h-4 w-4 text-emerald-400" />
                    <span>Cash on hand</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    Pre-existing physical currency, envelope cash, or wallet holdings not represented inside bank account listings.
                  </p>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm font-black font-mono">$</span>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={openingCashBalance || ''} 
                    onChange={(event) => setOpeningCashBalance(Number(event.target.value) || 0)} 
                    className="w-full rounded-xl border border-white/10 bg-slate-950 pl-7 pr-4 py-2.5 text-sm text-white font-mono font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-700" 
                    placeholder="0.00" 
                  />
                </div>
              </div>

              {/* Assets List Card */}
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-200 font-black text-xs uppercase tracking-wider">
                      <Landmark className="h-4 w-4 text-sky-400" />
                      <span>Existing assets</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      Bank deposits, investments, property, retirement, etc.
                    </p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setFinancialAssets((items) => [...items, emptyAsset()])} 
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 hover:border-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-black text-emerald-300 hover:text-white transition-all cursor-pointer shadow-3xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Asset
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {financialAssets.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/10 p-5 text-center text-xs text-slate-600 font-medium">
                      No starting asset accounts recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Table Column Labels for visual hierarchy */}
                      <div className="grid grid-cols-[1fr_7rem_6rem_auto] gap-2 px-1 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                        <span>Account / Asset Name</span>
                        <span>Category</span>
                        <span>Current Value</span>
                        <span className="w-8"></span>
                      </div>
                      
                      {financialAssets.map((asset) => (
                        <div key={asset.id} className="grid gap-2 rounded-xl border border-white/5 bg-slate-950 p-2 sm:grid-cols-[1fr_7rem_6rem_auto] items-center">
                          <input 
                            value={asset.name} 
                            onChange={(event) => setFinancialAssets((items) => items.map((item) => item.id === asset.id ? { ...item, name: event.target.value } : item))} 
                            className="rounded-lg border border-white/10 bg-slate-900 px-2.5 py-2 text-xs text-white font-semibold outline-none focus:border-emerald-500 transition-all" 
                            placeholder="e.g. Chase Bank Checking" 
                          />
                          <select 
                            value={asset.category} 
                            onChange={(event) => setFinancialAssets((items) => items.map((item) => item.id === asset.id ? { ...item, category: event.target.value as FinancialAsset['category'] } : item))} 
                            className="rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-xs text-white font-semibold outline-none focus:border-emerald-500 cursor-pointer"
                          >
                            {ASSET_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                          </select>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 font-mono text-xs text-slate-500 font-bold">$</span>
                            <input 
                              type="number" 
                              min="0" 
                              step="0.01" 
                              value={asset.amount || ''} 
                              onChange={(event) => setFinancialAssets((items) => items.map((item) => item.id === asset.id ? { ...item, amount: Number(event.target.value) || 0, openingAmount: Number(event.target.value) || 0 } : item))} 
                              className="w-full rounded-lg border border-white/10 bg-slate-900 pl-5 pr-2 py-2 text-xs text-white font-mono font-bold outline-none focus:border-emerald-500" 
                              placeholder="0.00" 
                            />
                          </div>
                          <button 
                            type="button" 
                            aria-label="Remove asset" 
                            onClick={() => setFinancialAssets((items) => items.filter((item) => item.id !== asset.id))} 
                            className="rounded-lg p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Liabilities & Debts Card */}
            <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-200 font-black text-xs uppercase tracking-wider">
                    <Scale className="h-4 w-4 text-rose-400" />
                    <span>Existing debts</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    Credit cards, student loans, auto financing, mortgages, or personal loans.
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setDebts((items) => [...items, emptyDebt()])} 
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 hover:border-rose-400 bg-rose-500/10 px-2.5 py-1.5 text-xs font-black text-rose-300 hover:text-white transition-all cursor-pointer shadow-3xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Liability
                </button>
              </div>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {debts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/10 p-5 text-center text-xs text-slate-600 font-medium">
                    No starting liabilities or debt loans recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Header alignment labels */}
                    <div className="grid grid-cols-[1.2fr_7rem_6rem_8rem_auto] gap-2 px-1 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                      <span>Debt Account Name</span>
                      <span>Owed Balance</span>
                      <span>APR %</span>
                      <span>Min Monthly Payment</span>
                      <span className="w-8"></span>
                    </div>

                    {debts.map((debt) => (
                      <div key={debt.id} className="grid gap-2 rounded-xl border border-white/5 bg-slate-950 p-2 sm:grid-cols-[1.2fr_7rem_6rem_8rem_auto] items-center">
                        <input 
                          value={debt.name} 
                          onChange={(event) => setDebts((items) => items.map((item) => item.id === debt.id ? { ...item, name: event.target.value } : item))} 
                          className="rounded-lg border border-white/10 bg-slate-900 px-2.5 py-2 text-xs text-white font-semibold outline-none focus:border-emerald-500" 
                          placeholder="e.g. Visa Credit Card" 
                        />
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 font-mono text-xs text-slate-500 font-bold">$</span>
                          <input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            value={debt.balance || ''} 
                            onChange={(event) => setDebts((items) => items.map((item) => item.id === debt.id ? { ...item, balance: Number(event.target.value) || 0, openingBalance: Number(event.target.value) || 0 } : item))} 
                            className="w-full rounded-lg border border-white/10 bg-slate-900 pl-5 pr-2 py-2 text-xs text-white font-mono font-bold outline-none focus:border-emerald-500" 
                            placeholder="0.00" 
                          />
                        </div>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            value={debt.interestRate || ''} 
                            onChange={(event) => setDebts((items) => items.map((item) => item.id === debt.id ? { ...item, interestRate: Number(event.target.value) || 0 } : item))} 
                            className="w-full rounded-lg border border-white/10 bg-slate-900 pl-2.5 pr-5 py-2 text-xs text-white font-mono font-bold outline-none focus:border-emerald-500" 
                            placeholder="0.0" 
                          />
                          <span className="absolute right-2 top-2 font-mono text-[10px] text-slate-500 font-bold">%</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 font-mono text-xs text-slate-500 font-bold">$</span>
                          <input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            value={debt.minimumPayment || ''} 
                            onChange={(event) => setDebts((items) => items.map((item) => item.id === debt.id ? { ...item, minimumPayment: Number(event.target.value) || 0 } : item))} 
                            className="w-full rounded-lg border border-white/10 bg-slate-900 pl-5 pr-2 py-2 text-xs text-white font-mono font-bold outline-none focus:border-emerald-500" 
                            placeholder="0.00" 
                          />
                        </div>
                        <button 
                          type="button" 
                          aria-label="Remove debt" 
                          onClick={() => setDebts((items) => items.filter((item) => item.id !== debt.id))} 
                          className="rounded-lg p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 3: Subscription Allocation */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/30 p-5 sm:p-6 backdrop-blur-xs relative overflow-hidden space-y-5">
            <div className="absolute right-0 top-0 h-32 w-32 bg-radial from-violet-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <Check className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">3. Workspace Edition</h2>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              {(Object.keys(planDetails) as ToolkitPlanId[]).map((id) => {
                const details = planDetails[id];
                const plan = { id, ...details, price: id === 'free' ? 'Free' : planPrices[id] };
                const selected = plan.id === planId;
                return (
                  <button 
                    key={plan.id} 
                    type="button" 
                    onClick={() => setPlanId(plan.id)} 
                    className={`rounded-2xl border p-5 text-left transition-all duration-300 relative select-none flex flex-col justify-between ${
                      selected 
                        ? 'border-emerald-500 bg-emerald-500/10 ring-4 ring-emerald-500/10' 
                        : 'border-white/5 bg-slate-950/40 hover:border-white/15 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="space-y-3.5 w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-white block">
                          {plan.name} Plan
                        </span>
                        {selected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="text-xl font-black text-white font-mono tracking-tight block">
                          {plan.price}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          {plan.id === 'free' ? 'Standard workspace limit' : 'Verified manually'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-400 font-semibold">
                        {plan.description}
                      </p>
                      <div className="border-t border-white/5 my-3" />
                      <ul className="space-y-2">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-xs text-slate-300 font-semibold">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3.5 text-center text-sm font-bold text-rose-300 animate-bounce">
            {errorMessage}
          </div>
        )}

        {/* Action Button Segment */}
        <div className="flex justify-center pt-2">
          <button 
            type="button" 
            onClick={() => void handleContinue()} 
            disabled={loading} 
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 px-8 py-3.5 text-sm font-black text-slate-950 tracking-tight transition-all disabled:opacity-60 cursor-pointer shadow-lg shadow-emerald-500/10 border border-emerald-400"
          >
            {loading ? 'Initializing Secure Workspace…' : planId === 'free' ? 'Initialize Workspace' : 'Continue to Manual Deposit Verification'}
            {!loading && <ArrowRight className="h-4.5 w-4.5 stroke-[2.5]" />}
          </button>
        </div>
      </div>
    </div>
  );
};
