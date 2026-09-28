import React, { useState, useEffect, useRef } from 'react';
import { SettingsState, WorksheetTab } from '../types/budget';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Home,
  LogOut,
  Plus,
  Settings as SettingsIcon,
  ShieldCheck,
  User,
  PieChart,
  Calendar,
  Sparkles,
  X,
} from 'lucide-react';

interface SpreadsheetFooterProps {
  activeTab: WorksheetTab;
  onSelectTab: (tab: WorksheetTab) => void;
  statusMessage?: string;
  totalStats?: { count: number; sum: string };
  userEmail?: string;
  onLogout?: () => void;
  settings?: SettingsState;
  sheetConfig?: {
    spreadsheetTitle: string;
    spreadsheetUrl: string;
    lastSyncedAt: string | null;
  } | null;
}

export const SpreadsheetFooter: React.FC<SpreadsheetFooterProps> = ({
  activeTab,
  onSelectTab,
  statusMessage = 'Ready',
  totalStats,
  userEmail = 'winningj26@gmail.com',
  onLogout,
  settings,
  sheetConfig,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close popup menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Close popup menu on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    }
    if (isUserMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const tabs: { id: WorksheetTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'calendar_view', label: 'Calendar View' },
    { id: 'income', label: 'Income' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'monthly_budget', label: 'Monthly Budget' },
    { id: 'debt_payoff', label: 'Debt Payoff' },
    { id: 'annual_summary', label: 'Annual Summary' },
    { id: 'settings', label: 'Settings' },
    { id: 'tech_specs', label: 'Tech Specs' },
  ];

  const currentTabIndex = tabs.findIndex((t) => t.id === activeTab);

  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      onSelectTab(tabs[currentTabIndex - 1].id);
    } else if (currentTabIndex === -1) {
      onSelectTab(tabs[0].id);
    }
  };

  const handleNextTab = () => {
    if (currentTabIndex >= 0 && currentTabIndex < tabs.length - 1) {
      onSelectTab(tabs[currentTabIndex + 1].id);
    }
  };

  // Derive display username from email
  const displayName = userEmail.includes('@')
    ? userEmail.split('@')[0].replace(/[._]/g, ' ')
    : userEmail;
  const capitalizedName = displayName
    .split(' ')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

  return (
    <footer className="sticky bottom-0 z-30 border-t border-slate-300 bg-slate-200/95 backdrop-blur-xs px-2 sm:px-4 py-1 text-xs text-slate-700 select-none shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* ======================================================== */}
        {/* LEFT: Tab Navigation Controls (Excel Sheet Tabs) */}
        {/* ======================================================== */}
        <div className="flex min-w-0 flex-1 items-center space-x-1 overflow-x-auto py-0.5 scrollbar-thin">
          {/* Home / Return Home button */}
          <button
            onClick={() => onSelectTab('start_here')}
            className={`flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'start_here'
                ? 'bg-[#0070ba] text-white shadow-2xs'
                : 'border border-blue-300/80 bg-white text-blue-900 hover:bg-blue-50 hover:border-blue-400 shadow-2xs'
            }`}
            title="Return to Home / Start Here Landing Page"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {activeTab === 'start_here' ? 'Home' : 'Return Home'}
            </span>
            <span className="sm:hidden">Home</span>
          </button>

          <div className="h-4 w-px bg-slate-300 mx-0.5 shrink-0" />

          <button
            className="rounded p-1 text-slate-600 hover:bg-slate-300 hover:text-slate-900 cursor-not-allowed shrink-0"
            title="Add Sheet (Locked in Template)"
            disabled
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handlePrevTab}
            disabled={currentTabIndex <= 0}
            className={`rounded p-1 text-slate-600 hover:bg-slate-300 hover:text-slate-900 shrink-0 ${
              currentTabIndex <= 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            }`}
            title="Previous sheet"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleNextTab}
            disabled={currentTabIndex >= tabs.length - 1}
            className={`rounded p-1 text-slate-600 hover:bg-slate-300 hover:text-slate-900 shrink-0 ${
              currentTabIndex >= tabs.length - 1 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            }`}
            title="Next sheet"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-0.5 shrink-0" />

          {/* Individual Worksheet Tabs */}
          <div className="flex items-center space-x-1 shrink-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex shrink-0 items-center space-x-1 px-2.5 sm:px-3 py-1 text-xs font-medium transition-colors cursor-pointer rounded-t-sm border-t-2 ${
                    isActive
                      ? 'border-blue-600 bg-white text-blue-900 font-bold shadow-2xs'
                      : 'border-transparent text-slate-600 hover:bg-slate-300/70 hover:text-slate-900'
                  }`}
                >
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT: Status Bar Metrics + User Profile with Online Indicator */}
        {/* ======================================================== */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Status Message */}
          <div className="hidden md:flex items-center space-x-1.5 text-[11px] text-slate-600 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-sans text-slate-600 truncate max-w-[130px] lg:max-w-none">
              {statusMessage}
            </span>
          </div>

          {/* Cashflow Summary Metrics */}
          {totalStats && (
            <div className="hidden lg:flex items-center space-x-2 border-l border-slate-300 pl-2.5 text-[11px] font-mono">
              <span className="text-slate-500">
                Net: <strong className="text-emerald-700 font-bold">{totalStats.sum}</strong>
              </span>
            </div>
          )}

          {/* ======================================================== */}
          {/* USER ACCOUNT ELEMENT IN THE FOOT WITH AVATAR & ONLINE INDICATOR */}
          {/* ======================================================== */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              aria-label="User profile and account menu"
              aria-haspopup="true"
              aria-expanded={isUserMenuOpen}
              className={`group flex items-center gap-1.5 sm:gap-2 rounded-xl border px-2 py-1 transition-all cursor-pointer shadow-2xs ${
                isUserMenuOpen
                  ? 'border-blue-500 bg-blue-50/90 text-blue-900 ring-2 ring-blue-300/50'
                  : 'border-slate-300/90 bg-white hover:bg-slate-50 text-slate-800 hover:border-slate-400'
              }`}
            >
              {/* User Pic / Avatar with Glowing Online Indicator */}
              <div className="relative flex shrink-0 items-center justify-center">
                {/* Stylized User Pic */}
                <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 text-white shadow-xs ring-1 ring-white">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>

                {/* Online Indicator: Pulsing green dot badge */}
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center"
                  title="User status: Online"
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full border border-white bg-emerald-500" />
                </span>
              </div>

              {/* User Email & Online Tag */}
              <div className="flex flex-col text-left">
                <span className="max-w-[90px] sm:max-w-[130px] lg:max-w-[160px] truncate text-[11px] font-bold text-slate-800 leading-tight">
                  {userEmail}
                </span>
                <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-emerald-600 leading-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Online</span>
                </span>
              </div>

              {/* Upward Chevron Indicator */}
              <ChevronUp
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-hover:text-blue-600 ${
                  isUserMenuOpen ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </button>

            {/* ======================================================== */}
            {/* POPUP MENU OF THE USER (Opens Upward from the Foot) */}
            {/* ======================================================== */}
            {isUserMenuOpen && (
              <>
                {/* Backdrop on mobile */}
                <div
                  className="fixed inset-0 z-40 sm:hidden bg-slate-900/20 backdrop-blur-2xs"
                  onClick={() => setIsUserMenuOpen(false)}
                />

                <div className="absolute bottom-full right-0 mb-2 w-72 sm:w-80 rounded-2xl border border-blue-200 bg-white p-4 shadow-2xl z-50 text-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  {/* Close button */}
                  <button
                    onClick={() => setIsUserMenuOpen(false)}
                    aria-label="Close user menu"
                    className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* User Profile Card Header */}
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5 mb-3">
                    {/* Large User Avatar with Status Beacon */}
                    <div className="relative flex shrink-0 items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#0b3052] via-blue-700 to-sky-500 text-white shadow-md ring-2 ring-blue-100">
                        <User className="h-6 w-6" />
                      </div>
                      <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {capitalizedName}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 truncate" title={userEmail}>
                        {userEmail}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online • Active
                        </span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                          Owner
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Session & Active Period Details */}
                  <div className="space-y-1.5 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 mb-3 border border-slate-100">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Session Status:</span>
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        Authenticated
                      </span>
                    </div>
                    {settings && (
                      <>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Active Period:</span>
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {settings.month} {settings.year}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Active Currency:</span>
                          <span className="font-semibold text-slate-800">
                            {settings.currency}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">Database Engine:</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        {sheetConfig ? (
                          <span className="text-emerald-700 font-bold">Google Sheets</span>
                        ) : (
                          <span className="text-slate-600">Local Storage</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Navigation Shortcuts */}
                  <div className="space-y-1 mb-3">
                    <button
                      onClick={() => {
                        onSelectTab('dashboard');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <PieChart className="h-3.5 w-3.5 text-blue-600" />
                        <span>Financial Dashboard</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans">View</span>
                    </button>

                    <button
                      onClick={() => {
                        onSelectTab('settings');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <SettingsIcon className="h-3.5 w-3.5 text-slate-600" />
                        <span>Account & Budget Settings</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans">Edit</span>
                    </button>

                    <button
                      onClick={() => {
                        onSelectTab('start_here');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Home className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Onboarding / Landing Guide</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans">Open</span>
                    </button>
                  </div>

                  {/* Logout / Sign Out Action */}
                  {onLogout && (
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 hover:bg-rose-100/90 px-3 py-2 text-xs font-bold text-rose-700 transition-colors cursor-pointer shadow-2xs"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out / Switch User</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
