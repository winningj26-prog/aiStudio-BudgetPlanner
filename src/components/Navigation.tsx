import React from 'react';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileCode2,
  Home,
  LayoutDashboard,
  Receipt,
  Settings as SettingsIcon,
  Wallet2,
} from 'lucide-react';
import { WorksheetTab } from '../types/budget';

interface NavigationProps {
  activeTab: WorksheetTab;
  onSelectTab: (tab: WorksheetTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const navItems: { id: WorksheetTab; label: string; number: number; icon: React.ReactNode }[] = [
    { id: 'start_here', label: 'Start Here', number: 1, icon: <Home className="h-4 w-4" /> },
    { id: 'settings', label: 'Settings', number: 2, icon: <SettingsIcon className="h-4 w-4" /> },
    { id: 'income', label: 'Income', number: 3, icon: <Wallet2 className="h-4 w-4" /> },
    { id: 'expenses', label: 'Expenses', number: 4, icon: <Receipt className="h-4 w-4" /> },
    { id: 'monthly_budget', label: 'Monthly Budget', number: 5, icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'dashboard', label: 'Dashboard', number: 6, icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'annual_summary', label: 'Annual Summary', number: 7, icon: <CalendarDays className="h-4 w-4" /> },
  ];

  return (
    <nav aria-label="Worksheet Navigation" className="border-b border-slate-200 bg-slate-900 text-white shadow-inner">
      <div className="mx-auto flex items-center justify-between px-3 sm:px-6 overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-1 py-1.5 min-w-max">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`group relative flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:text-sm ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                  }`}
                >
                  {item.number}
                </span>
                <span className="flex items-center gap-1.5">
                  {item.icon}
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tech Specs & Tests Tab (audit & verification) */}
        <div className="pl-3 py-1.5 min-w-max">
          <button
            onClick={() => onSelectTab('tech_specs')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border ${
              activeTab === 'tech_specs'
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                : 'border-slate-700 bg-slate-800/80 text-emerald-400 hover:bg-slate-700 hover:text-emerald-300'
            }`}
          >
            <FileCode2 className="h-3.5 w-3.5" />
            <span>Tech Specs & Test Runner</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
          </button>
        </div>
      </div>
    </nav>
  );
};
