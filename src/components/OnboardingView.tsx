import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
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
  user: User;
  session: ToolkitEntitlementResponse | null;
  onComplete: (session: ToolkitEntitlementResponse | null, financialPosition: OnboardingFinancialPosition) => void;
}

const planDetails: Record<ToolkitPlanId, { name: string; description: string; features: string[] }> = {
  free: { name: 'Free', description: 'Start budgeting with the essentials.', features: ['Core budgeting', 'Local persistence', 'Workbook export'] },
  plus: { name: 'Plus', description: 'Add cloud sync and Google Sheets.', features: ['Everything in Free', 'Cloud sync', 'Google Sheets'] },
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
    return value === 'plus' || value === 'pro' ? value : null;
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
      throw new Error('Your account was saved, but the Toolkit session could not be refreshed. Please try again.');
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
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/15">
            <ShieldCheck className="h-6 w-6 text-emerald-300" />
          </div>
          <p className="text-sm font-semibold text-emerald-300">Welcome to BudgetPlanner</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Set up your financial workspace</h1>
          <p className="mx-auto mt-2 max-w-3xl text-sm text-slate-400">
            Tell us where you are starting from. Existing cash, assets, and debts become your opening financial position.
          </p>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-bold text-white">1. About you</h2>
            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Display name
              <input value={displayName} maxLength={120} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400" placeholder="Your name" />
            </label>
            <p className="mt-4 text-xs text-slate-500">{user.email}</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">2. Starting financial position</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">Enter balances you already have before recording new income and expenses. You can skip any section that does not apply.</p>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Opening net worth</p>
                <p className="mt-1 text-lg font-black text-white">{estimatedOpeningNetWorth.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
                <h3 className="font-bold text-white">Cash on hand</h3>
                <p className="mt-1 text-xs text-slate-500">Cash that is not represented by a separate bank/cash asset below.</p>
                <input type="number" min="0" step="0.01" value={openingCashBalance || ''} onChange={(event) => setOpeningCashBalance(Number(event.target.value) || 0)} className="mt-3 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400" placeholder="0.00" />
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">Existing assets</h3>
                    <p className="mt-1 text-xs text-slate-500">Bank accounts, investments, property, vehicles, businesses, and other assets.</p>
                  </div>
                  <button type="button" onClick={() => setFinancialAssets((items) => [...items, emptyAsset()])} className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-400/10">
                    <Plus className="h-3.5 w-3.5" /> Add asset
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {financialAssets.length === 0 && <p className="rounded-lg border border-dashed border-white/10 p-3 text-xs text-slate-500">No existing assets added.</p>}
                  {financialAssets.map((asset) => (
                    <div key={asset.id} className="grid gap-2 rounded-lg border border-white/10 bg-slate-950 p-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
                      <input value={asset.name} onChange={(event) => setFinancialAssets((items) => items.map((item) => item.id === asset.id ? { ...item, name: event.target.value } : item))} className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" placeholder="Asset name" />
                      <select value={asset.category} onChange={(event) => setFinancialAssets((items) => items.map((item) => item.id === asset.id ? { ...item, category: event.target.value as FinancialAsset['category'] } : item))} className="rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-sm text-white outline-none focus:border-emerald-400">
                        {ASSET_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                      </select>
                      <input type="number" min="0" step="0.01" value={asset.amount || ''} onChange={(event) => setFinancialAssets((items) => items.map((item) => item.id === asset.id ? { ...item, amount: Number(event.target.value) || 0, openingAmount: Number(event.target.value) || 0 } : item))} className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" placeholder="Balance" />
                      <button type="button" aria-label="Remove asset" onClick={() => setFinancialAssets((items) => items.filter((item) => item.id !== asset.id))} className="rounded-lg border border-white/10 px-3 text-slate-400 hover:border-rose-400/40 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">Existing debts</h3>
                  <p className="mt-1 text-xs text-slate-500">Add loans, credit cards, or other liabilities that existed before you started tracking.</p>
                </div>
                <button type="button" onClick={() => setDebts((items) => [...items, emptyDebt()])} className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-400/10">
                  <Plus className="h-3.5 w-3.5" /> Add debt
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {debts.length === 0 && <p className="rounded-lg border border-dashed border-white/10 p-3 text-xs text-slate-500">No existing debts added.</p>}
                {debts.map((debt) => (
                  <div key={debt.id} className="grid gap-2 rounded-lg border border-white/10 bg-slate-950 p-3 sm:grid-cols-[1.2fr_7rem_6rem_8rem_auto]">
                    <input value={debt.name} onChange={(event) => setDebts((items) => items.map((item) => item.id === debt.id ? { ...item, name: event.target.value } : item))} className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" placeholder="Debt name" />
                    <input type="number" min="0" step="0.01" value={debt.balance || ''} onChange={(event) => setDebts((items) => items.map((item) => item.id === debt.id ? { ...item, balance: Number(event.target.value) || 0, openingBalance: Number(event.target.value) || 0 } : item))} className="rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-sm text-white outline-none focus:border-emerald-400" placeholder="Balance" />
                    <input type="number" min="0" step="0.01" value={debt.interestRate || ''} onChange={(event) => setDebts((items) => items.map((item) => item.id === debt.id ? { ...item, interestRate: Number(event.target.value) || 0 } : item))} className="rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-sm text-white outline-none focus:border-emerald-400" placeholder="Rate %" />
                    <input type="number" min="0" step="0.01" value={debt.minimumPayment || ''} onChange={(event) => setDebts((items) => items.map((item) => item.id === debt.id ? { ...item, minimumPayment: Number(event.target.value) || 0 } : item))} className="rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-sm text-white outline-none focus:border-emerald-400" placeholder="Min payment" />
                    <button type="button" aria-label="Remove debt" onClick={() => setDebts((items) => items.filter((item) => item.id !== debt.id))} className="rounded-lg border border-white/10 px-3 text-slate-400 hover:border-rose-400/40 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">3. Choose your subscription</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {(Object.keys(planDetails) as ToolkitPlanId[]).map((id) => {
                const details = planDetails[id];
                const plan = { id, ...details, price: id === 'free' ? 'Free' : planPrices[id] };
                const selected = plan.id === planId;
                return (
                  <button key={plan.id} type="button" onClick={() => setPlanId(plan.id)} className={`rounded-2xl border p-4 text-left transition ${selected ? 'border-emerald-400 bg-emerald-400/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    <div className="flex items-center justify-between"><span className="font-bold text-white">{plan.name}</span>{selected && <Check className="h-4 w-4 text-emerald-300" />}</div>
                    <p className="mt-1 text-sm font-semibold text-emerald-300">{plan.price}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">{plan.description}</p>
                    <ul className="mt-4 space-y-2">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-xs text-slate-300"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />{feature}</li>)}</ul>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {errorMessage && <p className="mt-5 text-center text-sm font-medium text-rose-300">{errorMessage}</p>}
        <div className="mt-8 flex justify-center">
          <button type="button" onClick={() => void handleContinue()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60">
            {loading ? 'Setting up your workspace…' : planId === 'free' ? 'Start with Free' : 'Continue to Mobile Money payment'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
