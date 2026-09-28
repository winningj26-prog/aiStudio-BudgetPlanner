import React, { useState, useMemo } from 'react';
import { Debt, SettingsState } from '../../types/budget';
import { formatCurrency } from '../../utils/formatters';
import {
  Coins,
  TrendingUp,
  LineChart,
  ShieldCheck,
  Percent,
  Plus,
  Trash2,
  HelpCircle,
  Sparkles,
  Calculator,
  ArrowRightLeft,
  ChevronRight,
  TrendingDown
} from 'lucide-react';

interface AssetVal {
  id: string;
  name: string;
  amount: number;
  category: 'Liquid' | 'Investment' | 'Real Estate' | 'Other';
}

interface NetWorthForecasterProps {
  debts: Debt[];
  settings: SettingsState;
  currentMonthlySavings: number; // calculated as Income - Expenses
  onSelectCell?: (info: { reference: string; value: string; formula?: string; isCalculated: boolean }) => void;
}

export const NetWorthForecaster: React.FC<NetWorthForecasterProps> = ({
  debts,
  settings,
  currentMonthlySavings,
  onSelectCell,
}) => {
  // 1. Custom Asset Ledger State
  const [assets, setAssets] = useState<AssetVal[]>([
    { id: '1', name: 'Savings & Checking Accounts', amount: 12500, category: 'Liquid' },
    { id: '2', name: 'Stock Brokerage Portfolio', amount: 28400, category: 'Investment' },
    { id: '3', name: 'Primary Residence (Equity)', amount: 185000, category: 'Real Estate' },
    { id: '4', name: 'Retirement Account (401k/IRA)', amount: 45000, category: 'Investment' },
  ]);

  // Form states for adding custom asset
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetAmount, setNewAssetAmount] = useState('');
  const [newAssetCat, setNewAssetCategory] = useState<'Liquid' | 'Investment' | 'Real Estate' | 'Other'>('Investment');

  // Forecast configurations
  const [forecastYears, setForecastYears] = useState<number>(3); // 1, 2, or 3 years
  const [simulationType, setSimulationType] = useState<'linear' | 'monte_carlo'>('monte_carlo');
  const [expectedReturn, setExpectedReturn] = useState<number>(7); // 7% average market return
  const [volatility, setVolatility] = useState<number>(12); // 12% standard deviation

  // 2. Net Worth Calculation
  const totalAssets = useMemo(() => {
    return assets.reduce((sum, a) => sum + a.amount, 0);
  }, [assets]);

  const totalLiabilities = useMemo(() => {
    return debts.reduce((sum, d) => sum + d.balance, 0);
  }, [debts]);

  const netWorth = useMemo(() => {
    return totalAssets - totalLiabilities;
  }, [totalAssets, totalLiabilities]);

  // 3. Asset Ledger Handlers
  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim() || !newAssetAmount) return;
    const amount = parseFloat(newAssetAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newAsset: AssetVal = {
      id: Date.now().toString(),
      name: newAssetName.trim(),
      amount,
      category: newAssetCat,
    };
    setAssets([...assets, newAsset]);
    setNewAssetName('');
    setNewAssetAmount('');
  };

  const handleDeleteAsset = (id: string) => {
    setAssets(assets.filter((a) => a.id !== id));
  };

  // 4. Generate 12-Month Historical Net Worth Growth (Shaded Area Chart)
  const historicalNetWorthData = useMemo(() => {
    const months = ['Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26'];
    
    // Simulate a steady historical upward trend with slight asset oscillations and liability reductions
    return months.map((m, idx) => {
      const scale = idx / 11; // 0 to 1
      const simulatedAssets = totalAssets * (0.88 + 0.12 * scale + Math.sin(idx) * 0.015);
      const simulatedLiabilities = totalLiabilities * (1.15 - 0.15 * scale);
      const simulatedNet = simulatedAssets - simulatedLiabilities;
      return {
        month: m,
        assets: simulatedAssets,
        liabilities: simulatedLiabilities,
        netWorth: simulatedNet,
      };
    });
  }, [totalAssets, totalLiabilities]);

  // Area Chart Specs
  const chartWidth = 520;
  const chartHeight = 180;
  const topPad = 15;
  const bottomPad = 25;
  const leftPad = 50;
  const rightPad = 15;
  const areaWidth = chartWidth - leftPad - rightPad;
  const areaHeight = chartHeight - topPad - bottomPad;

  // Max value for area chart normalization
  const maxNetWorthVal = useMemo(() => {
    const vals = historicalNetWorthData.flatMap((d) => [d.assets, d.netWorth]);
    return Math.max(...vals, 10000) * 1.1;
  }, [historicalNetWorthData]);

  // SVG Area path generation
  const areaPoints = useMemo(() => {
    if (historicalNetWorthData.length === 0) return '';
    const points = historicalNetWorthData.map((d, i) => {
      const x = leftPad + (i / 11) * areaWidth;
      const y = topPad + areaHeight - (Math.max(0, d.netWorth) / maxNetWorthVal) * areaHeight;
      return `${x},${y}`;
    });
    // Append bottom right and bottom left points to close the polygon
    const closedPath = [
      `${leftPad},${topPad + areaHeight}`,
      ...points,
      `${leftPad + areaWidth},${topPad + areaHeight}`,
    ].join(' ');
    return closedPath;
  }, [historicalNetWorthData, maxNetWorthVal, areaWidth, areaHeight]);

  const linePoints = useMemo(() => {
    return historicalNetWorthData.map((d, i) => {
      const x = leftPad + (i / 11) * areaWidth;
      const y = topPad + areaHeight - (Math.max(0, d.netWorth) / maxNetWorthVal) * areaHeight;
      return `${x},${y}`;
    }).join(' ');
  }, [historicalNetWorthData, maxNetWorthVal, areaWidth, areaHeight]);


  // 5. Stochastic Monte Carlo vs Deterministic Linear Forecaster
  // Simulates month-by-month future balances up to 36 months
  const forecastData = useMemo(() => {
    const monthsCount = forecastYears * 12;
    const baseSavings = netWorth;
    const monthlyRate = currentMonthlySavings; // deterministic monthly surplus additions

    const timeline: { label: string; p10: number; p50: number; p90: number }[] = [];

    // Deterministic Linear projection
    if (simulationType === 'linear') {
      const growthRateMonthly = (expectedReturn / 100) / 12;
      for (let m = 0; m <= monthsCount; m++) {
        let projected = baseSavings;
        for (let step = 1; step <= m; step++) {
          projected = projected * (1 + growthRateMonthly) + monthlyRate;
        }
        timeline.push({
          label: `M+${m}`,
          p10: projected,
          p50: projected,
          p90: projected,
        });
      }
    } else {
      // Stochastic Monte Carlo
      // We run 100 trials, sorting outcomes to find 10th (p10), 50th (p50), and 90th (p90) percentiles
      const numTrials = 80;
      const trials: number[][] = Array.from({ length: numTrials }, () => [baseSavings]);

      const monthlyMeanGrowth = (expectedReturn / 100) / 12;
      const monthlyStdDev = (volatility / 100) / Math.sqrt(12);

      // Box-Muller transform for normal distribution random variable
      const randomNormal = () => {
        let u = 0, v = 0;
        while(u === 0) u = Math.random(); 
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      };

      for (let m = 1; m <= monthsCount; m++) {
        for (let t = 0; m > 0 && t < numTrials; t++) {
          const prevValue = trials[t][m - 1];
          // Stochastic asset rate multiplier + constant additions
          const randMult = 1 + monthlyMeanGrowth + monthlyStdDev * randomNormal();
          const nextVal = Math.max(0, prevValue * randMult + monthlyRate);
          trials[t].push(nextVal);
        }
      }

      // Collate percentiles for each month
      for (let m = 0; m <= monthsCount; m++) {
        const sortedOutcomes = trials.map((t) => t[m]).sort((a, b) => a - b);
        const p10Idx = Math.floor(numTrials * 0.15);
        const p50Idx = Math.floor(numTrials * 0.50);
        const p90Idx = Math.floor(numTrials * 0.85);

        timeline.push({
          label: `M+${m}`,
          p10: sortedOutcomes[p10Idx] || baseSavings,
          p50: sortedOutcomes[p50Idx] || baseSavings,
          p90: sortedOutcomes[p90Idx] || baseSavings,
        });
      }
    }

    return timeline;
  }, [netWorth, currentMonthlySavings, expectedReturn, volatility, forecastYears, simulationType]);

  const maxForecastVal = useMemo(() => {
    const vals = forecastData.flatMap((d) => [d.p90, d.p50]);
    return Math.max(...vals, 10000) * 1.08;
  }, [forecastData]);

  // SVGs projections
  const projectionLines = useMemo(() => {
    const totalPoints = forecastData.length;
    const drawLine = (prop: 'p10' | 'p50' | 'p90') => {
      return forecastData.map((d, i) => {
        const x = leftPad + (i / (totalPoints - 1)) * areaWidth;
        const y = topPad + areaHeight - (d[prop] / maxForecastVal) * areaHeight;
        return `${x},${y}`;
      }).join(' ');
    };

    return {
      p10: drawLine('p10'),
      p50: drawLine('p50'),
      p90: drawLine('p90'),
    };
  }, [forecastData, maxForecastVal, areaWidth, areaHeight]);

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------- */}
      {/* 1. Header Hero section */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-[#0c325c] flex items-center gap-2">
            <Coins className="h-5 w-5 text-emerald-600 animate-pulse" />
            <span>Net Worth & Wealth Forecasting Hub</span>
          </h2>
          <p className="text-xs text-slate-500 leading-normal">
            Consolidate overall assets, auto-aggregate liabilities, and run stochastic simulations of long-term capital trajectory.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase shrink-0">
          <span className="rounded bg-blue-100 text-blue-800 px-2 py-0.5 border border-blue-200">Responsive Sheet</span>
          <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 border border-emerald-200">Real-time Forecast</span>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. Top Overview: Assets, Liabilities, Net Worth Cards */}
      {/* ---------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Assets card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-3xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Current Assets Balance</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono mt-1">
            {formatCurrency(totalAssets, settings.currency)}
          </span>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">
            Aggregating checking, stock brokerages, and estate valuations.
          </p>
        </div>

        {/* Liabilities card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-3xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Liabilities (Amortized Debt)</span>
          <span className="text-xl sm:text-2xl font-black text-rose-600 font-mono mt-1">
            -{formatCurrency(totalLiabilities, settings.currency)}
          </span>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">
            Syncing dynamically with entered balances in Debt Payoff Sheet.
          </p>
        </div>

        {/* Net Worth card */}
        <div className="rounded-xl border border-slate-200 bg-[#0c325c] text-white p-4 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-emerald-400/20 blur-xl" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 block">Total Net Worth</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono mt-1">
            {formatCurrency(netWorth, settings.currency)}
          </span>
          <div className="text-[10px] text-slate-200 mt-2 font-bold flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            <span>Capital ratio of {((totalAssets / (totalLiabilities || 1)) * 100).toFixed(0)}% to debts</span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. Asset Ledger Entry & Growth Chart Area */}
      {/* ---------------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Editable Assets Ledger List */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-3xs lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-emerald-600" />
                <span>Custom Asset Inventory Ledger</span>
              </h3>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500 border border-slate-200 uppercase font-mono">
                Asset list
              </span>
            </div>

            {/* Asset Table list */}
            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => {
                    if (onSelectCell) {
                      onSelectCell({
                        reference: `NetWorth!Asset_${asset.name.replace(/\s+/g, '_')}`,
                        value: formatCurrency(asset.amount, settings.currency),
                        formula: `=NW_ASSET("${asset.name}", ${asset.amount})`,
                        isCalculated: true,
                      });
                    }
                  }}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 hover:border-blue-400 hover:bg-white transition-all cursor-pointer group"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-slate-800 block truncate leading-tight">{asset.name}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">{asset.category} Asset</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs font-black text-slate-800">
                      {formatCurrency(asset.amount, settings.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAsset(asset.id);
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Inline Add Asset Form */}
            <form onSubmit={handleAddAsset} className="mt-4 pt-3 border-t border-slate-100 grid gap-2 sm:grid-cols-12 items-end">
              <div className="sm:col-span-5 space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 block">Asset Description</label>
                <input
                  type="text"
                  placeholder="e.g. Stock Investment"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-800 shadow-3xs focus:border-emerald-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 block">Valuation</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={newAssetAmount}
                  onChange={(e) => setNewAssetAmount(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs font-mono font-bold text-slate-800 shadow-3xs focus:border-emerald-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 block">Type</label>
                <select
                  value={newAssetCat}
                  onChange={(e: any) => setNewAssetCategory(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 bg-white shadow-3xs focus:border-emerald-500"
                >
                  <option value="Liquid">Liquid</option>
                  <option value="Investment">Investment</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <button
                type="submit"
                className="sm:col-span-2 w-full inline-flex h-[32px] items-center justify-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 text-xs font-black text-white shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Historical Area Chart showing Net Worth Trajectory */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-3xs lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span>12-Month Net Worth Shaded Area Timeline</span>
                </h3>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <div className="flex items-center gap-1.5 font-bold text-slate-600">
                  <span className="h-2 w-2 rounded-xs bg-emerald-600" />
                  <span>Net Wealth</span>
                </div>
              </div>
            </div>

            {/* SVG area chart */}
            <div className="relative w-full overflow-x-auto">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[420px] h-44 overflow-visible">
                {/* Horizontal Grid lines */}
                {[0, 0.33, 0.66, 1].map((pct, i) => {
                  const y = topPad + areaHeight * (1 - pct);
                  const val = maxNetWorthVal * pct;
                  return (
                    <g key={i}>
                      <line
                        x1={leftPad}
                        y1={y}
                        x2={chartWidth - rightPad}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth="1.2"
                      />
                      <text
                        x={leftPad - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        className="text-[9px] fill-slate-400 font-mono font-bold"
                      >
                        {formatCurrency(val, settings.currency, 0)}
                      </text>
                    </g>
                  );
                })}

                {/* Shaded Area */}
                {historicalNetWorthData.length > 0 && (
                  <polygon
                    points={areaPoints}
                    fill="url(#nwGrad)"
                    opacity="0.8"
                  />
                )}

                {/* Growth Line */}
                {historicalNetWorthData.length > 0 && (
                  <polyline
                    points={linePoints}
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Month labels */}
                {historicalNetWorthData.map((d, i) => {
                  const x = leftPad + (i / 11) * areaWidth;
                  return (
                    <text
                      key={d.month}
                      x={x}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      className="text-[8.5px] font-bold fill-slate-500 font-mono"
                    >
                      {d.month}
                    </text>
                  );
                })}

                {/* SVG Definitions for gradient */}
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. Forecasting Tool: Monte Carlo vs Linear Projection */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-3">
          <div className="space-y-0.5">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
              <LineChart className="h-4.5 w-4.5 text-blue-600 animate-pulse" />
              <span>Interactive Long-Term Wealth Forecaster</span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Deterministic linear trends compared alongside stochastic Monte Carlo trial envelopes.
            </p>
          </div>

          {/* Config switches */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Simulation Type selector */}
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50">
              <button
                type="button"
                onClick={() => setSimulationType('linear')}
                className={`px-2 py-1 text-[10px] font-black rounded cursor-pointer transition-all ${
                  simulationType === 'linear'
                    ? 'bg-[#0c325c] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Linear Trend
              </button>
              <button
                type="button"
                onClick={() => setSimulationType('monte_carlo')}
                className={`px-2 py-1 text-[10px] font-black rounded cursor-pointer transition-all ${
                  simulationType === 'monte_carlo'
                    ? 'bg-[#0c325c] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monte Carlo Envelope
              </button>
            </div>

            {/* Timeframe length */}
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50 text-[10px] font-bold">
              {[1, 2, 3].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setForecastYears(y)}
                  className={`px-2 py-1 rounded cursor-pointer transition-all font-black ${
                    forecastYears === y
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {y} Yr{y > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Configuration sliders row */}
        <div className="grid gap-4 sm:grid-cols-3 bg-slate-50/50 p-4 border border-slate-100 rounded-xl text-xs text-slate-600">
          {/* Slider 1: expected annual returns */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="flex items-center gap-1">
                <Percent className="h-3 w-3 text-slate-400" />
                <span>Mean Annual Return</span>
              </span>
              <span className="text-blue-700 font-black">{expectedReturn}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600"
            />
          </div>

          {/* Slider 2: Annual Volatility (Standard Deviation) */}
          <div className={`space-y-1.5 transition-opacity ${simulationType === 'linear' ? 'opacity-30' : 'opacity-100'}`}>
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="flex items-center gap-1">
                <Percent className="h-3 w-3 text-slate-400" />
                <span>Annual Market Volatility</span>
              </span>
              <span className="text-[#0c325c] font-black">{volatility}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="35"
              value={volatility}
              disabled={simulationType === 'linear'}
              onChange={(e) => setVolatility(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#0c325c]"
            />
          </div>

          {/* Core Monthly Addition info */}
          <div className="border-l border-slate-200 pl-4 flex flex-col justify-center space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assumed Net Monthly Savings rate</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-base font-black ${currentMonthlySavings >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {currentMonthlySavings >= 0 ? '+' : ''}{formatCurrency(currentMonthlySavings, settings.currency)}/mo
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">(Live surplus calculated)</span>
            </div>
          </div>
        </div>

        {/* Projection Visualization SVG */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-500 font-bold">
            <span>Projection Forecast Matrix</span>
            <div className="flex flex-wrap items-center gap-3">
              {simulationType === 'monte_carlo' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-300" />
                    <span>Optimistic (Top 85%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    <span>Median Path (50%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-purple-400" />
                    <span>Conservative (Bottom 15%)</span>
                  </div>
                </>
              )}
              {simulationType === 'linear' && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  <span>Linear Proj. Target Path</span>
                </div>
              )}
            </div>
          </div>

          <div className="relative w-full overflow-x-auto py-1">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[420px] h-44 overflow-visible">
              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = topPad + areaHeight * (1 - pct);
                const val = maxForecastVal * pct;
                return (
                  <g key={i}>
                    <line
                      x1={leftPad}
                      y1={y}
                      x2={chartWidth - rightPad}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={leftPad - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[9px] fill-slate-400 font-mono font-bold"
                    >
                      {formatCurrency(val, settings.currency, 0)}
                    </text>
                  </g>
                );
              })}

              {/* Monte Carlo envelope projection lines */}
              {simulationType === 'monte_carlo' && (
                <>
                  {/* Top 85% Envelope Line */}
                  <polyline
                    points={projectionLines.p90}
                    fill="none"
                    stroke="#93c5fd"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    strokeLinecap="round"
                  />
                  {/* Bottom 15% Envelope Line */}
                  <polyline
                    points={projectionLines.p10}
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    strokeLinecap="round"
                  />
                </>
              )}

              {/* Median / Linear Path */}
              <polyline
                points={projectionLines.p50}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Time X-axis labels */}
              {forecastData.filter((_, idx) => idx % Math.max(1, Math.floor(forecastData.length / 6)) === 0 || idx === forecastData.length - 1).map((d, i, arr) => {
                const stepIdx = forecastData.findIndex((fd) => fd.label === d.label);
                const x = leftPad + (stepIdx / (forecastData.length - 1)) * areaWidth;
                return (
                  <g key={d.label}>
                    <line
                      x1={x}
                      y1={topPad + areaHeight}
                      x2={x}
                      y2={topPad + areaHeight + 4}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      className="text-[8.5px] font-bold fill-slate-400 font-mono"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Forecast Summary Indicators */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 pt-2 text-xs">
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase leading-none block">Projected Total Balance</span>
            <span className="text-sm font-black text-slate-900 mt-1 font-mono">
              {formatCurrency(forecastData[forecastData.length - 1]?.p50 || 0, settings.currency)}
            </span>
            <span className="text-[9px] text-slate-500 font-bold block mt-1">In exactly {forecastYears} year{forecastYears > 1 ? 's' : ''} (Median/Linear Outcome)</span>
          </div>

          {simulationType === 'monte_carlo' && (
            <>
              <div className="rounded-lg bg-emerald-50/50 p-3 border border-emerald-100 flex flex-col justify-between">
                <span className="text-[10px] text-emerald-600 font-extrabold uppercase leading-none block">Optimistic Target (Upper 15% Cap)</span>
                <span className="text-sm font-black text-emerald-800 mt-1 font-mono">
                  {formatCurrency(forecastData[forecastData.length - 1]?.p90 || 0, settings.currency)}
                </span>
                <span className="text-[9px] text-emerald-600 font-bold block mt-1">Stochastic market tailwind outcomes</span>
              </div>

              <div className="rounded-lg bg-purple-50/50 p-3 border border-purple-100 flex flex-col justify-between">
                <span className="text-[10px] text-purple-600 font-extrabold uppercase leading-none block">Conservative Target (Lower 15% Cap)</span>
                <span className="text-sm font-black text-purple-800 mt-1 font-mono">
                  {formatCurrency(forecastData[forecastData.length - 1]?.p10 || 0, settings.currency)}
                </span>
                <span className="text-[9px] text-purple-600 font-bold block mt-1">Safety baseline in economic slowdowns</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
