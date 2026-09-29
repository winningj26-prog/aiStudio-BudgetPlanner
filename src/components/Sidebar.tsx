import React, { useState } from 'react';
import {
  PieChart,
  Calendar,
  Coins,
  CreditCard,
  BarChart3,
  TrendingDown,
  TrendingUp,
  CalendarDays,
  Settings as SettingsIcon,
  FileCode2,
  Menu,
  X,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SettingsState, WorksheetTab } from '../types/budget';

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
  userEmail = '',
  onLogout,
}) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems: { id: WorksheetTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <PieChart className="h-4.5 w-4.5" /> },
    { id: 'calendar_view', label: 'Calendar View', icon: <Calendar className="h-4.5 w-4.5" /> },
    { id: 'income', label: 'Income', icon: <Coins className="h-4.5 w-4.5" /> },
    { id: 'expenses', label: 'Expenses', icon: <CreditCard className="h-4.5 w-4.5" /> },
    { id: 'monthly_budget', label: 'Monthly Budget', icon: <BarChart3 className="h-4.5 w-4.5" /> },
    { id: 'debt_payoff', label: 'Debt Payoff', icon: <TrendingDown className="h-4.5 w-4.5" /> },
    { id: 'net_worth', label: 'Net Worth', icon: <TrendingUp className="h-4.5 w-4.5" /> },
    { id: 'annual_summary', label: 'Annual Summary', icon: <CalendarDays className="h-4.5 w-4.5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="h-4.5 w-4.5" /> },
    { id: 'tech_specs', label: 'Tech Specs', icon: <FileCode2 className="h-4.5 w-4.5" /> },
  ];

  // Username display derivation
  const displayName = userEmail.includes('@')
    ? userEmail.split('@')[0].replace(/[._]/g, ' ')
    : userEmail;
  const capitalizedName = displayName
    ? displayName
        .split(' ')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    : 'User';

  const handleNavClick = (id: WorksheetTab) => {
    onSelectTab(id);
    setIsOpenMobile(false);
  };

  const SidebarContent = ({ isDesktop = false }: { isDesktop?: boolean }) => {
    const collapsed = isDesktop && isCollapsed;

    return (
      <div className="flex flex-col h-full bg-[#0c1f38] text-[#d1e2f3] select-none">
        {/* 1. Header App Branding & Collapse Toggle */}
        <div className={`p-4 border-b border-[#182f4d] flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Logo */}
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <svg
                viewBox="0 0 56 48"
                className="h-7 w-7 drop-shadow-xs"
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
                <rect x="4" y="14" width="48" height="32" rx="9" fill="#08182b" />
                <circle cx="44" cy="30" r="3" fill="#ffffff" />
                <circle cx="44" cy="30" r="1.5" fill="#08182b" />
              </svg>
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <h1 className="text-xs font-black tracking-tight text-white leading-tight uppercase font-sans">
                  Finance Manager
                </h1>
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono block leading-none mt-0.5">
                  Workbook V2.5
                </span>
              </div>
            )}
          </div>

          {isDesktop && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded bg-[#152e4d] hover:bg-[#1c3a5e] text-[#d1e2f3] hover:text-white transition-all cursor-pointer"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* 2. Primary Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1 scrollbar-none">
          {!collapsed && (
            <span className="text-[9px] font-black text-[#5a7da0] px-3 uppercase tracking-wider block mb-2 select-none">
              Worksheet Ledger
            </span>
          )}

          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center rounded-lg transition-all cursor-pointer ${
                    collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-xs font-bold'
                  } ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-black'
                      : 'text-[#d1e2f3] hover:bg-[#152e4d]/80 hover:text-white'
                  }`}
                >
                  <div className={isActive ? 'text-white' : 'text-[#7da9d6] shrink-0'}>
                    {item.icon}
                  </div>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Home Option */}
          <button
            onClick={() => handleNavClick('start_here')}
            title={collapsed ? 'Return Home' : undefined}
            className={`w-full flex items-center rounded-lg text-[#b5cbdf] hover:bg-[#152e4d]/60 hover:text-white transition-all cursor-pointer mt-4 ${
              collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-xs font-bold'
            }`}
          >
            <span className="text-[#a0bacf] shrink-0 text-sm">🏠</span>
            {!collapsed && <span>Return Home</span>}
          </button>
        </div>

        {/* 3. Bottom User Profile Card */}
        <div className="p-3 border-t border-[#182f4d] bg-[#07172b]">
          <div className={`flex ${collapsed ? 'flex-col items-center gap-3' : 'items-center justify-between gap-2'}`}>
            <div className="min-w-0 flex items-center gap-2">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#152e4d] text-emerald-400 shadow-3xs"
                title={collapsed ? capitalizedName : undefined}
              >
                <User className="h-4.5 w-4.5" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <span className="text-xs font-black text-white block truncate leading-tight">
                    {capitalizedName}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 block truncate">
                    {userEmail}
                  </span>
                </div>
              )}
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                className={`p-1.5 rounded-lg text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors cursor-pointer ${
                  collapsed ? 'mt-1' : ''
                }`}
                title="Logout session"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Persistent Sidebar (Width adapts dynamically based on collapse state) */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 border-r border-[#152e4d] shadow-md z-40 transition-all duration-300 ${
          isCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        <SidebarContent isDesktop={true} />
      </aside>

      {/* Mobile Sticky top navigation bar */}
      <div className="lg:hidden sticky top-0 z-40 w-full bg-[#0c1f38] text-white border-b border-[#152e4d] px-4 py-3 flex items-center justify-between shadow-xs select-none">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsOpenMobile(true)}
            className="p-1.5 rounded bg-[#152e4d] hover:bg-[#1c3a5e] text-slate-200 transition-colors cursor-pointer"
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

          {/* Drawer content (always fully expanded for mobile) */}
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
              <SidebarContent isDesktop={false} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
