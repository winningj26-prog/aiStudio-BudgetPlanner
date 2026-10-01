import React, { useCallback, useState } from 'react';
import { ArrowLeft, Check, Smartphone } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { ToolkitEntitlementResponse, ToolkitPlanId } from '../types/toolkit';
import { loadToolkitAccountSession } from '../services/toolkitAccount';
import { MobileMoneyPaymentView } from './MobileMoneyPaymentView';

interface SubscriptionViewProps {
  user: User;
  session: ToolkitEntitlementResponse;
  onBack: () => void;
  onSessionUpdated: (session: ToolkitEntitlementResponse) => void;
}

const plans: Array<{ id: ToolkitPlanId; name: string; price: string; description: string; features: string[] }> = [
  { id: 'free', name: 'Free', price: 'Free', description: 'Core budgeting with local persistence and export.', features: ['Core budgeting', 'Local persistence', 'Workbook export'] },
  { id: 'plus', name: 'Plus', price: 'Le 550', description: 'Cloud sync and Google Sheets.', features: ['Everything in Free', 'Cloud sync', 'Google Sheets'] },
  { id: 'pro', name: 'Pro', price: 'Le 1,000', description: 'AI, advanced analytics, automation, cloud sync, and Google Sheets.', features: ['Everything in Plus', 'AI Insights', 'Advanced Analytics', 'Automation'] },
];

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({ user, session, onBack, onSessionUpdated }) => {
  const currentPlan = session.session.subscription.planId;
  const [paymentPlan, setPaymentPlan] = useState<'plus' | 'pro' | null>(null);

  const handleApproved = useCallback(async () => {
    const latest = await loadToolkitAccountSession(user);
    if (latest) onSessionUpdated(latest);
  }, [user, onSessionUpdated]);

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
              const canPay = plan.id !== 'free' && !current;
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
                  <button type="button" disabled={!canPay} onClick={canPay ? () => setPaymentPlan(plan.id as 'plus' | 'pro') : undefined} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500">
                    {current ? 'Current plan' : plan.id === 'free' ? 'Included' : <><Smartphone className="h-4 w-4" />Pay with Mobile Money</>}
                  </button>
                </article>
              );
            })}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">Mobile Money payments are verified manually. Your plan is not activated until the transaction is confirmed.</p>
        </main>
      </div>
    </div>
  );
};
