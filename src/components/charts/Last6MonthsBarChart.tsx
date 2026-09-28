import React, { useState, useMemo } from 'react';
import { MonthSummary, CurrencyCode, SettingsState } from '../../types/budget';
import { formatCurrency } from '../../utils/formatters';
import { BarChart3, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';

interface Last6MonthsBarChartProps {
  data: MonthSummary[];
  currency: CurrencyCode;
  settings: SettingsState;
}

export const Last6MonthsBarChart: React.FC<Last6MonthsBarChartProps> = ({
  data,
  currency,
  settings,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // 1. Resolve current active month index and slice the last 6 months
  const last6MonthsData = useMemo(() => {
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const activeMonthLower = (settings.month || 'January').toLowerCase();
    const currentIdx = monthNames.findIndex((m) => m === activeMonthLower);
    const activeIdx = currentIdx >= 0 ? currentIdx : 11; // fallback to Dec

    // Take 6 months ending in activeIdx (with wrap around if activeIdx < 5)
    const result: MonthSummary[] = [];
    for (let i = 5; i >= 0; i--) {
      const idx = (activeIdx - i + 12) % 12;
      if (data[idx]) {
        result.push(data[idx]);
      }
    }
    return result;
  }, [data, settings.month]);

  // Max value in dataset for axis height calculations
  const maxVal = useMemo(() => {
    const vals = last6MonthsData.flatMap((d) => [d.income, d.expenses]);
    return Math.max(...vals, 4000) * 1.15; // 15% head room
  }, [last6MonthsData]);

  // Chart layout specs
  const svgWidth = 520;
  const svgHeight = 220;
  const topPad = 30;
  const bottomPad = 30;
  const leftPad = 50;
  const rightPad = 15;
  const chartHeight = svgHeight - topPad - bottomPad;
  const chartWidth = svgWidth - leftPad - rightPad;

  // 6 columns
  const numMonths = last6MonthsData.length;
  const colWidth = chartWidth / (numMonths || 6);

  // Format summaries
  const totalPeriodIncome = last6MonthsData.reduce((sum, d) => sum + d.income, 0);
  const totalPeriodExpenses = last6MonthsData.reduce((sum, d) => sum + d.expenses, 0);
  const periodSavings = totalPeriodIncome - totalPeriodExpenses;
  const periodSavingsRate = totalPeriodIncome > 0 ? (periodSavings / totalPeriodIncome) * 100 : 0;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
      {/* Chart Title / Headers */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 mb-3">
        <div className="space-y-0.5">
          <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            <span>6-Month Comparison: Income vs. Expenses</span>
          </h4>
          <p className="text-[11px] font-medium text-slate-500">
            Historical health analyzer ending in {settings.month}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-[#10b981]" />
            <span className="text-slate-600 font-semibold">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-[#ef4444]" />
            <span className="text-slate-600 font-semibold">Expenses</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto py-1">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[460px] h-52 overflow-visible"
        >
          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = topPad + chartHeight * (1 - pct);
            const val = maxVal * pct;
            return (
              <g key={i}>
                <line
                  x1={leftPad}
                  y1={y}
                  x2={svgWidth - rightPad}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />
                <text
                  x={leftPad - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {formatCurrency(val, currency, 0)}
                </text>
              </g>
            );
          })}

          {/* Grouped Bars */}
          {last6MonthsData.map((d, i) => {
            const xGroup = leftPad + i * colWidth;
            const paddingBetweenGroups = colWidth * 0.25;
            const availableBarSpace = colWidth - paddingBetweenGroups;
            const barWidth = availableBarSpace / 2;

            // Bar heights
            const incH = (d.income / maxVal) * chartHeight;
            const expH = (d.expenses / maxVal) * chartHeight;

            const isHovered = hoveredIdx === i;

            return (
              <g
                key={d.month}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer transition-all"
              >
                {/* Background Group Highlight */}
                {isHovered && (
                  <rect
                    x={xGroup + paddingBetweenGroups / 4}
                    y={topPad - 5}
                    width={availableBarSpace + paddingBetweenGroups / 2}
                    height={chartHeight + 10}
                    fill="#f8fafc"
                    rx={6}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Income Bar (Emerald) */}
                <rect
                  x={xGroup + paddingBetweenGroups / 2}
                  y={topPad + chartHeight - incH}
                  width={barWidth - 2}
                  height={Math.max(incH, 1)}
                  rx={3}
                  fill={isHovered ? '#059669' : '#10b981'}
                  className="transition-all"
                />

                {/* Expenses Bar (Red) */}
                <rect
                  x={xGroup + paddingBetweenGroups / 2 + barWidth}
                  y={topPad + chartHeight - expH}
                  width={barWidth - 2}
                  height={Math.max(expH, 1)}
                  rx={3}
                  fill={isHovered ? '#dc2626' : '#ef4444'}
                  className="transition-all"
                />

                {/* Micro numerical labels shown on hover */}
                {isHovered && (
                  <g>
                    {/* Income value */}
                    <text
                      x={xGroup + paddingBetweenGroups / 2 + barWidth / 2}
                      y={topPad + chartHeight - incH - 5}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-emerald-800 font-mono"
                    >
                      {formatCurrency(d.income, currency, 0)}
                    </text>
                    {/* Expense value */}
                    <text
                      x={xGroup + paddingBetweenGroups / 2 + barWidth * 1.5}
                      y={topPad + chartHeight - expH - 5}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-rose-800 font-mono"
                    >
                      {formatCurrency(d.expenses, currency, 0)}
                    </text>
                  </g>
                )}

                {/* Month label */}
                <text
                  x={xGroup + colWidth / 2}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  className={`text-[11px] font-semibold transition-all ${
                    isHovered ? 'fill-blue-700 font-black' : 'fill-slate-500'
                  }`}
                >
                  {d.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 6-Month Aggregate stats */}
      <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-100">
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">6-Month Net Surplus</span>
          <span className={`font-black flex items-center gap-1 ${periodSavings >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {periodSavings >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <span>{formatCurrency(periodSavings, currency)}</span>
          </span>
        </div>
        <div className="space-y-0.5 border-l border-slate-200 pl-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Avg Savings Rate</span>
          <span className="font-black text-purple-700 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{periodSavingsRate.toFixed(1)}% saved</span>
          </span>
        </div>
      </div>
    </div>
  );
};
