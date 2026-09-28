import React, { useState } from 'react';
import { MonthSummary } from '../../types/budget';

interface SavingsRateLineChartProps {
  data: MonthSummary[];
  currentRate?: number;
}

export const SavingsRateLineChart: React.FC<SavingsRateLineChartProps> = ({
  data,
  currentRate = 56.1,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const svgWidth = 500;
  const svgHeight = 180;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 25;

  const width = svgWidth - padLeft - padRight;
  const height = svgHeight - padTop - padBottom;

  const minRate = 0;
  const maxRate = 100;

  const points = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1)) * width;
    const y = padTop + height - (d.savingsRate / (maxRate - minRate)) * height;
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  // Area under line
  const areaD = `${pathD} L ${points[points.length - 1].x},${padTop + height} L ${points[0].x},${padTop + height} Z`;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
        <div>
          <h4 className="text-sm font-bold text-slate-800">Savings Rate Trend</h4>
          <p className="text-xs text-slate-500">Monthly percentage of income saved</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
            Current: {currentRate.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto py-1">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[420px] h-44">
          {/* Horizontal lines for 0%, 25%, 50%, 75%, 100% */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = padTop + height - (pct / 100) * height;
            return (
              <g key={pct}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Shaded Area */}
          <path d={areaD} fill="url(#savingsGradient)" opacity="0.25" />

          {/* Linear Gradient definition */}
          <defs>
            <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* The trend line */}
          <path
            d={pathD}
            fill="none"
            stroke="#059669"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots on each month */}
          {points.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke="#059669"
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all"
                />
                <text
                  x={pt.x}
                  y={svgHeight - 8}
                  textAnchor="middle"
                  className={`text-[10px] font-medium ${
                    isHovered ? 'fill-emerald-800 font-bold' : 'fill-slate-500'
                  }`}
                >
                  {pt.data.month}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredIndex !== null && (
          <div className="absolute top-2 right-4 rounded-md border border-slate-200 bg-white/95 px-2.5 py-1 text-xs shadow-md">
            <span className="font-semibold text-slate-700">
              {points[hoveredIndex].data.fullName}:
            </span>{' '}
            <strong className="text-emerald-700 font-bold">
              {points[hoveredIndex].data.savingsRate.toFixed(1)}% saved
            </strong>
          </div>
        )}
      </div>
    </div>
  );
};
