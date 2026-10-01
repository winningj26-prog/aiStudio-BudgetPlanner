import React from 'react';
import { ArrowRight, BarChart3, Boxes, Check, Lock, LogOut, WalletCards } from 'lucide-react';
import type { ToolkitEntitlementResponse } from '../types/toolkit';

interface ToolkitHomeViewProps {
  session: ToolkitEntitlementResponse;
  onOpenBudgetPlanner: () => void;
  onLogout: () => void;
  onManageSubscription: () => void;
}

const apps = [
  {
    id: 'budget-planner' as const,
    name: 'BudgetPlanner',
    description: 'Plan income, track spending, manage budgets, and review financial performance.',
    icon: <WalletCards className="h-6 w-6" />,
  },
  {
    id: 'app-2' as const,
    name: 'Toolkit App 2',
    description: 'Reserved for the next application in the shared toolkit.',
    icon: <Boxes className="h-6 w-6" />,
  },
  {
    id: 'app-3' as const,
    name: 'Toolkit App 3',
    description: 'Reserved for a future toolkit application.',
    icon: <BarChart3 className="h-6 w-6" />,
  },
  {
    id: 'app-4' as const,
    name: 'Toolkit App 4',
    description: 'Reserved for a future toolkit application.',
    icon: <Boxes className="h-6 w-6" />,
  },
];

export const ToolkitHomeView: React.FC<ToolkitHomeViewProps> = ({
  session,
  onOpenBudgetPlanner,
  onLogout,
  onManageSubscription,
}) => {
  const { user, subscription, entitlements } = session.session;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Shared Toolkit</p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Your apps, one account</h1>
            <p className="mt-1 text-sm text-slate-400">{user.displayName || user.email || 'Your workspace'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold uppercase text-emerald-300">
              {subscription.planId}
            </span>
            <button
              type="button"
              onClick={onManageSubscription}
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-400/15"
            >
              {subscription.planId === 'free' ? 'Upgrade subscription' : 'Manage subscription'}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </header>

        <main className="py-8">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">App launcher</h2>
            <p className="mt-1 text-sm text-slate-400">Open an application available to your toolkit account.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {apps.map((app) => {
              const enabled = Boolean(entitlements.apps[app.id]);
              const budgetPlanner = app.id === 'budget-planner';

              return (
                <article
                  key={app.id}
                  className={`rounded-2xl border p-5 ${enabled ? 'border-white/10 bg-white/5' : 'border-white/5 bg-white/[0.025]'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={`rounded-xl p-3 ${enabled ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-slate-600'}`}>
                      {app.icon}
                    </div>
                    {enabled ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300">
                        <Check className="h-3.5 w-3.5" /> Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        <Lock className="h-3.5 w-3.5" /> Coming soon
                      </span>
                    )}
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-white">{app.name}</h3>
                  <p className="mt-1.5 min-h-10 text-sm leading-relaxed text-slate-400">{app.description}</p>
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={budgetPlanner ? onOpenBudgetPlanner : undefined}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
                  >
                    {enabled ? 'Open app' : 'Not available yet'}
                    {enabled && <ArrowRight className="h-4 w-4" />}
                  </button>
                </article>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
};
