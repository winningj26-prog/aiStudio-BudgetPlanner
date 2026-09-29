import React from 'react';
import { Eye, Download, Home, CalendarDays } from 'lucide-react';
import { WorksheetTab, SettingsState, CurrencyCode } from '../types/budget';
import { CURRENCIES, MONTHS } from '../utils/formatters';

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
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-100/90 px-3 sm:px-4 py-1.5 text-xs text-slate-700 gap-2">
      {/* Formula Bar Left: Cell Name Box + fx + Formula */}
      <div className="flex flex-1 min-w-0 items-center gap-2 py-0.5">
        {/* Cell Reference Box */}
        <div className="flex min-w-20 sm:min-w-24 shrink-0 items-center justify-center rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs font-semibold text-slate-800 shadow-2xs">
          {selectedCell.reference || 'A1'}
        </div>

        {/* fx symbol */}
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded font-serif text-sm font-bold italic text-slate-500">
          fx
        </div>

        {/* Formula Input / Display */}
        <div className="flex min-w-0 max-w-xl flex-1 items-center rounded border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs text-slate-800 shadow-2xs truncate">
          {selectedCell.formula ? (
            <span className="font-medium text-blue-700 truncate">{selectedCell.formula}</span>
          ) : (
            <span className="text-slate-600 truncate">
              {selectedCell.value || 'Select a cell to inspect value or formula'}
            </span>
          )}
        </div>

        {/* Cell nature badge */}
        <span
          className="hidden xl:inline-flex shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200"
        >
          {selectedCell.isCalculated ? 'Formula Cell' : 'Input Cell'}
        </span>
      </div>

      {/* Global Active Period Setup (Moved from Sidebar for cleaner workspace) */}
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

      {/* Formula Bar Right: Cell Highlighting toggle & Workbook actions */}
      <div className="flex items-center gap-1 sm:gap-2 py-0.5 shrink-0">
        {/* Toggle Input vs Calculated Highlight */}
        <button
          onClick={onToggleHighlight}
          className={`flex items-center gap-1 sm:gap-1.5 rounded border px-2 sm:px-2.5 py-1 font-medium transition-colors cursor-pointer ${
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

        {/* Export Data */}
        <button
          onClick={onExportData}
          className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2 sm:px-2.5 py-1 text-slate-700 hover:bg-slate-50 font-medium transition-colors cursor-pointer"
          title="Download complete budget workbook as Excel (.xlsx) or Structured CSV (.csv)"
        >
          <Download className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
};
