import { useMemo, useState } from 'react';
import { BarChart3, CircleDollarSign, CreditCard, LayoutDashboard, Settings, Target } from 'lucide-react';
import type { Product2Workbook } from './domain/types.js';
import { projectRepaymentScenario } from './domain/debt.js';

const emptyWorkbook: Product2Workbook = {
  account: { id: 'local-p2', displayName: 'My household', currency: 'USD', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  settings: { accountId: 'local-p2', currency: 'USD', dateFormat: 'YYYY-MM-DD', interestConvention: 'nominal-annual', paymentTiming: 'end-of-period', minimumPaymentPolicy: 'configured-minimum', calculationPreferences: { decimalPlaces: 2 } },
  savingsGoals: [], savingsContributions: [], debts: [], debtPayments: [],
};

const modules = [
  ['start', 'Start Here', LayoutDashboard], ['settings', 'Settings', Settings], ['goals', 'Savings Goals', Target],
  ['contributions', 'Savings Contributions', CircleDollarSign], ['debts', 'Debt Accounts', CreditCard],
  ['payments', 'Debt Payments', CircleDollarSign], ['planner', 'Repayment Planner', BarChart3], ['dashboard', 'Dashboard', LayoutDashboard],
] as const;

export function App() {
  const [active, setActive] = useState('start');
  const [workbook] = useState(emptyWorkbook);
  const summary = useMemo(() => {
    const debt = workbook.debts.reduce((sum, item) => sum + item.balance, 0);
    const savings = workbook.savingsGoals.reduce((sum, item) => sum + item.openingBalance, 0);
    const planner = projectRepaymentScenario(workbook.debts, 'avalanche');
    return { debt, savings, planner };
  }, [workbook]);

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">BP</div><div><strong>BudgetPlanner</strong><span>Product 2</span></div></div>
      <nav>{modules.map(([id, label, Icon]) => <button key={id} className={active === id ? 'nav-item active' : 'nav-item'} onClick={() => setActive(id)}><Icon size={18} /> {label}</button>)}</nav>
      <p className="independence">Standalone app<br />No Product 1 runtime dependency</p>
    </aside>
    <section className="content">
      <header><div><p className="eyebrow">Savings Goal and Debt Tracker</p><h1>{modules.find(([id]) => id === active)?.[1]}</h1></div><span className="pill">Local foundation</span></header>
      {active === 'start' && <div className="grid">
        <article className="hero card"><p className="eyebrow">Start Here</p><h2>Your financial planning workspace</h2><p>Track savings goals, debt payments, and independent repayment scenarios. Product 2 has its own data and calculation boundaries.</p>
          <div className="stats"><div><span>Savings</span><strong>{summary.savings.toFixed(2)}</strong></div><div><span>Debt</span><strong>{summary.debt.toFixed(2)}</strong></div><div><span>Debts</span><strong>{workbook.debts.length}</strong></div></div>
        </article>
        <article className="card"><p className="eyebrow">Planner</p><h3>Repayment engine ready</h3><p>Minimum, snowball, and avalanche calculations run entirely from Product 2 debt data.</p><strong>{summary.planner.payoffMonth === 0 ? 'No debts yet' : 'Ready for debt data'}</strong></article>
      </div>}
      {active !== 'start' && <article className="card placeholder"><p className="eyebrow">Foundation complete</p><h2>{modules.find(([id]) => id === active)?.[1]}</h2><p>This module is connected to the standalone Product 2 shell. Its domain and repository implementation will be added without depending on Product 1.</p></article>}
    </section>
  </main>;
}
