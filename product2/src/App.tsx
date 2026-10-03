import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CircleDollarSign, CreditCard, LayoutDashboard, Settings, Target, Trash2 } from 'lucide-react';
import type { DebtAccount, Product2Workbook, SavingsGoal } from './domain/types.js';
import { calculatePaymentAllocation, projectRepaymentScenario } from './domain/debt.js';
import { calculateSavingsProgress } from './domain/savings.js';
import { validateDebt, validateSavingsGoal } from './domain/validation.js';
import { SupabaseProduct2Repository } from './repository/SupabaseProduct2Repository.js';
import { clearProduct2Session, loadProduct2Session, saveProduct2Session } from './session/Product2Session.js';
import { getInitialProduct2AuthState, resolveProduct2Session, signInWithGoogle, signInWithPassword, signOut, signUpWithPassword } from './auth/Product2Auth.js';
import { supabase } from './lib/supabase.js';
import { id, today } from './utils/ids.js';

const modules = [
  ['start', 'Start Here', LayoutDashboard], ['settings', 'Settings', Settings], ['goals', 'Savings Goals', Target],
  ['contributions', 'Savings Contributions', CircleDollarSign], ['debts', 'Debt Accounts', CreditCard],
  ['payments', 'Debt Payments', CircleDollarSign], ['planner', 'Repayment Planner', BarChart3], ['dashboard', 'Dashboard', LayoutDashboard],
] as const;

function emptyWorkbook(accountId: string, displayName: string, currency = 'USD'): Product2Workbook {
  const now = new Date().toISOString();
  return {
    account: { id: accountId, displayName, currency, createdAt: now, updatedAt: now },
    settings: { accountId, currency, dateFormat: 'YYYY-MM-DD', interestConvention: 'nominal-annual', paymentTiming: 'end-of-period', minimumPaymentPolicy: 'configured-minimum', calculationPreferences: { decimalPlaces: 2 } },
    savingsGoals: [], savingsContributions: [], debts: [], debtPayments: [],
  };
}

export function App() {
  const [session, setSession] = useState(loadProduct2Session());
  const [active, setActive] = useState('start');
  const [workbook, setWorkbook] = useState<Product2Workbook | null>(null);
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      setAuthReady(true);
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      try {
        const { user } = await getInitialProduct2AuthState();
        if (user && !cancelled) {
          const resolved = await resolveProduct2Session(user);
          saveProduct2Session(resolved);
          setSession(resolved);
        } else if (!cancelled) {
          clearProduct2Session();
          setSession(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not restore the Product 2 session.');
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
          setAuthReady(true);
        }
      }
    };

    hydrate();

    const { data } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (!authSession) {
        clearProduct2Session();
        setSession(null);
        setWorkbook(null);
        return;
      }

      void supabase.auth.getUser().then(async ({ data: userData, error: userError }) => {
        if (cancelled || userError || !userData.user) return;
        try {
          const resolved = await resolveProduct2Session(userData.user);
          saveProduct2Session(resolved);
          setSession(resolved);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not resolve Product 2 access.');
        }
      });
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const repo = new SupabaseProduct2Repository(session.tenantId, session.displayName, session.email);
    repo.load().then(loaded => {
      if (loaded) setWorkbook(loaded);
    }).catch(e => setError(e instanceof Error ? e.message : 'Could not load Product 2.'));
  }, [session]);

  const persist = async (next: Product2Workbook) => {
    if (!session) return;
    next.account.updatedAt = new Date().toISOString();
    const repo = new SupabaseProduct2Repository(session.tenantId, session.displayName, session.email);
    await repo.save(next);
    setWorkbook(structuredClone(next));
  };

  if (!supabase || !authReady || authLoading) {
    if (!supabase) return <main className="setup"><article className="card setup-card"><div className="brand-mark">P2</div><h1>Product 2 cloud configuration required</h1><p>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> before starting the production app.</p></article></main>;
    return <main className="loading">Checking your account…</main>;
  }

  if (!session) return <AccountSetup />;

  if (!workbook) return <main className="loading">Loading Product 2…</main>;

  const savings = workbook.savingsGoals.reduce((sum, goal) => sum + calculateSavingsProgress(goal, workbook.savingsContributions).currentBalance, 0);
  const debt = workbook.debts.reduce((sum, item) => sum + item.balance, 0);
  const planner = projectRepaymentScenario(workbook.debts, 'avalanche');

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">P2</div><div><strong>BudgetPlanner</strong><span>Product 2</span></div></div>
      <nav>{modules.map(([idValue, label, Icon]) => <button key={idValue} className={active === idValue ? 'nav-item active' : 'nav-item'} onClick={() => setActive(idValue)}><Icon size={18} /> {label}</button>)}</nav>
      <p className="independence">Standalone application<br />Product 1 is not required at runtime.</p>
      <button className="signout" onClick={async () => { await signOut(); clearProduct2Session(); setSession(null); setWorkbook(null); }}>Sign out</button>
    </aside>
    <section className="content">
      <header><div><p className="eyebrow">Savings Goal and Debt Tracker</p><h1>{modules.find(([idValue]) => idValue === active)?.[1]}</h1><small>{session.email}</small></div><span className="pill">Cloud tenant: {session.tenantId.slice(0, 8)}…</span></header>
      {error && <div className="alert">{error}</div>}
      {active === 'start' && <Start workbook={workbook} savings={savings} debt={debt} payoff={planner.payoffMonth} />}
      {active === 'settings' && <SettingsView workbook={workbook} onSave={next => persist(next)} />}
      {active === 'goals' && <GoalsView workbook={workbook} onSave={persist} />}
      {active === 'contributions' && <ContributionsView workbook={workbook} onSave={persist} />}
      {active === 'debts' && <DebtsView workbook={workbook} onSave={persist} />}
      {active === 'payments' && <PaymentsView workbook={workbook} onSave={persist} />}
      {active === 'planner' && <PlannerView debts={workbook.debts} />}
      {active === 'dashboard' && <Dashboard workbook={workbook} />}
    </section>
  </main>;
}

function AccountSetup() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Display name is required.');
        const { data, error } = await signUpWithPassword(email.trim(), password, name.trim());
        if (error) throw error;
        if (!data.session) {
          setMessage('Account created. Check your email to confirm the account, then sign in.');
        } else {
          setMessage('Account created. Loading your Product 2 workspace…');
        }
      } else {
        const { error } = await signInWithPassword(email.trim(), password);
        if (error) throw error;
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setMessage('');
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Google sign-in failed.');
      setBusy(false);
    }
  };

  return <main className="setup"><article className="card setup-card">
    <div className="brand-mark">P2</div>
    <p className="eyebrow">Secure Product 2 account</p>
    <h1>{mode === 'signin' ? 'Sign in to Product 2' : 'Create your Product 2 account'}</h1>
    <p>Email/password is supported directly. Google is an optional additional sign-in method when enabled for the shared Toolkit project.</p>
    {mode === 'signup' && <label>Display name<input value={name} onChange={e => setName(e.target.value)} /></label>}
    <label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" /></label>
    <label>Password<input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></label>
    <button className="primary" disabled={busy || !email.includes('@') || password.length < 8 || (mode === 'signup' && !name.trim())} onClick={() => void submit()}>{busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
    <button className="secondary" disabled={busy} onClick={() => void google()}>Continue with Google</button>
    <button className="link-button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }}>{mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}</button>
    {message && <p className="form-message">{message}</p>}
  </article></main>;
}
