import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  Lock,
  LogOut,
  WalletCards,
  User,
  Clock,
  Shield,
  Zap,
  Cloud,
  ArrowUpRight,
  HelpCircle,
} from 'lucide-react';
import type { ToolkitEntitlementResponse } from '../types/toolkit';

interface ToolkitHomeViewProps {
  session: ToolkitEntitlementResponse;
  onOpenBudgetPlanner: () => void;
  onLogout: () => void;
  onManageSubscription: () => void;
  onOpenPlatformDashboard?: () => void;
}

const apps = [
  {
    id: 'budget-planner' as const,
    name: 'BudgetPlanner',
    description: 'Plan income, track spending, manage budgets, and review financial performance.',
    icon: <WalletCards className="h-6 w-6" />,
    tierRequired: 'Free / Plus / Pro',
  },
  {
    id: 'app-2' as const,
    name: 'Toolkit Analytics Pro',
    description: 'Advanced workspace analytics and customized report builder (Coming Soon).',
    icon: <BarChart3 className="h-6 w-6" />,
    tierRequired: 'Plus / Pro',
  },
  {
    id: 'app-3' as const,
    name: 'Asset & Net Worth Manager',
    description: 'Consolidated balance sheets, investment portfolios, and assets valuation (Coming Soon).',
    icon: <Zap className="h-6 w-6" />,
    tierRequired: 'Pro Only',
  },
  {
    id: 'app-4' as const,
    name: 'Smart Invoice Hub',
    description: 'Automatic bill scraping, mobile receipts, and tax reporting spreadsheets (Coming Soon).',
    icon: <Boxes className="h-6 w-6" />,
    tierRequired: 'Pro Only',
  },
];

export const ToolkitHomeView: React.FC<ToolkitHomeViewProps> = ({
  session,
  onOpenBudgetPlanner,
  onLogout,
  onManageSubscription,
  onOpenPlatformDashboard,
}) => {
  const { user, subscription, entitlements } = session.session;
  const [greeting, setGreeting] = useState('Welcome back');

  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting('Good morning');
    else if (hrs < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const planId = subscription.planId || 'free';
  const planLabel = planId.toUpperCase();

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-emerald-400 selection:text-slate-950">
      
      {/* Immersive Cyber-Gradient Glowing Background Orbs */}
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-1/4 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        
        {/* Navigation & Header Section */}
        <header className="flex flex-col gap-5 border-b border-white/5 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-tr from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/20">
              <Boxes className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Toolkit Workspace</p>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h1 className="text-xl font-black text-white tracking-tight">Suite Launcher</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {session.session.platformAdmin && onOpenPlatformDashboard && (
              <button
                type="button"
                onClick={onOpenPlatformDashboard}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3.5 py-2 text-xs font-black text-cyan-300 transition duration-150 hover:bg-cyan-500/15 cursor-pointer"
              >
                <Shield className="h-3.5 w-3.5" />
                Platform Dashboard
              </button>
            )}

            <button
              type="button"
              onClick={onManageSubscription}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-black transition duration-150 cursor-pointer ${
                planId === 'free'
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15'
                  : 'border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/15'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              {planId === 'free' ? 'Upgrade Plan' : 'Manage Subscription'}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3.5 py-2 text-xs font-bold text-slate-300 transition duration-150 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Dynamic Welcome Workspace Banner */}
        <section className="mt-8 rounded-3xl border border-white/5 bg-linear-to-b from-white/10 to-white/5 p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-linear-to-l from-emerald-500/5 to-transparent" />
          
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                {greeting}
              </div>
              <h2 className="mt-2.5 text-2xl font-black text-white sm:text-3xl tracking-tight">
                {user.displayName || user.email || 'Workspace User'}
              </h2>
              <p className="mt-1.5 text-sm text-slate-400 leading-relaxed max-w-xl">
                Welcome to your centralized business toolkit environment. All applications share your workspace authentication, profile settings, and subscription states.
              </p>
            </div>

            {/* Current Active Plan Capability Info Badge */}
            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4.5 shrink-0 md:min-w-64">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Current Plan Status</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                  planId === 'pro'
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : planId === 'plus'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {planLabel}
                </span>
              </div>
              
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Unrestricted App Switcher</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  {planId !== 'free' ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-slate-500" />
                  )}
                  <span className={planId === 'free' ? 'text-slate-500 line-through' : ''}>Cloud Backup Sync Node</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  {planId === 'pro' ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-slate-500" />
                  )}
                  <span className={planId !== 'pro' ? 'text-slate-500 line-through' : ''}>Gemini AI Analytics Insights</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* App Launcher Space Grid */}
        <main className="mt-12">
          <div className="border-b border-white/5 pb-4 mb-6">
            <h3 className="text-lg font-black text-white tracking-tight">Application Launcher</h3>
            <p className="mt-1 text-xs text-slate-400">Instantly switch between authorized toolkit components with active session handoff.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {apps.map((app) => {
              const enabled = Boolean(entitlements.apps[app.id]);
              const isBudgetPlanner = app.id === 'budget-planner';

              return (
                <article
                  key={app.id}
                  className={`group rounded-3xl border p-6 transition-all duration-300 relative overflow-hidden backdrop-blur-md ${
                    enabled 
                      ? 'border-white/10 bg-white/5 hover:border-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/5 hover:-translate-y-1' 
                      : 'border-white/5 bg-white/[0.015]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={`rounded-2xl p-3.5 transition duration-300 ${
                      enabled 
                        ? 'bg-emerald-400/10 text-emerald-300 group-hover:bg-emerald-400/15 group-hover:scale-110' 
                        : 'bg-white/5 text-slate-600'
                    }`}>
                      {app.icon}
                    </div>
                    
                    {enabled ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                        <Check className="h-3.5 w-3.5" /> Ready to Open
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <Lock className="h-3.5 w-3.5 text-slate-600" /> Restricted
                      </span>
                    )}
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-black text-white group-hover:text-emerald-400 transition duration-150">
                        {app.name}
                      </h4>
                      <span className="text-[9px] font-black tracking-wider uppercase text-slate-500 px-1.5 py-0.5 rounded-md bg-white/5">
                        {app.tierRequired}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400 min-h-12">
                      {app.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">
                      {enabled ? 'Multi-device responsive' : 'Awaiting rollout'}
                    </span>
                    
                    <button
                      type="button"
                      disabled={!enabled}
                      onClick={isBudgetPlanner ? onOpenBudgetPlanner : undefined}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition duration-150 cursor-pointer ${
                        enabled
                          ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300 shadow-md shadow-emerald-400/10'
                          : 'bg-white/5 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {enabled ? (
                        <>
                          Open App <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        'Locked'
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </main>

        {/* Footer Support Information */}
        <footer className="mt-16 border-t border-white/5 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 Toolkit Hub. All Rights Reserved. Enforced by active Superadmin security layers.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 hover:text-slate-400 cursor-pointer">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              Secure Socket TLS Active
            </span>
            <span className="hover:text-slate-400 cursor-pointer flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5" />
              Support docs
            </span>
          </div>
        </footer>

      </div>
    </div>
  );
};
