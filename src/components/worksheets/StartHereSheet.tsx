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
import type { Debt, FinancialAsset, WorksheetTab } from '../../types/budget';

interface StartHereSheetProps {
  onNavigate: (tab: WorksheetTab) => void;
  onSelectCell: (info: { reference: string; value: string; formula?: string; isCalculated: boolean }) => void;
  userEmail?: string;
  onLogout?: () => void;
  onOpenToolkit?: () => void;
  openingCashBalance?: number;
  financialAssets?: FinancialAsset[];
  debts?: Debt[];
}

export const StartHereSheet: React.FC<StartHereSheetProps> = ({
  onNavigate,
  onSelectCell,
  userEmail = '',
  onLogout,
  onOpenToolkit,
  openingCashBalance = 0,
  financialAssets = [],
  debts = [],
}) => {
  const openingAssetsTotal = Math.max(0, Number(openingCashBalance) || 0) + financialAssets.reduce((sum, asset) => sum + Math.max(0, Number(asset.amount) || 0), 0);
  const openingDebtsTotal = debts.reduce((sum, debt) => sum + Math.max(0, Number(debt.balance) || 0), 0);
  const openingNetWorth = openingAssetsTotal - openingDebtsTotal;
  // 6 Sequential Quick Start Steps (Streamlined and responsive)
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
      icon: <Coins className="h-5 w-5 text-emerald-600" />,
      tagColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
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
      icon: <Scale className="h-5 w-5 text-blue-600" />,
      tagColor: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    {
      step: 5,
      instruction: 'Review the Dashboard.',
      description: 'Analyze executive KPI summary cards, cashflow bars, expense donut breakdown, and automated financial insights.',
      target: 'dashboard' as WorksheetTab,
      sheetLabel: 'Dashboard',
      btnText: 'Review Dashboard',
      icon: <PieChart className="h-5 w-5 text-indigo-600" />,
      tagColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    },
    {
      step: 6,
      instruction: 'Monitor annual progress.',
      description: 'Evaluate cumulative 12-month performance, annual savings rate velocity, and long-term financial trajectory.',
      target: 'annual_summary' as WorksheetTab,
      sheetLabel: 'Annual Summary',
      btnText: 'Track Annual Progress',
      icon: <CalendarDays className="h-5 w-5 text-violet-600" />,
      tagColor: 'bg-violet-50 text-violet-800 border-violet-200',
    },
  ];

  // The 5 Action-Oriented Feature Cards
  const actionFeatureCards = [
    {
      title: 'Track Income & Expenses',
      badge: 'Dual Ledgers',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Wallet className="h-6 w-6 text-blue-600" />,
      bg: 'bg-white border-slate-200/80 hover:border-blue-300',
      desc: 'Seamlessly log and categorize income and expenses with automated SUM totals, payment method tags, and transaction filters.',
      actions: [
        { label: 'Log Income', target: 'income' as WorksheetTab, icon: <Coins className="h-3.5 w-3.5 text-emerald-600" /> },
        { label: 'Log Expenses', target: 'expenses' as WorksheetTab, icon: <Receipt className="h-3.5 w-3.5 text-rose-600" /> },
      ],
    },
    {
      title: 'Compare Planned vs Actual',
      badge: 'Variance Engine',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <BarChart3 className="h-6 w-6 text-emerald-600" />,
      bg: 'bg-white border-slate-200/80 hover:border-emerald-300',
      desc: 'Measure variances (=Planned - Actual) with instant percentage utilization badges to maintain fiscal discipline across categories.',
      actions: [
        { label: 'Open Monthly Budget', target: 'monthly_budget' as WorksheetTab, icon: <Scale className="h-3.5 w-3.5 text-emerald-700" /> },
      ],
    },
    {
      title: 'Monitor Savings Goals',
      badge: 'Net Surplus & Velocity',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: <PiggyBank className="h-6 w-6 text-indigo-600" />,
      bg: 'bg-white border-slate-200/80 hover:border-indigo-300',
      desc: 'Track net monthly surplus (=Income - Expenses) and real-time savings rate percentages against target benchmarks.',
      actions: [
        { label: 'View Dashboard Savings', target: 'dashboard' as WorksheetTab, icon: <PieChart className="h-3.5 w-3.5 text-indigo-700" /> },
      ],
    },
    {
      title: 'Identify Overspending',
      badge: '3-Tier Warning System',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <ShieldAlert className="h-6 w-6 text-rose-600" />,
      bg: 'bg-white border-slate-200/80 hover:border-rose-300',
      desc: 'Visual three-tier status alerts highlight On Track (0-80%), Near Limit (81-100%), and Over Budget (>100%) spending immediately.',
      actions: [
        { label: 'Review Category Alerts', target: 'monthly_budget' as WorksheetTab, icon: <Flame className="h-3.5 w-3.5 text-rose-600" /> },
      ],
    },
    {
      title: 'Review Financial Trends',
      badge: '12-Month Trajectory',
      badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
      icon: <TrendingUp className="h-6 w-6 text-violet-600" />,
      bg: 'bg-white border-slate-200/80 hover:border-violet-300',
      desc: '12-month comparative trajectory charts reveal seasonal patterns, spending shifts, and cumulative annual savings velocity.',
      actions: [
        { label: 'Explore Annual Trends', target: 'annual_summary' as WorksheetTab, icon: <CalendarDays className="h-3.5 w-3.5 text-violet-700" /> },
      ],
    },
  ];

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-800 selection:bg-emerald-200 selection:text-slate-900"
      onClick={() =>
        onSelectCell({
          reference: 'StartHere!A1',
          value: 'Welcome to Your Personal Monthly Budget Planner',
          isCalculated: false,
        })
      }
    >
      {/* Dynamic Header Navbar Section */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-tr from-blue-700 to-indigo-700 shadow-md shadow-indigo-700/10 text-white">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 truncate max-w-[150px] sm:max-w-none">
                  BudgetPlanner
                </span>
                <span className="hidden sm:inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 border border-emerald-200">
                  Active Workspace
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden md:block mt-0.5">
                Modern Double-Entry Ledger & Financial Insights Panel
              </p>
            </div>
          </div>

          {/* Right Navigation & Session Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              <User className="h-3.5 w-3.5 text-blue-600" />
              <span className="max-w-[140px] truncate">{userEmail}</span>
            </div>

            {onOpenToolkit && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenToolkit(); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 px-3 py-1.5 text-xs font-black text-slate-600 transition duration-150 cursor-pointer"
              >
                <span>Apps Launcher</span>
              </button>
            )}

            {onLogout && (
              <button
                onClick={(e) => { e.stopPropagation(); onLogout(); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 px-3 py-1.5 text-xs font-black text-slate-600 transition duration-150 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); onNavigate('dashboard'); }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 px-3.5 py-2 text-xs font-black text-white shadow-sm transition duration-150 cursor-pointer"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Launch Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        {/* ========================================== */}
        {/* HERO SECTION / LANDING ROUTE OVERVIEW      */}
        {/* ========================================== */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 text-white shadow-xl">
          {/* Subtle background glow accents */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative z-10 grid gap-8 p-6 sm:p-8 lg:p-10 lg:grid-cols-12 lg:items-center">
            
            {/* Left Column Content */}
            <div className="space-y-4.5 lg:col-span-8">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 border border-white/5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Executive Budget Workspace</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl text-white leading-tight">
                Control your cashflow.<br />
                Reach your financial milestones.
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                Take command of your wealth using professional budgeting workflows. Plan targets, record transaction ledgers, analyze variances, and track seasonal trajectory patterns.
              </p>

              {/* Quick Feature highlights */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                {[
                  { title: 'Zero-Based Budgets', desc: 'Give every dollar a job to optimize allocation efficiency.' },
                  { title: 'Variance Tracking', desc: 'Real-time comparisons of planned vs actual categories.' },
                  { title: 'Conditional Warnings', desc: 'Visual 3-tier highlights on category budget utilization.' },
                  { title: 'Unified Data Sync', desc: 'Secure local workbook with optional Google Drive backup.' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 rounded-2xl bg-white/5 p-3.5 border border-white/5 backdrop-blur-xs">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-white block">{item.title}</span>
                      <span className="text-[11px] text-slate-400 leading-normal mt-0.5 block">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Direct Call to Action buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onNavigate('dashboard'); }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-3 text-xs font-black shadow-lg shadow-emerald-500/10 transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Launch Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onNavigate('settings'); }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-3 text-xs font-black text-slate-200 transition-colors cursor-pointer"
                >
                  <SettingsIcon className="h-4 w-4 text-slate-300" />
                  <span>Configure Settings</span>
                </button>
              </div>
            </div>

            {/* Right Column Motivation Card */}
            <div className="lg:col-span-4">
              <div className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    <Lightbulb className="h-4 w-4 animate-pulse" />
                    <span>Methodology Strategy</span>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-300 border border-emerald-500/20">
                    Rule of Thumb
                  </span>
                </div>

                <blockquote className="text-xs sm:text-sm font-semibold italic leading-relaxed text-slate-200">
                  &ldquo;Allocation gives you permission to spend without guilt, and to save without compromise.&rdquo;
                </blockquote>

                <div className="rounded-2xl bg-slate-950/60 p-3.5 text-xs space-y-2 border border-white/5">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-300">The 50/30/20 Standard:</span>
                    <span className="text-emerald-400 font-black">Target</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    <strong>50% Needs</strong> (Essentials) • <strong>30% Wants</strong> (Discretionary) • <strong>20% Savings</strong> & Debt payoffs.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] font-bold text-slate-400">
                  <span>Balanced Cashflow</span>
                  <span className="text-emerald-400 font-extrabold uppercase">Durable Growth</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================== */}
        {/* STARTING FINANCIAL POSITION                */}
        {/* ========================================== */}
        <section className="rounded-3xl border border-emerald-250 bg-linear-to-tr from-emerald-50/20 via-white to-slate-50 p-6 sm:p-7 shadow-xs relative overflow-hidden">
          <div className="absolute right-0 top-0 h-40 w-40 bg-radial from-emerald-400/10 to-transparent pointer-events-none" />
          
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 shadow-3xs shrink-0">
                  <Wallet className="h-4.5 w-4.5" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Starting Financial Position</h2>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl font-semibold leading-relaxed">
                Log the assets, cash accounts, and outstanding liabilities you held before starting tracking. Establishing this exact opening position guarantees absolute net worth accuracy.
              </p>
            </div>
            
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-right shadow-3xs shrink-0 select-none">
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-700">Opening net worth</p>
              <p className="mt-1 text-xl font-black text-slate-900 font-mono tracking-tight">
                {openingNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-150 bg-white p-4.5 hover:border-slate-300 transition-all shadow-4xs flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Opening Cash + Assets</p>
                <p className="mt-1.5 text-lg font-black text-slate-900 font-mono">
                  {openingAssetsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>{financialAssets.length} active starting asset{financialAssets.length === 1 ? '' : 's'}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-150 bg-white p-4.5 hover:border-slate-300 transition-all shadow-4xs flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Pre-existing Liabilities</p>
                <p className="mt-1.5 text-lg font-black text-rose-600 font-mono">
                  {openingDebtsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${debts.length > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-350'}`} />
                <span>{debts.length} active starting debt{debts.length === 1 ? '' : 's'}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-150 bg-white p-4.5 hover:border-slate-300 transition-all shadow-4xs flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Pacing Strategy Guide</p>
                <p className="mt-1.5 text-sm font-black text-slate-800 leading-snug">
                  Set Assets & Cash, Then Layer Liabilities
                </p>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500 font-semibold">
                Saves automatically inside your workbook
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onNavigate('net_worth'); }}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-black text-white px-4 py-3 shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/15 transition-all cursor-pointer border border-emerald-500 active:bg-emerald-800"
            >
              <Wallet className="h-4 w-4" />
              <span>Edit cash & assets</span>
              <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onNavigate('debt_payoff'); }}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 text-xs font-black text-rose-700 px-4 py-3 transition-all cursor-pointer active:bg-rose-200"
            >
              <Scale className="h-4 w-4" />
              <span>Edit starting debts</span>
              <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>
        </section>

        {/* ========================================== */}
        {/* QUICK START SECTION / PROCESS FLOW        */}
        {/* ========================================== */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Guided Workbook Setup
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete these 6 milestones sequentially to initialize your spreadsheet model database.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700 border border-blue-100 shrink-0">
              6 Active Milestones
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
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-4.5 transition-all duration-300 hover:border-blue-400 hover:bg-blue-50/20 hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white shadow-2xs group-hover:bg-blue-600 transition-colors">
                        {item.step}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-blue-700 transition-colors">
                        Step 0{item.step}
                      </span>
                    </div>
                    <div className="rounded-xl bg-white p-2 shadow-2xs border border-slate-200 transition group-hover:scale-110">
                      {item.icon}
                    </div>
                  </div>

                  <h3 className="mt-4 text-sm font-black text-slate-950 group-hover:text-blue-700 transition-colors">
                    {item.instruction}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${item.tagColor}`}>
                    Tab: {item.sheetLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-black text-blue-600 group-hover:translate-x-0.5 transition-transform">
                    <span>{item.btnText}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================== */}
        {/* CORE CAPABILITIES GRID MODULES            */}
        {/* ========================================== */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Unified Ledger Features
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Engineered around structural double-entry validation constraints.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 border border-slate-200 shrink-0">
              5 Ledger Modules
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {actionFeatureCards.map((feat, i) => (
              <div
                key={i}
                className={`flex flex-col justify-between rounded-2xl border p-4.5 shadow-2xs ${feat.bg} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 bg-white`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      {feat.icon}
                    </div>
                    <span className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${feat.badgeColor}`}>
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-950">{feat.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {feat.desc}
                  </p>
                </div>

                {/* Direct sheet jump links */}
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                  {feat.actions.map((act, actIdx) => (
                    <button
                      key={actIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(act.target);
                      }}
                      className="w-full flex items-center justify-between rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
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

        {/* ========================================== */}
        {/* ZERO-BASED BUDGET STRATEGY STATEMENT       */}
        {/* ========================================== */}
        <div className="rounded-3xl border border-blue-100 bg-linear-to-r from-blue-50/40 via-indigo-50/40 to-emerald-50/40 p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-4 max-w-2xl">
              <div className="rounded-2xl bg-blue-600 p-3 text-white shrink-0 shadow-md shadow-blue-600/10">
                <Lightbulb className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-950 tracking-tight">
                  Pro-Strategy: Enforce Zero-Based Principles
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Zero-based budgeting demands allocating every single dollar of incoming cashflow to specific categories (Wants, Needs, Savings, Debts) until your unallocated surplus equals zero. When all earnings have defined jobs, financial waste drops to near zero.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Real-time spreadsheet engine
                  </span>
                  <span className="hidden xs:inline">•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Active variance calculations
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onNavigate('dashboard'); }}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <span>Launch Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER METRICS AND NOTES */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4">
          <p className="font-semibold text-slate-500">
            BudgetPlanner Ledger System • Plan • Track • Review
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Use the app switcher above or navigation sidebar to transition tabs cleanly.
          </p>
        </div>
      </footer>
    </div>
  );
};
