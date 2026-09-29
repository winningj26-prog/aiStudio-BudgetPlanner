import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { CurrencyCode } from '../../types/budget';

interface SliceData {
  category: string;
  amount: number;
  color: string;
  percentage: number;
}

interface ExpenseDonutChartProps {
  data: { category: string; amount: number; color?: string }[];
  currency: CurrencyCode;
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue (Housing)
  '#06b6d4', // cyan (Utilities)
  '#10b981', // emerald (Groceries)
  '#f59e0b', // amber (Transportation)
  '#8b5cf6', // purple (Insurance)
  '#ec4899', // pink (Healthcare)
  '#f43f5e', // rose (Entertainment)
  '#f97316', // orange (Dining Out)
  '#64748b', // slate (Other)
];

export const ExpenseDonutChart: React.FC<ExpenseDonutChartProps> = ({
  data,
  currency,
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<SliceData | null>(null);

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  // Group smaller items into "Other" if more than 5 slices
  const sorted = [...data].sort((a, b) => b.amount - a.amount);
  const primaryItems = sorted.slice(0, 5);
  const remainder = sorted.slice(5).reduce((sum, item) => sum + item.amount, 0);

  const slices: SliceData[] = primaryItems.map((item, idx) => ({
    category: item.category,
    amount: item.amount,
    color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
    percentage: total > 0 ? (item.amount / total) * 100 : 0,
  }));

  if (remainder > 0) {
    slices.push({
      category: 'Other',
      amount: remainder,
      color: '#94a3b8',
      percentage: (remainder / total) * 100,
    });
  }

  // Calculate SVG arc paths
  const size = 180;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-xs h-full">
      <div className="border-b border-slate-100 pb-2 mb-3">
        <h4 className="text-sm font-bold text-slate-800">Expense Breakdown</h4>
        <p className="text-xs text-slate-500">Distribution by category</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-1">
        {/* SVG Donut */}
        <div className="relative flex items-center justify-center">
          <svg width={size} height={size} className="transform -rotate-90">
            {total === 0 ? (
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
              />
            ) : (
              slices.map((slice, i) => {
                const strokeDashoffset =
                  circumference - (slice.percentage / 100) * circumference;
                const rotateAngle = (cumulativePercent / 100) * 360;
                cumulativePercent += slice.percentage;

                const isHovered = hoveredSlice?.category === slice.category;

                return (
                  <circle
                    key={i}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{
                      transformOrigin: `${center}px ${center}px`,
                      transform: `rotate(${rotateAngle}deg)`,
                      transition: 'all 0.2s ease',
                    }}
                    className="cursor-pointer hover:opacity-90"
                    onMouseEnter={() => setHoveredSlice(slice)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                );
              })
            )}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
            <span className="text-[11px] font-semibold text-slate-500">
              {hoveredSlice ? hoveredSlice.category : 'Total'}
            </span>
            <span className="text-sm font-bold text-slate-900">
              {hoveredSlice
                ? `${hoveredSlice.percentage.toFixed(0)}%`
                : formatCurrency(total, currency, 0)}
            </span>
            {hoveredSlice && (
              <span className="text-[10px] text-slate-500">
                {formatCurrency(hoveredSlice.amount, currency, 0)}
              </span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-1 flex-col gap-1.5 w-full">
          {slices.map((slice, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredSlice(slice)}
              onMouseLeave={() => setHoveredSlice(null)}
              className={`flex items-center justify-between rounded-md px-2 py-1 text-xs transition-colors cursor-pointer ${
                hoveredSlice?.category === slice.category
                  ? 'bg-slate-100 font-semibold'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-xs shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-slate-700 truncate max-w-[110px]">
                  {slice.category}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[11px]">
                  {formatCurrency(slice.amount, currency, 0)}
                </span>
                <span className="font-bold text-slate-800 w-8 text-right">
                  {slice.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
