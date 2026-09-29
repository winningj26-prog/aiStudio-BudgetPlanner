import React, { useState } from 'react';
import { MonthSummary, CurrencyCode } from '../../types/budget';
import { formatCurrency } from '../../utils/formatters';

interface MonthlyTrendChartProps {
  data: MonthSummary[];
  currency: CurrencyCode;
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
  data,
  currency,
}) => {
  const [hoveredMonth, setHoveredMonth] = useState<MonthSummary | null>(null);

  const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expenses)), 6000) * 1.1;
  const svgWidth = 600;
  const svgHeight = 220;
  const bottomPad = 25;
  const topPad = 20;
  const chartH = svgHeight - bottomPad - topPad;
  const colGroupWidth = (svgWidth - 60) / 12;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-xs h-full">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2 mb-2">
        <div>
          <h4 className="text-sm font-bold text-slate-800">
            Monthly Trend (Income, Expenses, Savings)
          </h4>
          <p className="text-xs text-slate-500">12-month financial trajectory</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-blue-500" />
            <span className="text-slate-600 font-medium">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-amber-500" />
            <span className="text-slate-600 font-medium">Expenses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-emerald-500" />
            <span className="text-slate-600 font-medium">Savings</span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto py-1">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[520px] h-52">
          {/* Y-Axis guide lines */}
          {[0, 0.33, 0.66, 1].map((ratio, i) => {
            const y = topPad + chartH * (1 - ratio);
            const val = maxVal * ratio;
            return (
              <g key={i}>
                <line
                  x1={45}
                  y1={y}
                  x2={svgWidth - 10}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={40}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {formatCurrency(val, currency, 0)}
                </text>
              </g>
            );
          })}

          {/* Monthly Bars */}
          {data.map((item, idx) => {
            const groupX = 50 + idx * colGroupWidth;
            const barW = Math.max(colGroupWidth / 3.8, 8);

            const incH = (item.income / maxVal) * chartH;
            const expH = (item.expenses / maxVal) * chartH;
            const savH = Math.max((item.savings / maxVal) * chartH, 0);

            const isHovered = hoveredMonth?.month === item.month;

            return (
              <g
                key={item.month}
                onMouseEnter={() => setHoveredMonth(item)}
                onMouseLeave={() => setHoveredMonth(null)}
                className="cursor-pointer"
              >
                {/* Background hover highlight */}
                {isHovered && (
                  <rect
                    x={groupX - 2}
                    y={topPad}
                    width={colGroupWidth}
                    height={chartH}
                    fill="#f8fafc"
                    rx={4}
                  />
                )}

                {/* Income Bar */}
                <rect
                  x={groupX + 1}
                  y={topPad + chartH - incH}
                  width={barW}
                  height={incH}
                  rx={2}
                  fill="#3b82f6"
                  opacity={isHovered ? 1 : 0.9}
                />

                {/* Expense Bar */}
                <rect
                  x={groupX + 1 + barW + 1}
                  y={topPad + chartH - expH}
                  width={barW}
                  height={expH}
                  rx={2}
                  fill="#f59e0b"
                  opacity={isHovered ? 1 : 0.9}
                />

                {/* Savings Bar */}
                <rect
                  x={groupX + 1 + (barW + 1) * 2}
                  y={topPad + chartH - savH}
                  width={barW}
                  height={savH}
                  rx={2}
                  fill="#10b981"
                  opacity={isHovered ? 1 : 0.9}
                />

                {/* Month label */}
                <text
                  x={groupX + colGroupWidth / 2 - 2}
                  y={svgHeight - 8}
                  textAnchor="middle"
                  className={`text-[10px] font-medium ${
                    isHovered ? 'fill-blue-700 font-bold' : 'fill-slate-500'
                  }`}
                >
                  {item.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip info */}
        {hoveredMonth && (
          <div className="absolute top-2 right-4 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 shadow-md text-xs backdrop-blur-xs">
            <span className="font-bold text-slate-800">{hoveredMonth.fullName}</span>
            <div className="mt-1 flex gap-3 text-[11px]">
              <span className="text-blue-600">
                Inc: <strong>{formatCurrency(hoveredMonth.income, currency, 0)}</strong>
              </span>
              <span className="text-amber-600">
                Exp: <strong>{formatCurrency(hoveredMonth.expenses, currency, 0)}</strong>
              </span>
              <span className="text-emerald-600">
                Sav: <strong>{formatCurrency(hoveredMonth.savings, currency, 0)}</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
