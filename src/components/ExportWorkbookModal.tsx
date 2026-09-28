import React, { useState } from 'react';
import {
  Check,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  FileCode2,
  HardDriveDownload,
  Info,
  Layers,
  Loader2,
  X,
} from 'lucide-react';
import {
  WorkbookExportData,
  downloadBlob,
  generateExcelWorkbook,
  generateStructuredCSV,
} from '../utils/exportWorkbook';
import { formatCurrency } from '../utils/formatters';

interface ExportWorkbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  workbookData: WorkbookExportData;
}

export const ExportWorkbookModal: React.FC<ExportWorkbookModalProps> = ({
  isOpen,
  onClose,
  workbookData,
}) => {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalIncome = workbookData.incomeTransactions.reduce(
    (acc, t) => acc + (t.amount || 0),
    0
  );
  const totalExpenses = workbookData.expenseTransactions.reduce(
    (acc, t) => acc + (t.amount || 0),
    0
  );
  const netSavings = totalIncome - totalExpenses;

  const fileBaseName = `Budget_Planner_${workbookData.settings.month}_${workbookData.settings.year}`;

  const handleExportExcel = async () => {
    try {
      setDownloadingFormat('xlsx');
      // Give UI a moment to show spinner
      await new Promise((resolve) => setTimeout(resolve, 150));
      const blob = generateExcelWorkbook(workbookData);
      downloadBlob(blob, `${fileBaseName}.xlsx`);
      setSuccessNotice(`Successfully downloaded ${fileBaseName}.xlsx!`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Error exporting Excel workbook:', err);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleExportCSV = async () => {
    try {
      setDownloadingFormat('csv');
      await new Promise((resolve) => setTimeout(resolve, 150));
      const blob = generateStructuredCSV(workbookData);
      downloadBlob(blob, `${fileBaseName}_Structured.csv`);
      setSuccessNotice(`Successfully downloaded ${fileBaseName}_Structured.csv!`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Error exporting CSV:', err);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleExportJSON = async () => {
    try {
      setDownloadingFormat('json');
      await new Promise((resolve) => setTimeout(resolve, 150));
      const exportJson = {
        version: '1.0.0',
        workbook: 'Personal Monthly Budget Planner',
        exportDate: new Date().toISOString(),
        ...workbookData,
      };
      const blob = new Blob([JSON.stringify(exportJson, null, 2)], {
        type: 'application/json',
      });
      downloadBlob(blob, `${fileBaseName}.json`);
      setSuccessNotice(`Successfully downloaded ${fileBaseName}.json!`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Error exporting JSON:', err);
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shadow-2xs shrink-0">
              <HardDriveDownload className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Export & Backup Workbook
                </h3>
                <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  Offline
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Download your complete budget workbook for offline backup and spreadsheet analysis
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer transition-colors"
            title="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Success Toast */}
        {successNotice && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-900 animate-in fade-in">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="truncate">{successNotice}</span>
          </div>
        )}

        {/* Workbook Snapshot Card */}
        <div className="mt-4 rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 sm:p-3.5 text-xs text-slate-600">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span>Workbook Snapshot</span>
            <span className="text-blue-700 font-semibold font-mono">
              {workbookData.settings.month} {workbookData.settings.year}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-200/60">
            <div className="rounded-lg bg-white p-2 border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] text-slate-500 block">Total Income</span>
              <strong className="text-emerald-700 font-bold text-xs sm:text-sm">
                {formatCurrency(totalIncome, workbookData.settings.currency)}
              </strong>
            </div>
            <div className="rounded-lg bg-white p-2 border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] text-slate-500 block">Total Expenses</span>
              <strong className="text-rose-700 font-bold text-xs sm:text-sm">
                {formatCurrency(totalExpenses, workbookData.settings.currency)}
              </strong>
            </div>
            <div className="rounded-lg bg-white p-2 border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] text-slate-500 block">Net Surplus</span>
              <strong className={`font-bold text-xs sm:text-sm ${netSavings >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                {formatCurrency(netSavings, workbookData.settings.currency)}
              </strong>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between px-0.5">
            <span>
              Includes {workbookData.incomeTransactions.length} income entries, {workbookData.expenseTransactions.length} expense records.
            </span>
            <span className="font-semibold text-slate-700">6 Worksheets</span>
          </div>
        </div>

        {/* Export Format Options */}
        <div className="mt-4 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-0.5">
            Select Download Format
          </span>

          {/* Option 1: Excel Workbook (.xlsx) */}
          <button
            onClick={handleExportExcel}
            disabled={downloadingFormat !== null}
            className="w-full flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300 p-3.5 text-left transition-all group cursor-pointer disabled:opacity-60 shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shrink-0 shadow-xs">
                {downloadingFormat === 'xlsx' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-950">
                    Microsoft Excel Workbook (.xlsx)
                  </span>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.2">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  Multi-tab workbook with formulas, KPI cards, ledgers, and annual forecasts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-emerald-700 font-bold text-xs shrink-0 pl-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </div>
          </button>

          {/* Option 2: Structured CSV (.csv) */}
          <button
            onClick={handleExportCSV}
            disabled={downloadingFormat !== null}
            className="w-full flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 p-3.5 text-left transition-all group cursor-pointer disabled:opacity-60 shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shrink-0 shadow-xs">
                {downloadingFormat === 'csv' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 group-hover:text-blue-950">
                    Structured CSV File (.csv)
                  </span>
                  <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.2">
                    Universal
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  Formatted comma-delimited data with clearly sectioned tables
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-blue-700 font-bold text-xs shrink-0 pl-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </div>
          </button>

          {/* Option 3: JSON Data Backup */}
          <button
            onClick={handleExportJSON}
            disabled={downloadingFormat !== null}
            className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-3 text-left transition-all group cursor-pointer disabled:opacity-60 shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-bold shrink-0">
                {downloadingFormat === 'json' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileCode2 className="h-4 w-4 text-slate-600" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-800">
                  Full Application Backup (.json)
                </span>
                <p className="text-[11px] text-slate-500 truncate">
                  Complete state snapshot for system restore
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-slate-600 font-medium text-xs shrink-0 pl-2">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </div>
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>Files are generated locally in your browser for 100% privacy.</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
