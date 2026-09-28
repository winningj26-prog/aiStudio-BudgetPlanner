import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  Coins,
  CreditCard,
  DollarSign,
  FileCode2,
  HardDriveDownload,
  Home,
  Menu,
  PieChart,
  Settings as SettingsIcon,
  X,
} from 'lucide-react';
import { CURRENCIES, MONTHS } from '../utils/formatters';
import { CurrencyCode, SettingsState, WorksheetTab } from '../types/budget';

interface HeaderProps {
  activeTab: WorksheetTab;
  onSelectTab: (tab: WorksheetTab) => void;
  settings: SettingsState;
  onUpdateSettings: (newSettings: Partial<SettingsState>) => void;
  userEmail?: string;
  onLogout?: () => void;
  onOpenExportModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  settings,
  onUpdateSettings,
  userEmail = 'winningj26@gmail.com',
  onLogout,
  onOpenExportModal,
}) => {
  // Mobile right dropdown menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    }
    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  // Primary workbook navigation items: Dashboard first, Settings last.
  const navItems: { id: WorksheetTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <PieChart className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'income', label: 'Income', icon: <Coins className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'expenses', label: 'Expenses', icon: <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'monthly_budget', label: 'Monthly Budget', icon: <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'annual_summary', label: 'Annual Summary', icon: <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5" /> },
  ];

  const currentActiveItem = navItems.find((item) => item.id === activeTab) || {
    id: activeTab,
    label: activeTab === 'tech_specs' ? 'Tech Specs' : activeTab.replace('_', ' '),
    icon: <PieChart className="h-4 w-4" />,
  };

  const handleMobileNavClick = (tab: WorksheetTab) => {
    onSelectTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#cbddec] bg-gradient-to-r from-[#eef6fc] via-[#f4f9fd] to-[#ebf4fb] shadow-xs">
      <div className="mx-auto flex items-center justify-between px-3 py-2 sm:px-5 lg:px-6">
        {/* ======================================================== */}
        {/* LEFT: App Branding Logo & Identity */}
        {/* ======================================================== */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 text-left">
            {/* Custom Stylized Wallet Logo from reference design */}
            <div className="relative flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center">
              <svg
                viewBox="0 0 56 48"
                className="h-8 w-8 sm:h-10 sm:w-10 drop-shadow-xs"
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
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-xs sm:text-base lg:text-lg xl:text-xl font-extrabold tracking-tight text-[#0c325c] truncate max-w-[150px] sm:max-w-none">
                  Personal Monthly Budget Planner
                </h1>
              </div>
              <p className="hidden md:block text-[11px] sm:text-xs font-medium text-[#2d5684] tracking-wide">
                Plan Today <span className="text-[#3b82f6] mx-0.5">•</span> Track Spending <span className="text-[#3b82f6] mx-0.5">•</span> Save More <span className="text-[#3b82f6] mx-0.5">•</span> Reach Your Goals
              </p>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CENTER: Desktop Navigation Tabs (Hidden on small/medium screens) */}
        {/* ======================================================== */}
        <nav aria-label="Main worksheet navigation" className="hidden xl:flex shrink-0 items-center">
          {navItems.map((item, index) => {
            const isActive = activeTab === item.id;
            return (
              <React.Fragment key={item.id}>
                {index > 0 && (
                  <div className="h-8 w-px bg-slate-300/60 mx-1 sm:mx-1.5 shrink-0" />
                )}
                <button
                  onClick={() => onSelectTab(item.id)}
                  className={`group relative flex flex-col items-center justify-center transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'rounded-xl bg-[#0070ba] text-white px-3.5 py-1.5 sm:px-4 sm:py-2 shadow-sm font-bold min-w-[70px] sm:min-w-[82px]'
                      : 'rounded-xl text-[#0b3259] hover:bg-blue-100/60 hover:text-[#0070ba] px-2.5 py-1.5 sm:px-3 sm:py-2 font-medium min-w-[64px] sm:min-w-[78px]'
                  }`}
                >
                  <div
                    className={`transition-transform duration-150 group-hover:scale-105 ${
                      isActive ? 'text-white' : 'text-[#0c3660] group-hover:text-[#0070ba]'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <span
                    className={`mt-1 text-[11px] sm:text-xs text-center whitespace-nowrap ${
                      isActive ? 'text-white font-bold' : 'text-[#0c3660] group-hover:text-[#0070ba]'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              </React.Fragment>
            );
          })}

          {/* Tech Specs Tab */}
          <div className="h-8 w-px bg-slate-300/60 mx-1 sm:mx-1.5 shrink-0" />
          <button
            onClick={() => onSelectTab('tech_specs')}
            title="Technical Specifications & Automated Test Suite"
            className={`flex flex-col items-center justify-center rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 transition-all cursor-pointer ${
              activeTab === 'tech_specs'
                ? 'bg-emerald-600 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 font-medium'
            }`}
          >
            <FileCode2 className="h-5 w-5 text-emerald-600" />
            <span className="mt-1 text-[11px] sm:text-xs whitespace-nowrap">
              Tech Specs
            </span>
          </button>
        </nav>

        {/* ======================================================== */}
        {/* RIGHT (Desktop): Currency, Month, Year Controls & Backup */}
        {/* ======================================================== */}
        <div className="hidden xl:flex shrink-0 items-center gap-2.5">
          {onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200/90 bg-white/95 hover:bg-white text-[#0c325c] hover:text-blue-700 px-3 py-2 text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
              title="Download complete workbook as Excel (.xlsx) or Structured CSV (.csv)"
            >
              <HardDriveDownload className="h-4 w-4 text-blue-600 transition-transform group-hover:-translate-y-0.5" />
              <span>Backup</span>
              <span className="rounded bg-blue-100 text-blue-800 text-[10px] font-extrabold px-1.5 py-0.2">
                XLSX
              </span>
            </button>
          )}

          <div className="rounded-xl border border-blue-200/90 bg-white/95 px-3 py-1.5 shadow-2xs">
            <div className="flex flex-col gap-1 text-[11px] sm:text-xs font-semibold">
              {/* Currency */}
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="top-currency-select" className="text-slate-600 font-semibold min-w-[55px]">
                  Currency:
                </label>
                <select
                  id="top-currency-select"
                  value={settings.currency}
                  onChange={(e) =>
                    onUpdateSettings({ currency: e.target.value as CurrencyCode })
                  }
                  className="w-28 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
                >
                  {Object.entries(CURRENCIES).map(([code, item]) => (
                    <option key={code} value={code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month */}
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="top-month-select" className="text-slate-600 font-semibold min-w-[55px]">
                  Month:
                </label>
                <select
                  id="top-month-select"
                  value={settings.month}
                  onChange={(e) =>
                    onUpdateSettings({ month: e.target.value })
                  }
                  className="w-28 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="top-year-input" className="text-slate-600 font-semibold min-w-[55px]">
                  Year:
                </label>
                <input
                  id="top-year-input"
                  type="number"
                  value={settings.year}
                  onChange={(e) =>
                    onUpdateSettings({ year: parseInt(e.target.value, 10) || 2026 })
                  }
                  className="w-28 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT (Mobile / Tablet): Active Sheet Badge, Tablet Backup & Hamburger Menu Button */}
        {/* ======================================================== */}
        <div className="flex xl:hidden items-center gap-2" ref={dropdownRef}>
          {/* Active Sheet Badge */}
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white/90 px-2.5 py-1.5 text-xs font-bold text-[#0c325c] shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="capitalize">{currentActiveItem.label}</span>
          </span>

          {/* Quick Tablet Backup Trigger */}
          {onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-blue-200/90 bg-white/95 hover:bg-white text-[#0c325c] hover:text-blue-700 px-2.5 py-1.5 text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              title="Download entire workbook as Excel (.xlsx) or Structured CSV (.csv)"
            >
              <HardDriveDownload className="h-3.5 w-3.5 text-blue-600" />
              <span>Backup</span>
            </button>
          )}

          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            className={`flex items-center justify-center p-2 rounded-xl border transition-all cursor-pointer shadow-2xs ${
              isMobileMenuOpen
                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                : 'border-blue-200 bg-white text-[#0c325c] hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {/* ======================================================== */}
          {/* RIGHT DROP-DOWN HAMBURGER MENU */}
          {/* ======================================================== */}
          {isMobileMenuOpen && (
            <>
              {/* Dimmed backdrop to close dropdown on outside click */}
              <div
                className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs z-40 transition-opacity"
                onClick={() => setIsMobileMenuOpen(false)}
              />

              {/* The Dropdown Menu Panel */}
              <div className="absolute right-3 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-blue-200 bg-white p-4 shadow-2xl z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[85vh] overflow-y-auto">
                {/* Menu Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Worksheet Navigation
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Select a sheet to view
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60">
                    Menu
                  </span>
                </div>

                {/* 1. Worksheet Navigation Buttons */}
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleMobileNavClick(item.id)}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#0070ba] text-white shadow-xs font-bold'
                            : 'text-slate-700 hover:bg-blue-50/80 hover:text-blue-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={isActive ? 'text-white' : 'text-[#0c3660]'}>
                            {item.icon}
                          </div>
                          <span>{item.label}</span>
                        </div>
                        {isActive && <Check className="h-4 w-4 text-white" />}
                      </button>
                    );
                  })}

                  {/* Tech Specs */}
                  <button
                    onClick={() => handleMobileNavClick('tech_specs')}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'tech_specs'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileCode2 className={`h-4 w-4 ${activeTab === 'tech_specs' ? 'text-white' : 'text-emerald-600'}`} />
                      <span>Tech Specs & Test Runner</span>
                    </div>
                    {activeTab === 'tech_specs' && <Check className="h-4 w-4 text-white" />}
                  </button>
                </div>

                {/* 2. Mobile Financial Parameters Controls (Currency, Month, Year) */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Financial Settings
                  </h4>
                  <div className="space-y-2 rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 text-xs">
                    {/* Currency selector */}
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="mobile-currency-select" className="text-slate-600 font-semibold">
                        Currency:
                      </label>
                      <select
                        id="mobile-currency-select"
                        value={settings.currency}
                        onChange={(e) =>
                          onUpdateSettings({ currency: e.target.value as CurrencyCode })
                        }
                        className="w-32 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
                      >
                        {Object.entries(CURRENCIES).map(([code, item]) => (
                          <option key={code} value={code}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Month selector */}
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="mobile-month-select" className="text-slate-600 font-semibold">
                        Month:
                      </label>
                      <select
                        id="mobile-month-select"
                        value={settings.month}
                        onChange={(e) =>
                          onUpdateSettings({ month: e.target.value })
                        }
                        className="w-32 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
                      >
                        {MONTHS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Year input */}
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="mobile-year-input" className="text-slate-600 font-semibold">
                        Year:
                      </label>
                      <input
                        id="mobile-year-input"
                        type="number"
                        value={settings.year}
                        onChange={(e) =>
                          onUpdateSettings({ year: parseInt(e.target.value, 10) || 2026 })
                        }
                        className="w-32 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Offline Backup Trigger for Mobile & Tablet */}
                {onOpenExportModal && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenExportModal();
                      }}
                      className="w-full flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200/80 px-3.5 py-2.5 text-xs font-bold text-blue-900 hover:bg-blue-100/80 transition-colors cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <HardDriveDownload className="h-4 w-4 text-blue-600" />
                        <span>Download Backup</span>
                      </div>
                      <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                        XLSX / CSV
                      </span>
                    </button>
                  </div>
                )}

                {/* 4. Landing Page Jump */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleMobileNavClick('start_here')}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    <Home className="h-3.5 w-3.5 text-blue-600" />
                    <span>View Onboarding Landing Page</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
