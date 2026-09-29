import React, { useState } from 'react';
import {
  PieChart,
  Calendar,
  Coins,
  CreditCard,
  BarChart3,
  TrendingDown,
  CalendarDays,
  Settings as SettingsIcon,
  FileCode2,
  HardDriveDownload,
  Menu,
  X,
  LogOut,
  User,
  Check,
  ChevronDown,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { CurrencyCode, SettingsState, WorksheetTab } from '../types/budget';
import { CURRENCIES, MONTHS } from '../utils/formatters';

interface SidebarProps {
  activeTab: WorksheetTab;
  onSelectTab: (tab: WorksheetTab) => void;
  settings: SettingsState;
  onUpdateSettings: (newSettings: Partial<SettingsState>) => void;
  userEmail?: string;
  onLogout?: () => void;
  onOpenExportModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  settings,
  onUpdateSettings,
  userEmail = '',
  onLogout,
  onOpenExportModal,
}) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const navItems: { id: WorksheetTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <PieChart className="h-4.5 w-4.5" /> },
    { id: 'calendar_view', label: 'Calendar View', icon: <Calendar className="h-4.5 w-4.5" /> },
    { id: 'income', label: 'Income', icon: <Coins className="h-4.5 w-4.5" /> },
    { id: 'expenses', label: 'Expenses', icon: <CreditCard className="h-4.5 w-4.5" /> },
    { id: 'monthly_budget', label: 'Monthly Budget', icon: <BarChart3 className="h-4.5 w-4.5" /> },
    { id: 'debt_payoff', label: 'Debt Payoff', icon: <TrendingDown className="h-4.5 w-4.5" /> },
    { id: 'annual_summary', label: 'Annual Summary', icon: <CalendarDays className="h-4.5 w-4.5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="h-4.5 w-4.5" /> },
    { id: 'tech_specs', label: 'Tech Specs', icon: <FileCode2 className="h-4.5 w-4.5" /> },
  ];

  // Username display derivation
  const displayName = userEmail.includes('@')
    ? userEmail.split('@')[0].replace(/[._]/g, ' ')
    : userEmail;
  const capitalizedName = displayName
    .split(' ')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

  const handleNavClick = (id: WorksheetTab) => {
    onSelectTab(id);
    setIsOpenMobile(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0c1f38] text-[#d1e2f3]">
      {/* 1. Header App Branding Branding */}
      <div className="p-5 border-b border-[#182f4d] flex items-center gap-3">
        {/* logo */}
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
          <svg
            viewBox="0 0 56 48"
            className="h-8 w-8 drop-shadow-xs animate-pulse"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="28" cy="11" r="5" fill="#10b981" />
            <path
              d="M17 19C17 11.268 23.268 5 31 5C38.732 5 45 11.268 45 19"
              stroke="#10b981"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <rect
              x="4"
              y="14"
              width="48"
              height="32"
              rx="9"
              fill="#08182b"
            />
            <circle cx="44" cy="30" r="3" fill="#ffffff" />
            <circle cx="44" cy="30" r="1.5" fill="#08182b" />
          </svg>
        </div>
        <div>
          <h1 className="text-xs sm:text-sm font-black tracking-tight text-white leading-tight uppercase font-sans">
            Finance Manager
          </h1>
          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono">
            V2.5 Spreadsheet
          </span>
        </div>
      </div>

      {/* 2. Primary Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-thin">
        <span className="text-[9px] font-black text-[#5a7da0] px-3 uppercase tracking-wider block mb-2 select-none">
          Worksheet Ledger
        </span>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'text-[#d1e2f3] hover:bg-[#152e4d]/80 hover:text-white'
              }`}
            >
              <div className={isActive ? 'text-white' : 'text-[#7da9d6]'}>
                {item.icon}
              </div>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        {/* Home option */}
        <button
          onClick={() => handleNavClick('start_here')}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-bold text-[#b5cbdf] hover:bg-[#152e4d]/60 hover:text-white transition-all cursor-pointer mt-4"
        >
          <span className="text-[#a0bacf]">🏠</span>
          <span>Return Home</span>
        </button>
      </div>

      {/* 3. Global Spreadsheet Controls (Currency, Month, Year) */}
      <div className="p-4 border-t border-[#182f4d] bg-[#09172b]/50 space-y-3.5">
        <span className="text-[9px] font-black text-[#5a7da0] uppercase tracking-wider block select-none leading-none">
          Active Period Setup
        </span>

        {/* Currency Select */}
        <div className="space-y-1">
          <label htmlFor="currency-select" className="text-[10px] font-extrabold text-[#7da9d6] block uppercase tracking-wide">
            Currency
          </label>
          <select
            id="currency-select"
            value={settings.currency}
            onChange={(e) =>
              onUpdateSettings({ currency: e.target.value as CurrencyCode })
            }
            className="w-full rounded border border-[#213f63] bg-[#0c1f38] px-2 py-1.5 text-xs font-bold text-white shadow-3xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
          >
            {Object.entries(CURRENCIES).map(([code, item]) => (
              <option key={code} value={code}>
                {item.symbol} - {item.label}
              </option>
            ))}
          </select>
        </div>

        {/* Month Select */}
        <div className="space-y-1">
          <label htmlFor="month-select" className="text-[10px] font-extrabold text-[#7da9d6] block uppercase tracking-wide">
            Spreadsheet Month
          </label>
          <select
            id="month-select"
            value={settings.month}
            onChange={(e) => onUpdateSettings({ month: e.target.value })}
            className="w-full rounded border border-[#213f63] bg-[#0c1f38] px-2 py-1.5 text-xs font-bold text-white shadow-3xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Year Select */}
        <div className="space-y-1">
          <label htmlFor="year-select" className="text-[10px] font-extrabold text-[#7da9d6] block uppercase tracking-wide">
            Calendar Year
          </label>
          <input
            id="year-select"
            type="number"
            value={settings.year}
            onChange={(e) => onUpdateSettings({ year: Number(e.target.value) })}
            className="w-full rounded border border-[#213f63] bg-[#0c1f38] px-2 py-1.5 text-xs font-bold text-white shadow-3xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
          />
        </div>

        {/* Backup export button */}
        {onOpenExportModal && (
          <button
            type="button"
            onClick={onOpenExportModal}
            className="w-full inline-flex h-9 items-center justify-center gap-2 rounded bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-xs font-black text-white shadow-xs transition-all cursor-pointer group"
          >
            <HardDriveDownload className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
            <span>Download Backup</span>
          </button>
        )}
      </div>

      {/* 4. Bottom User profile card */}
      <div className="p-4 border-t border-[#182f4d] bg-[#07172b]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg bg-[#152e4d] text-emerald-400 shadow-3xs">
              <User className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-white block truncate leading-tight">
                {capitalizedName}
              </span>
              <span className="text-[9px] font-bold text-slate-400 block truncate">
                {userEmail}
              </span>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors cursor-pointer"
              title="Logout session"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col shrink-0 w-64 bg-[#0c1f38] h-screen sticky top-0 border-r border-[#152e4d] shadow-md z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sticky top navigation bar */}
      <div className="lg:hidden sticky top-0 z-40 w-full bg-[#0c1f38] text-white border-b border-[#152e4d] px-4 py-3 flex items-center justify-between shadow-xs select-none">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsOpenMobile(true)}
            className="p-1 rounded bg-[#152e4d] hover:bg-[#1c3a5e] text-slate-200 transition-colors cursor-pointer"
            title="Open Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5 text-left">
            <span className="text-xs font-black uppercase tracking-wider">Planner Command</span>
          </div>
        </div>

        <div className="text-[10px] uppercase font-mono font-black text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-900">
          {settings.month} {settings.year}
        </div>
      </div>

      {/* Mobile Drawer panel overlay */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs transition-opacity duration-200"
            onClick={() => setIsOpenMobile(false)}
          />

          {/* Drawer content */}
          <div className="relative flex flex-col w-64 max-w-xs h-full bg-[#0c1f38] shadow-2xl animate-in slide-in-from-left duration-200 z-50">
            {/* Close button inside drawer */}
            <div className="absolute right-3 top-3 z-50">
              <button
                type="button"
                onClick={() => setIsOpenMobile(false)}
                className="p-1.5 rounded-lg bg-[#152e4d]/70 text-slate-300 hover:text-white cursor-pointer"
                title="Close Menu"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
