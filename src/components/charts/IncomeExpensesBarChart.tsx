import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { CurrencyCode } from '../../types/budget';

interface IncomeExpensesBarChartProps {
  income: number;
  expenses: number;
  currency: CurrencyCode;
  plannedIncome?: number;
  plannedExpenses?: number;
}

export const IncomeExpensesBarChart: React.FC<IncomeExpensesBarChartProps> = ({
  income,
  expenses,
  currency,
  plannedIncome,
  plannedExpenses,
}) => {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  const maxValue = Math.max(income, expenses, plannedIncome || 0, plannedExpenses || 0, 1000) * 1.15;
  const chartHeight = 200;
  const chartWidth = 320;
  
  const incomeHeight = (income / maxValue) * (chartHeight - 40);
  const expenseHeight = (expenses / maxValue) * (chartHeight - 40);

  return (
    <div className="flex flex-col items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="w-full flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
        <h4 className="text-sm font-bold text-slate-800">Income vs. Expenses</h4>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-emerald-500" />
            <span className="text-slate-600 font-medium">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-amber-500" />
            <span className="text-slate-600 font-medium">Expenses</span>
          </div>
        </div>
      </div>

      <div className="relative w-full flex items-end justify-center pt-4 pb-2">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full max-w-[320px] h-48 overflow-visible"
        >
          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = chartHeight - 30 - pct * (chartHeight - 50);
            const val = maxValue * pct;
            return (
              <g key={i}>
                <line
                  x1={45}
                  y1={y}
                  x2={chartWidth - 10}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={40}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-sans"
                >
                  {formatCurrency(val, currency, 0)}
                </text>
              </g>
            );
          })}

          {/* Income Bar */}
          <g
            onMouseEnter={() => setHoveredBar('Income')}
            onMouseLeave={() => setHoveredBar(null)}
            className="cursor-pointer transition-opacity hover:opacity-90"
          >
            <rect
              x={95}
              y={chartHeight - 30 - incomeHeight}
              width={55}
              height={incomeHeight}
              rx={6}
              fill="#10b981"
            />
            {/* Planned line indicator */}
            {plannedIncome && (
              <line
                x1={90}
                y1={chartHeight - 30 - (plannedIncome / maxValue) * (chartHeight - 50)}
                x2={155}
                y2={chartHeight - 30 - (plannedIncome / maxValue) * (chartHeight - 50)}
                stroke="#047857"
                strokeWidth="2"
                strokeDasharray="2 2"
              />
            )}
            <text
              x={122}
              y={chartHeight - 35 - incomeHeight}
              textAnchor="middle"
              className="text-[11px] font-bold fill-emerald-700"
            >
              {formatCurrency(income, currency, 0)}
            </text>
            <text
              x={122}
              y={chartHeight - 12}
              textAnchor="middle"
              className="text-[11px] font-medium fill-slate-600"
            >
              Income
            </text>
          </g>

          {/* Expense Bar */}
          <g
            onMouseEnter={() => setHoveredBar('Expenses')}
            onMouseLeave={() => setHoveredBar(null)}
            className="cursor-pointer transition-opacity hover:opacity-90"
          >
            <rect
              x={185}
              y={chartHeight - 30 - expenseHeight}
              width={55}
              height={expenseHeight}
              rx={6}
              fill="#f59e0b"
            />
            {/* Planned line indicator */}
            {plannedExpenses && (
              <line
                x1={180}
                y1={chartHeight - 30 - (plannedExpenses / maxValue) * (chartHeight - 50)}
                x2={245}
                y2={chartHeight - 30 - (plannedExpenses / maxValue) * (chartHeight - 50)}
                stroke="#b45309"
                strokeWidth="2"
                strokeDasharray="2 2"
              />
            )}
            <text
              x={212}
              y={chartHeight - 35 - expenseHeight}
              textAnchor="middle"
              className="text-[11px] font-bold fill-amber-700"
            >
              {formatCurrency(expenses, currency, 0)}
            </text>
            <text
              x={212}
              y={chartHeight - 12}
              textAnchor="middle"
              className="text-[11px] font-medium fill-slate-600"
            >
              Expenses
            </text>
          </g>
        </svg>
      </div>

      <div className="w-full flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
        <span>Net Cashflow: <strong className="text-emerald-700 font-bold">{formatCurrency(income - expenses, currency)}</strong></span>
        <span>Ratio: <strong className="text-slate-800">{((expenses / (income || 1)) * 100).toFixed(1)}% spent</strong></span>
      </div>
    </div>
  );
};
