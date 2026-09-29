import React, { useState } from 'react';
import { Eye, Download, Home, CalendarDays, Search, X } from 'lucide-react';
import { WorksheetTab, SettingsState, CurrencyCode, IncomeTransaction, ExpenseTransaction } from '../types/budget';
import { CURRENCIES, MONTHS, formatCurrency } from '../utils/formatters';

interface FormulaBarProps {
  selectedCell: {
    reference: string;
    value: string;
    formula?: string;
    isCalculated: boolean;
  };
  highlightInputs: boolean;
  onToggleHighlight: () => void;
  onExportData: () => void;
  activeTab?: WorksheetTab;
  onGoHome?: () => void;
  settings: SettingsState;
  onUpdateSettings: (newSettings: Partial<SettingsState>) => void;
  incomeTransactions?: IncomeTransaction[];
  expenseTransactions?: ExpenseTransaction[];
}

export const FormulaBar: React.FC<FormulaBarProps> = ({
  selectedCell,
  highlightInputs,
  onToggleHighlight,
  onExportData,
  activeTab,
  onGoHome,
  settings,
  onUpdateSettings,
  incomeTransactions = [],
  expenseTransactions = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Search logic across all transactions
  const combinedTransactions = [
    ...incomeTransactions.map(tx => ({ ...tx, type: 'Income' as const })),
    ...expenseTransactions.map(tx => ({ ...tx, type: 'Expense' as const }))
  ];

  const filteredTransactions = searchQuery.trim() === '' 
    ? [] 
    : combinedTransactions.filter(tx => {
        const q = searchQuery.toLowerCase().trim();
        const dateMatch = tx.date.includes(q);
        const catMatch = tx.category.toLowerCase().includes(q);
        const descMatch = (tx.description || '').toLowerCase().includes(q);
        const amountMatch = String(tx.amount).includes(q) || 
                            formatCurrency(tx.amount, settings.currency).toLowerCase().includes(q);
        return dateMatch || catMatch || descMatch || amountMatch;
      });

  return (
    <header className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-100/90 px-3 sm:px-4 py-1.5 text-xs text-slate-700 gap-2">
      {/* Global Transaction Quick Search Bar (Replaces old cell reference/fx fields) */}
      <div className="relative flex flex-1 items-center min-w-[200px] max-w-xl">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400 animate-pulse" />
        </div>
        <input
          type="text"
          placeholder="Quick search transactions by date, category, description, or amount..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-3xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer animate-fade-in"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Floating results container */}
        {searchQuery.trim() !== '' && (
          <div className="absolute top-full mt-2 left-0 w-[320px] sm:w-[420px] max-h-72 bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto z-50 p-2 text-xs divide-y divide-slate-100 animate-in slide-in-from-top-1 duration-100">
            <div className="px-2 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider flex justify-between bg-slate-50 rounded select-none">
              <span>Found {filteredTransactions.length} Match{filteredTransactions.length === 1 ? '' : 'es'}</span>
              <button onClick={() => setSearchQuery('')} className="hover:text-slate-600 uppercase">Clear</button>
            </div>
            {filteredTransactions.length === 0 ? (
              <div className="p-4 text-center text-slate-400 font-semibold select-none">
                No matching transactions found.
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div key={tx.id} className="p-2 hover:bg-slate-50 transition-colors flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-1 rounded-[3px] text-[8px] font-black uppercase ${
                        tx.type === 'Income'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {tx.type}
                      </span>
                      <span className="font-semibold text-slate-800 truncate block">{tx.category}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[200px] sm:max-w-[280px]">{tx.description || 'No description'}</p>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">{tx.date}</span>
                  </div>
                  <div className={`text-right font-bold font-mono text-xs ${
                    tx.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {tx.type === 'Income' ? '+' : '-'}{formatCurrency(tx.amount, settings.currency)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Global Active Period Setup */}
      <div className="hidden md:flex items-center gap-2 lg:gap-3 px-3 py-1 bg-white/70 rounded-md border border-slate-200 shadow-3xs">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Month</span>
          <select
            value={settings.month}
            onChange={(e) => onUpdateSettings({ month: e.target.value })}
            className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden cursor-pointer"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="h-4 w-px bg-slate-300" />

        <div className="flex items-center gap-1">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Year</span>
          <input
            type="number"
            value={settings.year}
            onChange={(e) => onUpdateSettings({ year: Number(e.target.value) })}
            className="w-16 rounded border border-slate-300 bg-white px-1 py-0.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden text-center cursor-pointer"
          />
        </div>

        <div className="h-4 w-px bg-slate-300" />

        <div className="flex items-center gap-1">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Currency</span>
          <select
            value={settings.currency}
            onChange={(e) => onUpdateSettings({ currency: e.target.value as CurrencyCode })}
            className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden cursor-pointer"
          >
            {Object.entries(CURRENCIES).map(([code, item]) => (
              <option key={code} value={code}>
                {item.symbol} ({code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-1 sm:gap-2 py-0.5 shrink-0">
        <button
          onClick={onToggleHighlight}
          className={`flex items-center gap-1 sm:gap-1.5 rounded border px-2 sm:px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
            highlightInputs
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
          title="Visually highlight User Input cells vs Calculated Formula cells"
        >
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">
            {highlightInputs ? 'Inputs Highlighted' : 'Highlight Inputs vs Formulas'}
          </span>
          <span className="sm:hidden">
            {highlightInputs ? 'Inputs' : 'Highlight'}
          </span>
        </button>

        <button
          onClick={onExportData}
          className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2 sm:px-2.5 py-1 text-slate-700 hover:bg-slate-50 font-semibold transition-colors cursor-pointer"
          title="Download complete budget workbook as Excel (.xlsx) or Structured CSV (.csv)"
        >
          <Download className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
