import React from 'react';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Coins,
  Flame,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  PieChart,
  PiggyBank,
  Receipt,
  Scale,
  Settings as SettingsIcon,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  User,
  Wallet,
  Zap,
} from 'lucide-react';
import { WorksheetTab } from '../../types/budget';

interface StartHereSheetProps {
  onNavigate: (tab: WorksheetTab) => void;
  onSelectCell: (info: { reference: string; value: string; formula?: string; isCalculated: boolean }) => void;
  userEmail?: string;
  onLogout?: () => void;
}

export const StartHereSheet: React.FC<StartHereSheetProps> = ({
  onNavigate,
  onSelectCell,
  userEmail = '',
  onLogout,
}) => {
  // 6 Sequential Quick Start Steps (Streamlined without redundant navigation directory)
  const quickStartSteps = [
    {
      step: 1,
      instruction: 'Configure preferences & Google Sheets DB in Settings.',
      description: 'Set your preferred currency, connect your Google Drive spreadsheet database for live sync, and customize your income & expense categories.',
      target: 'settings' as WorksheetTab,
      sheetLabel: 'Settings',
      btnText: 'Open Settings',
      icon: <SettingsIcon className="h-5 w-5 text-slate-700" />,
      tagColor: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    {
      step: 2,
      instruction: 'Enter your income.',
      description: 'Record all revenue streams including salary, freelance income, business profits, dividends, and other incoming cashflow.',
      target: 'income' as WorksheetTab,
      sheetLabel: 'Income',
      btnText: 'Enter Income',
      icon: <Coins className="h-5 w-5 text-teal-600" />,
      tagColor: 'bg-teal-50 text-teal-800 border-teal-200',
    },
    {
      step: 3,
      instruction: 'Record your expenses.',
      description: 'Track daily transactions by category, payment method (credit card, bank transfer, cash), and amount for a complete audit trail.',
      target: 'expenses' as WorksheetTab,
      sheetLabel: 'Expenses',
      btnText: 'Record Expenses',
      icon: <Receipt className="h-5 w-5 text-rose-600" />,
      tagColor: 'bg-rose-50 text-rose-800 border-rose-200',
    },
    {
      step: 4,
      instruction: 'Set planned amounts in Monthly Budget.',
      description: 'Define planned spending limits and income targets to activate automatic real-time variance (=Planned - Actual) calculations.',
      target: 'monthly_budget' as WorksheetTab,
      sheetLabel: 'Monthly Budget',
      btnText: 'Set Planned Budget',
      icon: <Scale className="h-5 w-5 text-indigo-600" />,
      tagColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    },
    {
      step: 5,
      instruction: 'Review the Dashboard.',
      description: 'Analyze executive KPI summary cards, cashflow bars, expense donut breakdown, and automated financial insights.',
      target: 'dashboard' as WorksheetTab,
      sheetLabel: 'Dashboard',
      btnText: 'Review Dashboard',
      icon: <PieChart className="h-5 w-5 text-blue-600" />,
      tagColor: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    {
      step: 6,
      instruction: 'Monitor annual progress.',
      description: 'Evaluate cumulative 12-month performance, annual savings rate velocity, and long-term financial trajectory.',
      target: 'annual_summary' as WorksheetTab,
      sheetLabel: 'Annual Summary',
      btnText: 'Track Annual Progress',
      icon: <CalendarDays className="h-5 w-5 text-purple-600" />,
      tagColor: 'bg-purple-50 text-purple-800 border-purple-200',
    },
  ];

  // The 5 Action-Oriented Feature Cards
  const actionFeatureCards = [
    {
      title: 'Track Income & Expenses',
      badge: 'Dual Ledgers',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: <Wallet className="h-6 w-6 text-blue-600" />,
      bg: 'bg-gradient-to-br from-blue-50/90 to-blue-50/30 border-blue-200',
      desc: 'Seamlessly log and categorize income and expenses with automated SUM totals, payment method tags, and transaction filters.',
      actions: [
        { label: 'Log Income', target: 'income' as WorksheetTab, icon: <Coins className="h-3.5 w-3.5 text-teal-600" /> },
        { label: 'Log Expenses', target: 'expenses' as WorksheetTab, icon: <Receipt className="h-3.5 w-3.5 text-rose-600" /> },
      ],
    },
    {
      title: 'Compare Planned vs Actual',
      badge: 'Variance Engine',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: <BarChart3 className="h-6 w-6 text-emerald-600" />,
      bg: 'bg-gradient-to-br from-emerald-50/90 to-emerald-50/30 border-emerald-200',
      desc: 'Measure variances (=Planned - Actual) with instant percentage utilization badges to maintain fiscal discipline across categories.',
      actions: [
        { label: 'Open Monthly Budget', target: 'monthly_budget' as WorksheetTab, icon: <Scale className="h-3.5 w-3.5 text-emerald-700" /> },
      ],
    },
    {
      title: 'Monitor Savings',
      badge: 'Net Surplus & Velocity',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      icon: <PiggyBank className="h-6 w-6 text-teal-600" />,
      bg: 'bg-gradient-to-br from-teal-50/90 to-teal-50/30 border-teal-200',
      desc: 'Track net monthly surplus (=Income - Expenses) and real-time savings rate percentages against target benchmarks.',
      actions: [
        { label: 'View Dashboard Savings', target: 'dashboard' as WorksheetTab, icon: <PieChart className="h-3.5 w-3.5 text-teal-700" /> },
      ],
    },
    {
      title: 'Identify Overspending',
      badge: '3-Tier Warning System',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      icon: <ShieldAlert className="h-6 w-6 text-rose-600" />,
      bg: 'bg-gradient-to-br from-rose-50/90 to-rose-50/30 border-rose-200',
      desc: 'Visual three-tier status alerts highlight On Track (0-80%), Near Limit (81-100%), and Over Budget (>100%) spending immediately.',
      actions: [
        { label: 'Review Category Alerts', target: 'monthly_budget' as WorksheetTab, icon: <Flame className="h-3.5 w-3.5 text-rose-600" /> },
      ],
    },
    {
      title: 'Review Financial Trends',
      badge: '12-Month Trajectory',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: <TrendingUp className="h-6 w-6 text-purple-600" />,
      bg: 'bg-gradient-to-br from-purple-50/90 to-purple-50/30 border-purple-200',
      desc: '12-month comparative trajectory charts reveal seasonal patterns, spending shifts, and cumulative annual savings velocity.',
      actions: [
        { label: 'Explore Annual Trends', target: 'annual_summary' as WorksheetTab, icon: <CalendarDays className="h-3.5 w-3.5 text-purple-700" /> },
      ],
    },
  ];

  return (
    <div
      className="min-h-screen bg-slate-100 text-slate-900"
      onClick={() =>
        onSelectCell({
          reference: 'StartHere!A1',
          value: 'Welcome to Your Personal Monthly Budget Planner',
          isCalculated: false,
        })
      }
    >
      {/* ============================================================ */}
      {/* 0. DEDICATED LANDING PAGE NAVBAR (Outside Dashboard Header) */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-30 border-b border-slate-300/80 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
              <svg
                viewBox="0 0 56 48"
                className="h-10 w-10 drop-shadow-xs"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="28" cy="11" r="5" fill="#059669" />
                <path
                  d="M17 19C17 11.268 23.268 5 31 5C38.732 5 45 11.268 45 19"
                  stroke="#10b981"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M21 21C21 14.5 25.5 10 32 10"
                  stroke="#047857"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <rect
                  x="4"
                  y="14"
                  width="48"
                  height="32"
                  rx="9"
                  fill="#0b3052"
                />
                <path
                  d="M4 22H52"
                  stroke="#16436f"
                  strokeWidth="2"
                />
                <path
                  d="M38 24H50C51.6569 24 53 25.3431 53 27V33C53 34.6569 51.6569 36 50 36H38C36.3431 36 35 34.6569 35 33V27C35 25.3431 36.3431 24 38 24Z"
                  fill="#0b3052"
                  stroke="#1d4d7a"
                  strokeWidth="1.5"
                />
                <circle cx="44" cy="30" r="3" fill="#ffffff" />
                <circle cx="44" cy="30" r="1.5" fill="#0b3052" />
                <rect x="1" y="22" width="3" height="12" rx="1.5" fill="#00a86b" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-lg font-extrabold tracking-tight text-[#0c325c] truncate max-w-[150px] sm:max-w-none">
                  Personal Monthly Budget Planner
                </span>
                <span className="hidden sm:inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                  Landing Route
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Plan Today • Track Spending • Save More • Reach Your Goals
              </p>
            </div>
          </div>

          {/* Right Navigation & Session Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <User className="h-3.5 w-3.5 text-blue-600" />
              <span className="max-w-[160px] truncate">{userEmail}</span>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Log out"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2 sm:px-2.5 py-1.5 sm:py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:shadow-md transition-all cursor-pointer ring-2 ring-blue-400/30 shrink-0"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden xs:inline">Launch Dashboard</span>
              <span className="xs:hidden">Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Landing Page Content Body */}
      <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
        {/* ============================================================ */}
        {/* 1. WELCOME SECTION (Landing Route Hero) */}
        {/* ============================================================ */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-300/80 bg-gradient-to-br from-[#0b2b4f] via-[#0e3b6c] to-[#092240] text-white shadow-xl">
          {/* Decorative background glow accents */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-blue-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl" />

          <div className="relative z-10 grid gap-8 p-6 sm:p-8 lg:p-10 lg:grid-cols-12 lg:items-center">
            <div className="space-y-4 lg:col-span-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-500/20 px-3.5 py-1 text-xs font-semibold text-blue-200 backdrop-blur-xs">
                <Sparkles className="h-3.5 w-3.5 text-blue-300" />
                <span>Onboarding Hub • Landing Page After Login</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl text-white">
                Welcome to Your Personal Monthly Budget Planner
              </h1>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl">
                Take confident control of your finances. This complete financial workbook empowers you to master your cash flow, eliminate financial stress, and systematically reach your goals:
              </p>

              {/* 6 Core Value Proposition Items */}
              <div className="grid gap-2.5 sm:grid-cols-2 pt-1">
                {[
                  { title: 'Plan monthly income', desc: 'Set clear earnings targets across salaries, business, and investments' },
                  { title: 'Track expenses', desc: 'Log daily outlays by category, payment method, and amount' },
                  { title: 'Compare planned vs actual spending', desc: 'Real-time variance analysis and budget utilization tracking' },
                  { title: 'Monitor savings', desc: 'Track net monthly surplus and maintain savings rate benchmarks' },
                  { title: 'Identify overspending', desc: 'Instant conditional alerts when nearing or exceeding category limits' },
                  { title: 'Review monthly and annual performance', desc: 'Interactive charts and comprehensive 12-month analytics' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 rounded-lg bg-white/10 p-2.5 backdrop-blur-xs border border-white/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-white block">{item.title}</span>
                      <span className="text-[11px] text-slate-300 leading-snug">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Action Jump Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('dashboard');
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/40 hover:from-blue-500 hover:to-indigo-500 transition-all hover:scale-102 cursor-pointer"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Launch Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('settings');
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-400/60 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
                >
                  <SettingsIcon className="h-4 w-4 text-slate-300" />
                  <span>Configure Preferences</span>
                </button>
              </div>
            </div>

            {/* Right Motivational Card / Financial Wisdom */}
            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                    <Lightbulb className="h-4 w-4" />
                    <span>Financial Wisdom</span>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                    Rule of Thumb
                  </span>
                </div>

                <blockquote className="text-sm sm:text-base font-semibold italic leading-relaxed text-slate-100">
                  &ldquo;A budget gives you permission to spend without guilt and to save without sacrifice.&rdquo;
                </blockquote>

                <div className="rounded-xl bg-black/25 p-3 text-xs text-slate-300 space-y-1.5 border border-white/5">
                  <div className="flex items-center justify-between font-medium">
                    <span>Golden Budgeting Rule:</span>
                    <span className="text-emerald-300 font-bold">50 / 30 / 20</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    50% Needs • 30% Wants • 20% Savings & Debt Acceleration.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-slate-300 border-t border-white/10">
                  <span>Plan Today</span>
                  <span className="font-extrabold text-emerald-400">Reach Your Goals</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. CLEAR QUICK START GUIDE (AVOIDS REDUNDANCY) */}
        {/* ============================================================ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                  Quick Start Guide
                </h2>
              </div>
              <p className="text-xs text-slate-500 sm:text-sm mt-0.5">
                Follow these 6 streamlined steps to set up and manage your finances. Click any step to jump straight to that worksheet in the workbook:
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200/60">
              6 Setup Milestones
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickStartSteps.map((item) => (
              <div
                key={item.step}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(item.target);
                }}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-md cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0c325c] text-xs font-bold text-white shadow-2xs group-hover:bg-blue-600 transition-colors">
                        {item.step}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-700">
                        Step {item.step}
                      </span>
                    </div>
                    <div className="rounded-lg bg-white p-2 shadow-2xs border border-slate-200">
                      {item.icon}
                    </div>
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-blue-700">
                    {item.instruction}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200/70 pt-2.5">
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${item.tagColor}`}>
                    Sheet: {item.sheetLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                    <span>{item.btnText}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. ACTION-ORIENTED FEATURE CARDS */}
        {/* ============================================================ */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                Key Features & Direct Actions
              </h2>
              <p className="text-xs text-slate-500">
                Powerful tools designed around professional financial management principles
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
              5 Core Capabilities
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {actionFeatureCards.map((feat, i) => (
              <div
                key={i}
                className={`flex flex-col justify-between rounded-xl border p-4 shadow-2xs ${feat.bg} transition-all duration-150 hover:shadow-md hover:-translate-y-0.5`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="rounded-lg bg-white p-2.5 shadow-2xs border border-slate-200/80">
                      {feat.icon}
                    </div>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${feat.badgeColor}`}>
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{feat.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    {feat.desc}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-200/70 space-y-1.5">
                  {feat.actions.map((act, actIdx) => (
                    <button
                      key={actIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(act.target);
                      }}
                      className="w-full flex items-center justify-between rounded-lg bg-white/90 hover:bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs hover:border-blue-400 hover:text-blue-700 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        {act.icon}
                        <span>{act.label}</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. PRO-TIPS & FINANCIAL METHODOLOGY FOOTER */}
        {/* ============================================================ */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-emerald-50/70 p-6 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-start gap-3.5 max-w-2xl">
              <div className="rounded-xl bg-blue-600 p-2.5 text-white shrink-0 mt-0.5 shadow-xs">
                <Lightbulb className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                  Pro Strategy: Zero-Based Budgeting Technique
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Allocate every single dollar of your incoming earnings to essential expenses, discretionary goals, savings, investments, or debt acceleration so that your unallocated balance equals zero. When every dollar is assigned a job, wasteful spending is naturally eliminated.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Real-time formula calculation
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Dynamic 3-tier variance alerting
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Full 12-month annual rollup
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate('dashboard');
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0c325c] hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <span>Explore Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate('settings');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
              >
                <SettingsIcon className="h-3.5 w-3.5 text-slate-500" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5. LANDING PAGE FOOTER */}
        {/* ============================================================ */}
        <footer className="border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
          <p>
            Personal Monthly Budget Planner • Built for disciplined personal wealth management.
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Click &quot;Launch Dashboard&quot; or any step above to enter the Excel workbook sheets.
          </p>
        </footer>
      </div>
    </div>
  );
};
