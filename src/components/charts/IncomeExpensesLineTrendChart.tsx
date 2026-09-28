import React, { useMemo, useState } from 'react';
import { MonthSummary, SettingsState, CurrencyCode } from '../../types/budget';
import { formatCurrency } from '../../utils/formatters';
import { LineChart, ArrowUpRight, TrendingUp, Info } from 'lucide-react';

interface IncomeExpensesLineTrendChartProps {
  data: MonthSummary[];
  currency: CurrencyCode;
  settings: SettingsState;
}

export const IncomeExpensesLineTrendChart: React.FC<IncomeExpensesLineTrendChartProps> = ({
  data,
  currency,
  settings,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Derive chronologically correct sliding window of last 6 months ending in active settings month
  const last6Months = useMemo(() => {
    const activeMonthIdx = data.findIndex(
      (m) => m.fullName.toLowerCase() === settings.month.toLowerCase()
    );
    if (activeMonthIdx === -1) {
      return data.slice(0, 6);
    }
    const result: MonthSummary[] = [];
    for (let i = 5; i >= 0; i--) {
      const idx = (activeMonthIdx - i + 12) % 12;
      result.push(data[idx]);
    }
    return result;
  }, [data, settings.month]);

  // Max value calculation for SVG scaling
  const maxVal = useMemo(() => {
    const allVals = last6Months.flatMap((m) => [m.income, m.expenses]);
    const absoluteMax = Math.max(...allVals, 1000);
    return Math.ceil(absoluteMax / 500) * 500; // round up to nearest 500 for safety buffer
  }, [last6Months]);

  // Dimension setup
  const chartWidth = 500;
  const chartHeight = 220;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const drawableWidth = chartWidth - paddingLeft - paddingRight;
  const drawableHeight = chartHeight - paddingTop - paddingBottom;

  // Node coordinates calculation
  const points = useMemo(() => {
    return last6Months.map((m, idx) => {
      const x = paddingLeft + (idx / 5) * drawableWidth;
      // SVG y increases downwards, so we subtract scaled height from drawableHeight + paddingTop
      const incomeY = paddingTop + drawableHeight - (m.income / maxVal) * drawableHeight;
      const expenseY = paddingTop + drawableHeight - (m.expenses / maxVal) * drawableHeight;
      return { x, incomeY, expenseY, data: m };
    });
  }, [last6Months, maxVal, drawableWidth, drawableHeight]);

  // Generate SVG Polylines
  const incomePath = useMemo(() => {
    return points.map((p) => `${p.x},${p.incomeY}`).join(' ');
  }, [points]);

  const expensePath = useMemo(() => {
    return points.map((p) => `${p.x},${p.expenseY}`).join(' ');
  }, [points]);

  // Calculate 6-month average savings rate
  const avgSavingsRate = useMemo(() => {
    const totalInc = last6Months.reduce((sum, m) => sum + m.income, 0);
    const totalExp = last6Months.reduce((sum, m) => sum + m.expenses, 0);
    const net = totalInc - totalExp;
    return totalInc > 0 ? (net / totalInc) * 100 : 0;
  }, [last6Months]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
            <LineChart className="h-4 w-4 text-emerald-600 animate-pulse" />
            <span>6-Month Cashflow Trend</span>
          </h3>
          <span className="rounded bg-slate-100 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500 border border-slate-200">
            Income vs Expenses
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-normal">
          Chronological analysis showing cash-in deposits (green) versus cash-out expenditures (red) ending in your selected month.
        </p>
      </div>

      {/* SVG Container */}
      <div className="relative mt-3 flex-1 select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto overflow-visible"
        >
          {/* Grids and Axes */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
            const y = paddingTop + p * drawableHeight;
            const gridVal = maxVal * (1 - p);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[8.5px] font-bold font-mono fill-slate-400"
                >
                  {formatCurrency(gridVal, currency, 0)}
                </text>
              </g>
            );
          })}

          {/* Time markers on Bottom X axis */}
          {points.map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={chartHeight - 12}
              textAnchor="middle"
              className="text-[9px] font-black fill-slate-500 font-sans"
            >
              {p.data.month}
            </text>
          ))}

          {/* INCOME PATH DRAW */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={incomePath}
            className="drop-shadow-xs"
          />

          {/* EXPENSE PATH DRAW */}
          <polyline
            fill="none"
            stroke="#f43f5e"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={expensePath}
            className="drop-shadow-xs"
          />

          {/* Points interactivity overlay */}
          {points.map((p, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <g key={idx}>
                {/* Vertical guiding bar */}
                {isHovered && (
                  <line
                    x1={p.x}
                    y1={paddingTop}
                    x2={p.x}
                    y2={chartHeight - paddingBottom}
                    stroke="#cbd5e1"
                    strokeWidth="1.2"
                    strokeDasharray="2,2"
                  />
                )}

                {/* Income point */}
                <circle
                  cx={p.x}
                  cy={p.incomeY}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke="#10b981"
                  strokeWidth={isHovered ? 3.5 : 2.5}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer transition-all duration-100"
                />

                {/* Expense point */}
                <circle
                  cx={p.x}
                  cy={p.expenseY}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke="#f43f5e"
                  strokeWidth={isHovered ? 3.5 : 2.5}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer transition-all duration-100"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover details display card overlay */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 rounded-lg border border-slate-200 bg-white/95 backdrop-blur-xs p-2.5 shadow-md text-[10px] space-y-1 z-20 min-w-[140px] text-slate-800">
            <span className="font-extrabold uppercase tracking-wide block border-b border-slate-100 pb-0.5 text-center">
              {points[hoveredIdx].data.fullName}
            </span>
            <div className="flex justify-between items-center text-emerald-700 font-bold">
              <span>Income:</span>
              <span className="font-mono">{formatCurrency(points[hoveredIdx].data.income, currency)}</span>
            </div>
            <div className="flex justify-between items-center text-rose-700 font-bold">
              <span>Expenses:</span>
              <span className="font-mono">{formatCurrency(points[hoveredIdx].data.expenses, currency)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-100 pt-1 text-[#0c325c] font-black">
              <span>Surplus:</span>
              <span className="font-mono">
                {formatCurrency(points[hoveredIdx].data.income - points[hoveredIdx].data.expenses, currency)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom strategic statistics row */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-1.5 leading-none">
          <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>Average Savings Rate:</span>
          <strong className="text-slate-800 font-mono">{avgSavingsRate.toFixed(1)}%</strong>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <Info className="h-3 w-3 text-slate-400" />
          <span>Dynamic Scrollable</span>
        </div>
      </div>
    </div>
  );
};
