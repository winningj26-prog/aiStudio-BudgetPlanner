import React, { useState } from 'react';
import { Check, ShieldCheck, ArrowRight } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { ToolkitPlanId, ToolkitEntitlementResponse } from '../types/toolkit';
import { completeToolkitOnboarding, createBillingCheckout, loadToolkitAccountSession } from '../services/toolkitAccount';

interface OnboardingViewProps {
  user: User;
  session: ToolkitEntitlementResponse | null;
  onComplete: (session: ToolkitEntitlementResponse | null) => void;
}

const plans: Array<{ id: ToolkitPlanId; name: string; price: string; description: string; features: string[] }> = [
  { id: 'free', name: 'Free', price: 'Free', description: 'Start budgeting with the essentials.', features: ['Core budgeting', 'Local persistence', 'Workbook export'] },
  { id: 'plus', name: 'Plus', price: 'Paid plan', description: 'Add cloud sync and Google Sheets.', features: ['Everything in Free', 'Cloud sync', 'Google Sheets'] },
  { id: 'pro', name: 'Pro', price: 'Paid plan', description: 'Add AI and advanced budgeting tools.', features: ['Everything in Plus', 'AI Insights', 'Advanced Analytics', 'Automation'] },
];

export const OnboardingView: React.FC<OnboardingViewProps> = ({ user, onComplete }) => {
  const [displayName, setDisplayName] = useState((user.user_metadata?.full_name as string | undefined) ?? '');
  const [planId, setPlanId] = useState<ToolkitPlanId>('free');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!displayName.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      await completeToolkitOnboarding(user, displayName.trim(), planId);
      if (planId === 'free') {
        onComplete(await loadToolkitAccountSession(user));
        return;
      }
      const checkout = await createBillingCheckout(user, planId);
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to complete onboarding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/15">
            <ShieldCheck className="h-6 w-6 text-emerald-300" />
          </div>
          <p className="text-sm font-semibold text-emerald-300">Welcome to the toolkit</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Set up your workspace</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">Choose how you want to start. You can change plans later through the account and billing flow.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-bold text-white">About you</h2>
            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Display name
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400" placeholder="Your name" />
            </label>
            <p className="mt-4 text-xs text-slate-500">{user.email}</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">Choose your subscription</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {plans.map((plan) => {
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
          <button type="button" onClick={handleContinue} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60">
            {loading ? 'Setting up your workspace…' : planId === 'free' ? 'Start with Free' : `Continue to ${planId === 'plus' ? 'Plus' : 'Pro'} checkout`}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
