import React, { useState, useRef, useMemo } from 'react';
import {
  CategoryItem,
  CurrencyCode,
  SettingsState,
} from '../../types/budget';
import { CURRENCIES, MONTHS } from '../../utils/formatters';
import {
  ArrowDown,
  ArrowDownAZ,
  ArrowUp,
  ArrowUpAZ,
  ArrowUpDown,
  Check,
  CreditCard,
  Filter,
  FolderPlus,
  HelpCircle,
  Layers,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sliders,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { GoogleSheetsSettingsCard } from '../GoogleSheetsSettingsCard';
import { GoogleSheetConfig, SyncPayload, PulledData } from '../../services/googleSheetsService';

interface SettingsSheetProps {
  settings: SettingsState;
  onUpdateSettings: (newSettings: Partial<SettingsState>) => void;
  incomeCategories: CategoryItem[];
  onUpdateIncomeCategories: (categories: CategoryItem[]) => void;
  expenseCategories: CategoryItem[];
  onUpdateExpenseCategories: (categories: CategoryItem[]) => void;
  paymentMethods: string[];
  onUpdatePaymentMethods: (methods: string[]) => void;
  highlightInputs: boolean;
  onSelectCell: (info: { reference: string; value: string; formula?: string; isCalculated: boolean }) => void;
  onResetSettingsToDefaults?: () => void;
  // Google Sheets DB integration props
  googleSheetsEnabled?: boolean;
  googleUser?: User | null;
  googleToken?: string | null;
  onGoogleAuthSuccess?: (user: User, token: string) => void;
  onGoogleSignOut?: () => void;
  sheetConfig?: GoogleSheetConfig | null;
  onUpdateSheetConfig?: (config: GoogleSheetConfig | null) => void;
  workbookData?: SyncPayload;
  onDataPulled?: (data: PulledData) => void;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  settings,
  onUpdateSettings,
  incomeCategories,
  onUpdateIncomeCategories,
  expenseCategories,
  onUpdateExpenseCategories,
  paymentMethods,
  onUpdatePaymentMethods,
  highlightInputs,
  onSelectCell,
  onResetSettingsToDefaults,
  googleSheetsEnabled = true,
  googleUser = null,
  googleToken = null,
  onGoogleAuthSuccess = () => {},
  onGoogleSignOut = () => {},
  sheetConfig = null,
  onUpdateSheetConfig = () => {},
  workbookData,
  onDataPulled = () => {},
}) => {
  const [newIncomeCat, setNewIncomeCat] = useState('');
  const [newExpenseCat, setNewExpenseCat] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Category sort configuration (custom order vs alphabetical A-Z / Z-A vs active status)
  type SortKey = 'custom' | 'name' | 'active';
  type SortDirection = 'asc' | 'desc';
  interface SortState {
    key: SortKey;
    direction: SortDirection;
  }

  const [incomeSort, setIncomeSort] = useState<SortState>({ key: 'custom', direction: 'asc' });
  const [expenseSort, setExpenseSort] = useState<SortState>({ key: 'custom', direction: 'asc' });

  // Toggle sort helper for category tables
  const handleToggleSort = (
    currentSort: SortState,
    setSort: React.Dispatch<React.SetStateAction<SortState>>,
    targetKey: SortKey
  ) => {
    if (targetKey === 'custom') {
      setSort({
        key: 'custom',
        direction: currentSort.key === 'custom' && currentSort.direction === 'asc' ? 'desc' : 'asc',
      });
    } else if (targetKey === 'name') {
      if (currentSort.key !== 'name') {
        setSort({ key: 'name', direction: 'asc' });
      } else if (currentSort.direction === 'asc') {
        setSort({ key: 'name', direction: 'desc' });
      } else {
        setSort({ key: 'custom', direction: 'asc' });
      }
    } else if (targetKey === 'active') {
      if (currentSort.key !== 'active') {
        setSort({ key: 'active', direction: 'desc' });
      } else if (currentSort.direction === 'desc') {
        setSort({ key: 'active', direction: 'asc' });
      } else {
        setSort({ key: 'custom', direction: 'asc' });
      }
    }
  };

  // Quick order mode cycler (Custom -> A-Z -> Z-A -> Custom)
  const cycleOrderMode = (
    currentSort: SortState,
    setSort: React.Dispatch<React.SetStateAction<SortState>>
  ) => {
    if (currentSort.key === 'custom') {
      setSort({ key: 'name', direction: 'asc' });
    } else if (currentSort.key === 'name' && currentSort.direction === 'asc') {
      setSort({ key: 'name', direction: 'desc' });
    } else {
      setSort({ key: 'custom', direction: 'asc' });
    }
  };

  // Filtered & Sorted Income Categories
  const preparedIncomeCategories = useMemo(() => {
    let list = incomeCategories.map((cat, originalIndex) => ({
      ...cat,
      originalIndex,
    }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((cat) => cat.name.toLowerCase().includes(q));
    }

    if (incomeSort.key === 'name') {
      list.sort((a, b) =>
        incomeSort.direction === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      );
    } else if (incomeSort.key === 'active') {
      list.sort((a, b) =>
        incomeSort.direction === 'asc'
          ? Number(b.isActive) - Number(a.isActive)
          : Number(a.isActive) - Number(b.isActive)
      );
    } else if (incomeSort.key === 'custom' && incomeSort.direction === 'desc') {
      list.reverse();
    }

    return list;
  }, [incomeCategories, searchQuery, incomeSort]);

  // Filtered & Sorted Expense Categories
  const preparedExpenseCategories = useMemo(() => {
    let list = expenseCategories.map((cat, originalIndex) => ({
      ...cat,
      originalIndex,
    }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((cat) => cat.name.toLowerCase().includes(q));
    }

    if (expenseSort.key === 'name') {
      list.sort((a, b) =>
        expenseSort.direction === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      );
    } else if (expenseSort.key === 'active') {
      list.sort((a, b) =>
        expenseSort.direction === 'asc'
          ? Number(b.isActive) - Number(a.isActive)
          : Number(a.isActive) - Number(b.isActive)
      );
    } else if (expenseSort.key === 'custom' && expenseSort.direction === 'desc') {
      list.reverse();
    }

    return list;
  }, [expenseCategories, searchQuery, expenseSort]);

  // Filtered Payment Methods
  const filteredPaymentMethods = useMemo(() => {
    if (!searchQuery.trim()) return paymentMethods;
    const q = searchQuery.toLowerCase().trim();
    return paymentMethods.filter((m) => m.toLowerCase().includes(q));
  }, [paymentMethods, searchQuery]);

  // General settings match check for search indicators
  const isGeneralMatched = useMemo(() => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    const searchTargets = [
      settings.currency.toLowerCase(),
      CURRENCIES[settings.currency as CurrencyCode]?.label.toLowerCase() || '',
      settings.month.toLowerCase(),
      String(settings.year),
      settings.dateFormat.toLowerCase(),
      'currency',
      'date',
      'month',
      'year',
    ];
    return searchTargets.some((target) => target.includes(q));
  }, [searchQuery, settings]);

  const triggerSaveNotice = (msg: string) => {
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    setSaveNotice(msg);
    noticeTimeoutRef.current = setTimeout(() => {
      setSaveNotice(null);
    }, 2500);
  };

  const handleUpdateSettingField = (partial: Partial<SettingsState>, label: string) => {
    onUpdateSettings(partial);
    triggerSaveNotice(`${label} updated & saved to local storage`);
  };

  const handleAddIncomeCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncomeCat.trim()) return;
    const item: CategoryItem = {
      id: `inc_${Date.now()}`,
      name: newIncomeCat.trim(),
      isActive: true,
      color: '#0284c7',
    };
    onUpdateIncomeCategories([...incomeCategories, item]);
    setNewIncomeCat('');
    triggerSaveNotice(`Added income category "${item.name}"`);
  };

  const handleToggleIncomeCat = (id: string) => {
    const target = incomeCategories.find((c) => c.id === id);
    onUpdateIncomeCategories(
      incomeCategories.map((c) =>
        c.id === id ? { ...c, isActive: !c.isActive } : c
      )
    );
    if (target) {
      triggerSaveNotice(`${target.name} set to ${target.isActive ? 'Inactive' : 'Active'}`);
    }
  };

  const handleDeleteIncomeCat = (id: string) => {
    if (incomeCategories.length <= 1) return;
    const target = incomeCategories.find((c) => c.id === id);
    onUpdateIncomeCategories(incomeCategories.filter((c) => c.id !== id));
    if (target) {
      triggerSaveNotice(`Deleted income category "${target.name}"`);
    }
  };

  const handleAddExpenseCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseCat.trim()) return;
    const item: CategoryItem = {
      id: `exp_${Date.now()}`,
      name: newExpenseCat.trim(),
      isActive: true,
      color: '#3b82f6',
    };
    onUpdateExpenseCategories([...expenseCategories, item]);
    setNewExpenseCat('');
    triggerSaveNotice(`Added expense category "${item.name}"`);
  };

  const handleToggleExpenseCat = (id: string) => {
    const target = expenseCategories.find((c) => c.id === id);
    onUpdateExpenseCategories(
      expenseCategories.map((c) =>
        c.id === id ? { ...c, isActive: !c.isActive } : c
      )
    );
    if (target) {
      triggerSaveNotice(`${target.name} set to ${target.isActive ? 'Inactive' : 'Active'}`);
    }
  };

  const handleDeleteExpenseCat = (id: string) => {
    if (expenseCategories.length <= 1) return;
    const target = expenseCategories.find((c) => c.id === id);
    onUpdateExpenseCategories(expenseCategories.filter((c) => c.id !== id));
    if (target) {
      triggerSaveNotice(`Deleted expense category "${target.name}"`);
    }
  };

  const handleAddPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentMethod.trim()) return;
    if (!paymentMethods.includes(newPaymentMethod.trim())) {
      onUpdatePaymentMethods([...paymentMethods, newPaymentMethod.trim()]);
      triggerSaveNotice(`Added payment method "${newPaymentMethod.trim()}"`);
    }
    setNewPaymentMethod('');
  };

  const handleDeletePaymentMethod = (method: string) => {
    if (paymentMethods.length <= 1) return;
    onUpdatePaymentMethods(paymentMethods.filter((m) => m !== method));
    triggerSaveNotice(`Deleted payment method "${method}"`);
  };

  const inputCellClass = highlightInputs
    ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300/40'
    : 'bg-white border-slate-300';

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6 p-3 sm:p-5 lg:p-8">
      {/* Toast Notification */}
      {saveNotice && (
        <div className="fixed bottom-14 right-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900/95 px-4 py-2.5 text-xs font-bold text-white shadow-2xl backdrop-blur-xs animate-in fade-in slide-in-from-bottom-2 duration-150 border border-slate-700 max-w-[90vw]">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="truncate">{saveNotice}</span>
        </div>
      )}

      {/* Title & Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-slate-900">
              2. Settings & Category Configuration
            </h2>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] sm:text-xs font-semibold text-slate-600">
              tbl_Settings
            </span>
          </div>
          <p className="text-xs text-slate-500 sm:text-sm mt-0.5">
            Configure global currency, active tracking period, and manage custom categories for Income, Expenses, and Payment Methods.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
          {/* Persistence Status Badge */}
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-200 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Persistent Auto-Save Active</span>
          </div>

          {onResetSettingsToDefaults && (
            <button
              onClick={() => {
                if (window.confirm('Reset all categories, currency, and settings to their default template values?')) {
                  onResetSettingsToDefaults();
                  triggerSaveNotice('Settings reset to template defaults');
                }
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors shadow-2xs cursor-pointer"
              title="Reset settings to original template defaults"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              <span>Reset Defaults</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Search & Mobile Navigation Jump Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input Field */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories & settings (e.g., Salary, Food, USD, Card)..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50/80 pl-9 pr-9 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:bg-white focus:outline-hidden transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search filter"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Navigation Jump Anchors for Mobile & Tablets */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto text-[11px] pb-0.5 sm:pb-0">
            <span className="text-slate-400 font-medium hidden lg:inline mr-1">Jump to:</span>
            <a
              href="#section-general"
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-semibold transition-colors ${
                isGeneralMatched && searchQuery.trim()
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Sliders className="h-3 w-3 text-blue-600" />
              <span>General</span>
              {isGeneralMatched && searchQuery.trim() && (
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              )}
            </a>
            <a
              href="#section-payments"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 text-slate-700 font-semibold transition-colors"
            >
              <CreditCard className="h-3 w-3 text-emerald-600" />
              <span>Payments ({filteredPaymentMethods.length})</span>
            </a>
            <a
              href="#section-income"
              className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50/70 hover:bg-teal-100/70 px-2.5 py-1 text-teal-800 font-semibold transition-colors"
            >
              <Wallet className="h-3 w-3 text-teal-600" />
              <span>Income ({preparedIncomeCategories.length})</span>
            </a>
            <a
              href="#section-expenses"
              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 px-2.5 py-1 text-blue-800 font-semibold transition-colors"
            >
              <Layers className="h-3 w-3 text-blue-600" />
              <span>Expenses ({preparedExpenseCategories.length})</span>
            </a>
          </div>
        </div>

        {/* Active Search Summary Pill */}
        {searchQuery.trim() && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Filter className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>
                Filtering by <strong>"{searchQuery}"</strong>:
              </span>
              <span className="font-semibold text-slate-800">
                {preparedIncomeCategories.length} income, {preparedExpenseCategories.length} expenses, {filteredPaymentMethods.length} payment methods
                {isGeneralMatched ? ', general settings match' : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              Reset filter
            </button>
          </div>
        )}
      </div>

      {/* Google Sheets & Google Drive Live Database Setup */}
      {workbookData && googleSheetsEnabled && (
        <GoogleSheetsSettingsCard
          googleUser={googleUser}
          googleToken={googleToken}
          onGoogleAuthSuccess={onGoogleAuthSuccess}
          onGoogleSignOut={onGoogleSignOut}
          sheetConfig={sheetConfig}
          onUpdateSheetConfig={onUpdateSheetConfig}
          workbookData={workbookData}
          onDataPulled={onDataPulled}
        />
      )}
      {workbookData && !googleSheetsEnabled && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-sm font-semibold text-slate-900">Google Sheets sync is not enabled for this account.</p>
          <p className="mt-1 text-xs text-slate-500">Your local workbook remains available. Upgrade your toolkit plan to enable Google Sheets integration.</p>
        </div>
      )}

      {/* Grid: General Settings (Left) + Payment Methods (Right) */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        {/* General Settings Card */}
        <div
          id="section-general"
          className={`rounded-xl border bg-white p-4 sm:p-5 shadow-xs lg:col-span-7 transition-all ${
            isGeneralMatched && searchQuery.trim()
              ? 'border-blue-400 ring-2 ring-blue-300/40'
              : 'border-slate-200'
          }`}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-600 shrink-0" />
              <h3 className="text-sm font-bold text-slate-800">General Settings</h3>
              {isGeneralMatched && searchQuery.trim() && (
                <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                  Search match
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-slate-400">Settings!B4:C8</span>
              <button
                type="button"
                onClick={() => triggerSaveNotice('All settings confirmed & saved to local storage')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                title="Save current settings to persistent storage"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save Settings</span>
              </button>
            </div>
          </div>

          <div className="grid gap-3.5 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            {/* Currency */}
            <div
              onClick={() =>
                onSelectCell({
                  reference: 'tbl_Settings[Currency]',
                  value: settings.currency,
                  isCalculated: false,
                })
              }
              className="space-y-1.5"
            >
              <label htmlFor="settings-currency" className="text-xs font-semibold text-slate-700">
                Primary Currency
              </label>
              <select
                id="settings-currency"
                value={settings.currency}
                onChange={(e) =>
                  handleUpdateSettingField(
                    { currency: e.target.value as CurrencyCode },
                    `Currency (${e.target.value})`
                  )
                }
                className={`w-full rounded-lg border px-3 py-2.5 sm:py-2 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden ${inputCellClass}`}
              >
                {Object.entries(CURRENCIES).map(([code, item]) => (
                  <option key={code} value={code}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">
                Applied to all tables, KPI cards, and charts
              </p>
            </div>

            {/* Secondary Currency (KPI Cards Converted Display) */}
            <div className="space-y-1.5 p-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 sm:col-span-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="settings-enable-secondary"
                  checked={settings.enableSecondaryCurrency || false}
                  onChange={(e) =>
                    handleUpdateSettingField(
                      { enableSecondaryCurrency: e.target.checked },
                      `Secondary currency conversion (${e.target.checked ? 'Enabled' : 'Disabled'})`
                    )
                  }
                  className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="settings-enable-secondary" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  Display converted secondary currency in Dashboard KPI cards
                </label>
              </div>

              {settings.enableSecondaryCurrency && (
                <div className="mt-2.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <label htmlFor="settings-secondary-currency" className="text-xs font-semibold text-slate-600 block">
                    Select Secondary Currency
                  </label>
                  <select
                    id="settings-secondary-currency"
                    value={settings.secondaryCurrency || 'EUR'}
                    onChange={(e) =>
                      handleUpdateSettingField(
                        { secondaryCurrency: e.target.value as CurrencyCode },
                        `Secondary Currency (${e.target.value})`
                      )
                    }
                    className={`w-full sm:w-64 rounded-lg border px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden ${inputCellClass}`}
                  >
                    {Object.entries(CURRENCIES).map(([code, item]) => (
                      <option key={code} value={code}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">
                    When active, your KPI cards on the dashboard will displayconverted values in this secondary currency right below the main totals.
                  </p>
                </div>
              )}
            </div>

            {/* Date Format */}
            <div
              onClick={() =>
                onSelectCell({
                  reference: 'tbl_Settings[DateFormat]',
                  value: settings.dateFormat,
                  isCalculated: false,
                })
              }
              className="space-y-1.5"
            >
              <label htmlFor="settings-date-format" className="text-xs font-semibold text-slate-700">
                Date Display Format
              </label>
              <select
                id="settings-date-format"
                value={settings.dateFormat}
                onChange={(e) =>
                  handleUpdateSettingField(
                    {
                      dateFormat: e.target.value as 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD',
                    },
                    `Date format (${e.target.value})`
                  )
                }
                className={`w-full rounded-lg border px-3 py-2.5 sm:py-2 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden ${inputCellClass}`}
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 01/15/2026)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 15/01/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-01-15)</option>
              </select>
              <p className="text-[10px] text-slate-400">Standard spreadsheet date parsing</p>
            </div>

            {/* Start / Active Month */}
            <div
              onClick={() =>
                onSelectCell({
                  reference: 'tbl_Settings[Month]',
                  value: settings.month,
                  isCalculated: false,
                })
              }
              className="space-y-1.5"
            >
              <label htmlFor="settings-active-month" className="text-xs font-semibold text-slate-700">
                Active Month
              </label>
              <select
                id="settings-active-month"
                value={settings.month}
                onChange={(e) =>
                  handleUpdateSettingField(
                    { month: e.target.value },
                    `Active month (${e.target.value})`
                  )
                }
                className={`w-full rounded-lg border px-3 py-2.5 sm:py-2 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden ${inputCellClass}`}
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">Controls Monthly Budget and Dashboard views</p>
            </div>

            {/* Start / Active Year */}
            <div
              onClick={() =>
                onSelectCell({
                  reference: 'tbl_Settings[Year]',
                  value: String(settings.year),
                  isCalculated: false,
                })
              }
              className="space-y-1.5"
            >
              <label htmlFor="settings-active-year" className="text-xs font-semibold text-slate-700">
                Active Year
              </label>
              <select
                id="settings-active-year"
                value={settings.year}
                onChange={(e) =>
                  handleUpdateSettingField(
                    { year: parseInt(e.target.value, 10) || 2026 },
                    `Active year (${e.target.value})`
                  )
                }
                className={`w-full rounded-lg border px-3 py-2.5 sm:py-2 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden ${inputCellClass}`}
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">Controls annual projection datasets</p>
            </div>
          </div>
        </div>

        {/* Payment Methods Card */}
        <div
          id="section-payments"
          className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs lg:col-span-5"
        >
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600 shrink-0" />
              <h3 className="text-sm font-bold text-slate-800">Payment Methods</h3>
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              tbl_PaymentMethods • {filteredPaymentMethods.length} of {paymentMethods.length}
            </span>
          </div>

          <form onSubmit={handleAddPaymentMethod} className="mb-3 flex gap-2">
            <input
              type="text"
              placeholder="Add payment method..."
              value={newPaymentMethod}
              onChange={(e) => setNewPaymentMethod(e.target.value)}
              className={`flex-1 rounded-lg border px-3 py-2 sm:py-1.5 text-xs shadow-2xs focus:border-emerald-500 focus:outline-hidden ${inputCellClass}`}
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 sm:py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-48 overflow-y-auto p-0.5">
            {filteredPaymentMethods.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No payment methods match "{searchQuery}"
              </p>
            ) : (
              filteredPaymentMethods.map((method) => (
                <span
                  key={method}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs"
                >
                  <span>{method}</span>
                  {paymentMethods.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeletePaymentMethod(method)}
                      className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer text-sm font-bold"
                      title="Remove method"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Grid: Income Categories & Expense Categories Tables */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Income Categories (tbl_IncomeCategories) */}
        <div id="section-income" className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-3 sm:p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700 shrink-0">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Income Categories</h3>
                  <button
                    type="button"
                    onClick={() => cycleOrderMode(incomeSort, setIncomeSort)}
                    className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer"
                    title="Toggle ordering mode (Custom -> A-Z -> Z-A)"
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    <span>
                      {incomeSort.key === 'custom'
                        ? incomeSort.direction === 'asc'
                          ? 'Custom Order'
                          : 'Custom (Rev)'
                        : incomeSort.direction === 'asc'
                        ? 'A → Z'
                        : 'Z → A'}
                    </span>
                  </button>
                </div>
                <span className="font-mono text-[10px] text-slate-500">
                  tbl_IncomeCategories • {preparedIncomeCategories.length} of {incomeCategories.length} items
                </span>
              </div>
            </div>

            <form onSubmit={handleAddIncomeCat} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="New Category Name..."
                value={newIncomeCat}
                onChange={(e) => setNewIncomeCat(e.target.value)}
                className={`flex-1 sm:w-48 rounded-lg border px-3 py-1.5 text-xs shadow-2xs focus:border-teal-500 focus:outline-hidden ${inputCellClass}`}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-teal-700 shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full min-w-[320px] sm:min-w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th
                    onClick={() => handleToggleSort(incomeSort, setIncomeSort, 'custom')}
                    className="px-3 py-2 w-16 text-center cursor-pointer select-none hover:bg-slate-200 transition-colors"
                    title="Click to toggle custom ordering"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>#</span>
                      {incomeSort.key === 'custom' ? (
                        <span className="text-[10px] text-teal-700 font-bold">
                          {incomeSort.direction === 'asc' ? '1-9' : '9-1'}
                        </span>
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleSort(incomeSort, setIncomeSort, 'name')}
                    className="px-3 sm:px-4 py-2 cursor-pointer select-none hover:bg-slate-200 transition-colors"
                    title="Click to toggle alphabetical ordering (A-Z, Z-A, or Custom)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Category Name</span>
                      {incomeSort.key === 'name' ? (
                        <span className="inline-flex items-center gap-0.5 rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">
                          {incomeSort.direction === 'asc' ? (
                            <>
                              <ArrowDownAZ className="h-3 w-3" />
                              <span>A-Z</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpAZ className="h-3 w-3" />
                              <span>Z-A</span>
                            </>
                          )}
                        </span>
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleSort(incomeSort, setIncomeSort, 'active')}
                    className="px-3 py-2 w-20 text-center cursor-pointer select-none hover:bg-slate-200 transition-colors"
                    title="Click to sort by Active / Inactive status"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Active</span>
                      {incomeSort.key === 'active' ? (
                        <span className="text-[10px] text-teal-700 font-bold">
                          {incomeSort.direction === 'desc' ? '✓' : '✗'}
                        </span>
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-2 w-16 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preparedIncomeCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-slate-500">
                      No income categories matching "{searchQuery}"
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="ml-2 font-semibold text-teal-600 underline hover:text-teal-800 cursor-pointer"
                      >
                        Clear search
                      </button>
                    </td>
                  </tr>
                ) : (
                  preparedIncomeCategories.map((cat, idx) => (
                    <tr
                      key={cat.id}
                      onClick={() =>
                        onSelectCell({
                          reference: `tbl_IncomeCategories[Category Name][${cat.originalIndex + 1}]`,
                          value: cat.name,
                          isCalculated: false,
                        })
                      }
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2.5 text-center font-mono text-slate-400">
                        {incomeSort.key === 'custom' && incomeSort.direction === 'asc'
                          ? cat.originalIndex + 1
                          : idx + 1}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color || '#0d9488' }}
                          />
                          <span className="truncate max-w-[140px] sm:max-w-none">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={cat.isActive}
                          onChange={() => handleToggleIncomeCat(cat.id)}
                          className="h-4 w-4 rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteIncomeCat(cat.id);
                          }}
                          disabled={incomeCategories.length <= 1}
                          className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                          title="Delete category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense Categories (tbl_ExpenseCategories) */}
        <div id="section-expenses" className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-3 sm:p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Expense Categories</h3>
                  <button
                    type="button"
                    onClick={() => cycleOrderMode(expenseSort, setExpenseSort)}
                    className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
                    title="Toggle ordering mode (Custom -> A-Z -> Z-A)"
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    <span>
                      {expenseSort.key === 'custom'
                        ? expenseSort.direction === 'asc'
                          ? 'Custom Order'
                          : 'Custom (Rev)'
                        : expenseSort.direction === 'asc'
                        ? 'A → Z'
                        : 'Z → A'}
                    </span>
                  </button>
                </div>
                <span className="font-mono text-[10px] text-slate-500">
                  tbl_ExpenseCategories • {preparedExpenseCategories.length} of {expenseCategories.length} items
                </span>
              </div>
            </div>

            <form onSubmit={handleAddExpenseCat} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="New Category Name..."
                value={newExpenseCat}
                onChange={(e) => setNewExpenseCat(e.target.value)}
                className={`flex-1 sm:w-48 rounded-lg border px-3 py-1.5 text-xs shadow-2xs focus:border-blue-500 focus:outline-hidden ${inputCellClass}`}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          <div className="max-h-[460px] overflow-y-auto overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full min-w-[320px] sm:min-w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-slate-200 bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th
                    onClick={() => handleToggleSort(expenseSort, setExpenseSort, 'custom')}
                    className="px-3 py-2 w-16 text-center cursor-pointer select-none hover:bg-slate-200 transition-colors"
                    title="Click to toggle custom ordering"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>#</span>
                      {expenseSort.key === 'custom' ? (
                        <span className="text-[10px] text-blue-700 font-bold">
                          {expenseSort.direction === 'asc' ? '1-9' : '9-1'}
                        </span>
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleSort(expenseSort, setExpenseSort, 'name')}
                    className="px-3 sm:px-4 py-2 cursor-pointer select-none hover:bg-slate-200 transition-colors"
                    title="Click to toggle alphabetical ordering (A-Z, Z-A, or Custom)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Category Name</span>
                      {expenseSort.key === 'name' ? (
                        <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                          {expenseSort.direction === 'asc' ? (
                            <>
                              <ArrowDownAZ className="h-3 w-3" />
                              <span>A-Z</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpAZ className="h-3 w-3" />
                              <span>Z-A</span>
                            </>
                          )}
                        </span>
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleSort(expenseSort, setExpenseSort, 'active')}
                    className="px-3 py-2 w-20 text-center cursor-pointer select-none hover:bg-slate-200 transition-colors"
                    title="Click to sort by Active / Inactive status"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Active</span>
                      {expenseSort.key === 'active' ? (
                        <span className="text-[10px] text-blue-700 font-bold">
                          {expenseSort.direction === 'desc' ? '✓' : '✗'}
                        </span>
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-2 w-16 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preparedExpenseCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-slate-500">
                      No expense categories matching "{searchQuery}"
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="ml-2 font-semibold text-blue-600 underline hover:text-blue-800 cursor-pointer"
                      >
                        Clear search
                      </button>
                    </td>
                  </tr>
                ) : (
                  preparedExpenseCategories.map((cat, idx) => (
                    <tr
                      key={cat.id}
                      onClick={() =>
                        onSelectCell({
                          reference: `tbl_ExpenseCategories[Category Name][${cat.originalIndex + 1}]`,
                          value: cat.name,
                          isCalculated: false,
                        })
                      }
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2.5 text-center font-mono text-slate-400">
                        {expenseSort.key === 'custom' && expenseSort.direction === 'asc'
                          ? cat.originalIndex + 1
                          : idx + 1}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color || '#3b82f6' }}
                          />
                          <span className="truncate max-w-[140px] sm:max-w-none">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={cat.isActive}
                          onChange={() => handleToggleExpenseCat(cat.id)}
                          className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteExpenseCat(cat.id);
                          }}
                          disabled={expenseCategories.length <= 1}
                          className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                          title="Delete category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
