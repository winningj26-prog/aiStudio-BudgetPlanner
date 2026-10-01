import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, CreditCard, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { ToolkitEntitlementResponse, ToolkitPlanId } from '../types/toolkit';
import { createBillingCheckout, loadToolkitAccountSession } from '../services/toolkitAccount';

interface SubscriptionViewProps {
  user: User;
  session: ToolkitEntitlementResponse;
  onBack: () => void;
  onSessionUpdated: (session: ToolkitEntitlementResponse) => void;
}

const plans: Array<{ id: ToolkitPlanId; name: string; price: string; description: string; features: string[]; configured: boolean }> = [
  { id: 'free', name: 'Free', price: 'Free', description: 'Core budgeting with local persistence and export.', features: ['Core budgeting', 'Local persistence', 'Workbook export'], configured: true },
  { id: 'plus', name: 'Plus', price: 'Coming soon', description: 'Cloud sync and Google Sheets. Billing setup is still pending.', features: ['Everything in Free', 'Cloud sync', 'Google Sheets'], configured: false },
  { id: 'pro', name: 'Pro', price: 'Paid plan', description: 'AI, advanced analytics, automation, cloud sync, and Google Sheets.', features: ['Everything in Plus', 'AI Insights', 'Advanced Analytics', 'Automation'], configured: true },
];

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({ user, session, onBack, onSessionUpdated }) => {
  const currentPlan = session.session.subscription.planId;
  const [loadingPlan, setLoadingPlan] = useState<ToolkitPlanId | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingReturn, setPendingReturn] = useState(() => new URLSearchParams(window.location.search).get('billing') === 'success');

  useEffect(() => {
    if (!pendingReturn) return;
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const latest = await loadToolkitAccountSession(user);
        if (cancelled) return;
        if (latest && latest.session.subscription.planId !== currentPlan) {
          window.history.replaceState({}, '', window.location.pathname);
          onSessionUpdated(latest);
          setPendingReturn(false);
          return;
        }
      } catch {
        // Keep polling while billing activation finishes.
      }
      if (attempts < 15) {
        window.setTimeout(poll, 2000);
      } else if (!cancelled) {
        setPendingReturn(false);
        setErrorMessage('Payment was returned, but the subscription is still being activated. Please refresh in a moment.');
      }
    };
    void poll();
    return () => { cancelled = true; };
  }, [pendingReturn, currentPlan, user, onSessionUpdated]);

  useEffect(() => {
    const billing = new URLSearchParams(window.location.search).get('billing');
    if (billing === 'cancelled') {
      setErrorMessage('Checkout was cancelled. Your subscription was not changed.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleUpgrade = async (planId: 'plus' | 'pro') => {
    setLoadingPlan(planId);
    setErrorMessage(null);
    try {
      const checkout = await createBillingCheckout(user, planId);
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start subscription checkout.');
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Account & Billing</p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Subscription</h1>
            <p className="mt-1 text-sm text-slate-400">Current plan: <span className="font-semibold capitalize text-white">{currentPlan}</span></p>
          </div>
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" /> Back to Toolkit
          </button>
        </header>

        <main className="py-8">
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const current = currentPlan === plan.id;
              const canUpgrade = plan.id !== 'free' && !current && plan.configured;
              const loading = loadingPlan === plan.id;
              return (
                <article key={plan.id} className={current ? 'rounded-2xl border border-emerald-400 bg-emerald-400/10 p-5' : 'rounded-2xl border border-white/10 bg-white/5 p-5'}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-black text-white">{plan.name}</h2>
                    {current && <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">Current</span>}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-emerald-300">{plan.price}</p>
                  <p className="mt-2 min-h-12 text-sm leading-relaxed text-slate-400">{plan.description}</p>
                  <ul className="mt-5 space-y-2">
                    {plan.features.map((feature) => <li key={feature} className="flex gap-2 text-xs text-slate-300"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />{feature}</li>)}
                  </ul>
                  <button type="button" disabled={current || !canUpgrade || loading || pendingReturn} onClick={canUpgrade ? () => void handleUpgrade(plan.id as 'plus' | 'pro') : undefined} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Opening checkout…</> : current ? 'Current plan' : plan.id === 'plus' ? 'Not configured yet' : <><CreditCard className="h-4 w-4" />Upgrade to Pro</>}
                  </button>
                </article>
              );
            })}
          </div>
          {pendingReturn && <p className="mt-6 text-center text-sm font-medium text-amber-300">We’re confirming your payment and updating your subscription…</p>}
          {errorMessage && <p className="mt-6 text-center text-sm font-medium text-rose-300">{errorMessage}</p>}
          <p className="mt-8 text-center text-xs text-slate-500">Plus is intentionally shown as unavailable until its billing configuration is supplied.</p>
        </main>
      </div>
    </div>
  );
};
