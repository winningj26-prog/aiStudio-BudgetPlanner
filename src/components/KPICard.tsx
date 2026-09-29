import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

export interface KPITrend {
  text: string;
  direction?: 'up' | 'down' | 'neutral';
  isPositive?: boolean;
  isNegative?: boolean;
  tooltip?: string;
}

interface KPICardProps {
  title: string;
  value: string;
  secondaryValue?: string;
  subtitle?: string;
  icon: React.ReactNode;
  theme?: 'green' | 'red' | 'blue' | 'purple' | 'orange' | 'neutral';
  trend?: KPITrend;
  onClick?: () => void;
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  secondaryValue,
  subtitle,
  icon,
  theme = 'blue',
  trend,
  onClick,
  className = '',
}) => {
  const themeStyles = {
    blue: {
      border: 'border-blue-200',
      bg: 'bg-white',
      hoverBg: 'hover:border-blue-300',
      iconBg: 'bg-blue-50 text-blue-600',
      valueColor: 'text-slate-900',
      accentColor: 'text-blue-600',
    },
    green: {
      border: 'border-emerald-200',
      bg: 'bg-emerald-50/40',
      hoverBg: 'hover:border-emerald-300',
      iconBg: 'bg-emerald-100 text-emerald-700',
      valueColor: 'text-emerald-950',
      accentColor: 'text-emerald-700',
    },
    red: {
      border: 'border-rose-200',
      bg: 'bg-rose-50/40',
      hoverBg: 'hover:border-rose-300',
      iconBg: 'bg-rose-100 text-rose-700',
      valueColor: 'text-rose-950',
      accentColor: 'text-rose-600',
    },
    purple: {
      border: 'border-purple-200',
      bg: 'bg-purple-50/40',
      hoverBg: 'hover:border-purple-300',
      iconBg: 'bg-purple-100 text-purple-700',
      valueColor: 'text-purple-950',
      accentColor: 'text-purple-700',
    },
    orange: {
      border: 'border-amber-200',
      bg: 'bg-amber-50/40',
      hoverBg: 'hover:border-amber-300',
      iconBg: 'bg-amber-100 text-amber-700',
      valueColor: 'text-amber-950',
      accentColor: 'text-amber-700',
    },
    neutral: {
      border: 'border-slate-200',
      bg: 'bg-white',
      hoverBg: 'hover:border-slate-300',
      iconBg: 'bg-slate-100 text-slate-700',
      valueColor: 'text-slate-900',
      accentColor: 'text-slate-600',
    },
  };

  const style = themeStyles[theme];

  // Auto-detect direction if not explicitly specified
  const detectedDirection =
    trend?.direction ||
    (trend?.text.includes('↑') ? 'up' : trend?.text.includes('↓') ? 'down' : undefined);

  // Clean raw arrow symbols so text doesn't show duplicate arrows
  const cleanTrendText = trend ? trend.text.replace(/^[↑↓]\s*/, '') : '';

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border p-4 shadow-sm transition-all duration-200 ${style.bg} ${style.border} ${style.hoverBg} ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${style.iconBg} shadow-xs shrink-0`}>
          {icon}
        </div>
      </div>

      <div className="mt-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-1.5">
          <div>
            <div className={`text-xl sm:text-2xl font-bold tracking-tight ${style.valueColor}`}>
              {value}
            </div>
            {secondaryValue && (
              <div className="text-[11px] font-bold text-slate-400 font-mono tracking-tight mt-0.5" title="Converted secondary currency value">
                ≈ {secondaryValue}
              </div>
            )}
          </div>

          {trend && (
            <div
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] sm:text-xs font-bold border transition-colors shadow-2xs ${
                trend.isPositive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : trend.isNegative
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title={
                trend.tooltip ||
                (trend.isPositive
                  ? 'Performance improvement vs previous month'
                  : trend.isNegative
                  ? 'Performance decline vs previous month'
                  : 'Relative to previous month')
              }
            >
              {detectedDirection === 'up' && (
                <TrendingUp className="h-3.5 w-3.5 shrink-0" />
              )}
              {detectedDirection === 'down' && (
                <TrendingDown className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{cleanTrendText}</span>
            </div>
          )}
        </div>

        {subtitle && (
          <div className="mt-1 text-xs text-slate-500 line-clamp-1">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
