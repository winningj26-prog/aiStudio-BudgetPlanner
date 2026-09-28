import React, { useState, useMemo } from 'react';
import { ExpenseTransaction, IncomeTransaction, SettingsState, RecurringTransaction } from '../../types/budget';
import { formatCurrency } from '../../utils/formatters';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  ArrowRight,
  Sparkles,
  CalendarDays,
  Clock
} from 'lucide-react';

interface CalendarViewSheetProps {
  incomeTransactions: IncomeTransaction[];
  expenseTransactions: ExpenseTransaction[];
  settings: SettingsState;
  recurringTransactions?: RecurringTransaction[];
  onSelectCell?: (info: { reference: string; value: string; formula?: string; isCalculated: boolean }) => void;
}

export const CalendarViewSheet: React.FC<CalendarViewSheetProps> = ({
  incomeTransactions,
  expenseTransactions,
  settings,
  recurringTransactions = [],
  onSelectCell,
}) => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  const monthIdx = useMemo(() => {
    const idx = monthNames.indexOf(settings.month.toLowerCase());
    return idx === -1 ? 8 : idx; // fallback to September (8)
  }, [settings.month]);

  const year = settings.year;

  // 1. Calculate number of days in this month
  const daysInMonth = useMemo(() => {
    return new Date(year, monthIdx + 1, 0).getDate();
  }, [year, monthIdx]);

  // 2. Calculate the weekday index of the 1st of this month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayIndex = useMemo(() => {
    return new Date(year, monthIdx, 1).getDay();
  }, [year, monthIdx]);

  // 3. Map actual transactions onto date numbers
  const calendarMap = useMemo(() => {
    const map: Record<number, { incomes: IncomeTransaction[]; expenses: ExpenseTransaction[]; recurrings: any[] }> = {};
    for (let i = 1; i <= daysInMonth; i++) {
      map[i] = { incomes: [], expenses: [], recurrings: [] };
    }

    // Map Incomes
    incomeTransactions.forEach((tx) => {
      const dateObj = new Date(tx.date);
      // Ensure transaction year and month match settings
      if (dateObj.getFullYear() === year && dateObj.getMonth() === monthIdx) {
        const d = dateObj.getDate();
        if (map[d]) {
          map[d].incomes.push(tx);
        }
      }
    });

    // Map Expenses
    expenseTransactions.forEach((tx) => {
      const dateObj = new Date(tx.date);
      if (dateObj.getFullYear() === year && dateObj.getMonth() === monthIdx) {
        const d = dateObj.getDate();
        if (map[d]) {
          map[d].expenses.push(tx);
        }
      }
    });

    // Project active monthly recurring transactions on their scheduled days
    recurringTransactions.filter(r => r.isActive).forEach((rec) => {
      // Monthly recurrings map to their specific dayOfMonth
      if (rec.frequency === 'monthly') {
        const d = rec.dayOfMonth;
        if (d >= 1 && d <= daysInMonth && map[d]) {
          map[d].recurrings.push(rec);
        }
      } else if (rec.frequency === 'weekly') {
        // Project weekly recurrings (e.g. assume they trigger on every 7th day for simple visualization)
        for (let d = 1; d <= daysInMonth; d += 7) {
          if (map[d]) {
            map[d].recurrings.push(rec);
          }
        }
      }
    });

    return map;
  }, [incomeTransactions, expenseTransactions, recurringTransactions, year, monthIdx, daysInMonth]);

  // Calendar cells generation array (includes empty padding slots for preceding month)
  const gridCells = useMemo(() => {
    const cells: { day: number | null; key: string }[] = [];
    // Padding for previous month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, key: `pad-${i}` });
    }
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ day: i, key: `day-${i}` });
    }
    return cells;
  }, [firstDayIndex, daysInMonth]);

  // Selected day items list
  const selectedDayData = useMemo(() => {
    if (selectedDay === null) return null;
    return calendarMap[selectedDay] || { incomes: [], expenses: [], recurrings: [] };
  }, [selectedDay, calendarMap]);

  // Total daily sums helper
  const getDaySums = (day: number) => {
    const cell = calendarMap[day];
    if (!cell) return { incomeSum: 0, expenseSum: 0 };
    const incomeSum = cell.incomes.reduce((s, i) => s + i.amount, 0);
    const expenseSum = cell.expenses.reduce((s, e) => s + e.amount, 0);
    return { incomeSum, expenseSum };
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-3 sm:p-6 lg:p-8">
      {/* Header card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#0c325c] flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600 animate-pulse" />
            <span>Interactive Monthly Cashflow Calendar</span>
          </h2>
          <p className="text-xs text-slate-500 leading-normal max-w-xl">
            Visualize cashflow timings. See daily deposits, expense transactions, and scheduled recurring payments mapped across a spreadsheet-style calendar grid.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-100 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Deposits (+ Amount)</span>
          </span>
          <span className="rounded bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 border border-rose-100 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
            <span>Payments (- Amount)</span>
          </span>
          <span className="rounded bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-100 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Recurrings (🔁)</span>
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Calendar Grid card - Responsive layout */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-800 capitalize">
              {settings.month} {settings.year} Grid View
            </h3>
            <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500 border border-slate-200">
              {daysInMonth} Days
            </span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {/* Weekday Titles */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((wd) => (
              <span key={wd} className="text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase py-1 select-none">
                {wd}
              </span>
            ))}

            {/* Calendar Cells */}
            {gridCells.map((cell, idx) => {
              const day = cell.day;
              if (day === null) {
                return (
                  <div
                    key={cell.key}
                    className="aspect-square rounded-xl bg-slate-50/40 border border-transparent select-none"
                  />
                );
              }

              const { incomeSum, expenseSum } = getDaySums(day);
              const hasItems = calendarMap[day].incomes.length > 0 || calendarMap[day].expenses.length > 0 || calendarMap[day].recurrings.length > 0;
              const isToday = selectedDay === day;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => {
                    setSelectedDay(day);
                    if (onSelectCell) {
                      onSelectCell({
                        reference: `Calendar!Day_${day}`,
                        value: `Net Cash: ${formatCurrency(incomeSum - expenseSum, settings.currency)}`,
                        formula: `=CALENDAR_NET_CASH(${day}, ${incomeSum}, ${expenseSum})`,
                        isCalculated: true,
                      });
                    }
                  }}
                  className={`aspect-square rounded-xl border p-1 sm:p-2 flex flex-col justify-between items-stretch transition-all select-none hover:shadow-xs group cursor-pointer text-left relative ${
                    isToday
                      ? 'border-blue-600 bg-blue-50/30 shadow-3xs ring-1 ring-blue-300'
                      : hasItems
                        ? 'border-slate-200 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50/60'
                        : 'border-slate-150 bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] sm:text-xs font-black leading-none ${isToday ? 'text-blue-700' : 'text-slate-600'}`}>
                      {day}
                    </span>

                    {/* Indicator indicators */}
                    <div className="flex items-center gap-0.5">
                      {calendarMap[day].recurrings.length > 0 && (
                        <span className="text-[8px] leading-none" title="Scheduled payment">🔁</span>
                      )}
                      {calendarMap[day].incomes.length > 0 && (
                        <span className="h-1 w-1 rounded-full bg-emerald-500" />
                      )}
                      {calendarMap[day].expenses.length > 0 && (
                        <span className="h-1 w-1 rounded-full bg-rose-500" />
                      )}
                    </div>
                  </div>

                  {/* Micro Daily Net sums inside day cell */}
                  {hasItems && (
                    <div className="text-[7.5px] sm:text-[9px] font-extrabold font-mono text-right leading-none space-y-0.5 truncate select-none mt-1">
                      {incomeSum > 0 && (
                        <span className="text-emerald-600 block">+{formatCurrency(incomeSum, settings.currency, 0)}</span>
                      )}
                      {expenseSum > 0 && (
                        <span className="text-rose-600 block">-{formatCurrency(expenseSum, settings.currency, 0)}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Date Transactions Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <Info className="h-4 w-4 text-blue-600" />
                <span>Daily Ledger details</span>
              </h3>
              {selectedDay !== null && (
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-800 border border-blue-200 uppercase font-mono">
                  {settings.month} {selectedDay}
                </span>
              )}
            </div>

            {selectedDay === null ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Calendar className="h-8 w-8 text-slate-300 mb-2 animate-bounce" />
                <span className="font-bold text-slate-700">Select any Date Cell</span>
                <span className="text-[11px] text-slate-500 mt-0.5 text-center max-w-[200px] leading-normal">
                  Click on any day card in the grid to view detailed daily ledger transactions.
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Daily Total Summaries */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-emerald-50/40 p-2.5 border border-emerald-100/60">
                    <span className="text-[9px] text-emerald-600 font-extrabold uppercase leading-none block">Total Deposits</span>
                    <span className="font-mono text-sm font-black text-emerald-800 mt-1 block">
                      {formatCurrency(getDaySums(selectedDay).incomeSum, settings.currency)}
                    </span>
                  </div>

                  <div className="rounded-lg bg-rose-50/40 p-2.5 border border-rose-100/60">
                    <span className="text-[9px] text-rose-600 font-extrabold uppercase leading-none block">Total Payments</span>
                    <span className="font-mono text-sm font-black text-rose-800 mt-1 block">
                      {formatCurrency(getDaySums(selectedDay).expenseSum, settings.currency)}
                    </span>
                  </div>
                </div>

                {/* Day Ledger Listing */}
                <div className="space-y-3">
                  <h4 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                    Daily Transactions
                  </h4>

                  {selectedDayData && 
                   selectedDayData.incomes.length === 0 && 
                   selectedDayData.expenses.length === 0 && 
                   selectedDayData.recurrings.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-150 rounded-xl bg-slate-50/20">
                      No transactions recorded.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                      {/* Recurrings indicators */}
                      {selectedDayData?.recurrings.map((rec: any, idx: number) => (
                        <div key={`rec-${idx}`} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/20 p-2.5">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-amber-900 flex items-center gap-1 block">
                              <span>🔁 {rec.description}</span>
                            </span>
                            <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block">
                              Scheduled {rec.frequency} Payment
                            </span>
                          </div>
                          <span className="font-mono text-xs font-black text-amber-800 shrink-0">
                            {formatCurrency(rec.amount, settings.currency)}
                          </span>
                        </div>
                      ))}

                      {/* Incomes */}
                      {selectedDayData?.incomes.map((inc) => (
                        <div key={inc.id} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/20 p-2.5">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-emerald-900 block truncate leading-tight">
                              {inc.description}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider block">
                              {inc.category} Category
                            </span>
                          </div>
                          <span className="font-mono text-xs font-black text-emerald-800 shrink-0">
                            +{formatCurrency(inc.amount, settings.currency)}
                          </span>
                        </div>
                      ))}

                      {/* Expenses */}
                      {selectedDayData?.expenses.map((exp) => (
                        <div key={exp.id} className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/20 p-2.5">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-rose-900 block truncate leading-tight">
                              {exp.description}
                            </span>
                            <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block">
                              {exp.category} • {exp.paymentMethod}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-black text-rose-800 shrink-0">
                            -{formatCurrency(exp.amount, settings.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 select-none leading-none">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            <span>Interactive Calendar Ledger</span>
          </div>
        </div>
      </div>
    </div>
  );
};
