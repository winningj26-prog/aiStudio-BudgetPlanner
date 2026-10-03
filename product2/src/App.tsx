import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CircleDollarSign, CreditCard, LayoutDashboard, Settings, Target, Trash2 } from 'lucide-react';
import type { DebtAccount, Product2Workbook, SavingsGoal } from './domain/types.js';
import { calculatePaymentAllocation, projectRepaymentScenario } from './domain/debt.js';
import { calculateSavingsProgress } from './domain/savings.js';
import { validateDebt, validateSavingsGoal } from './domain/validation.js';
import { SupabaseProduct2Repository } from './repository/SupabaseProduct2Repository.js';
import { clearProduct2Session, loadProduct2Session, saveProduct2Session } from './session/Product2Session.js';
import { getInitialProduct2AuthState, resolveProduct2Session, selectProduct2Plan, signInWithGoogle, signInWithPassword, signOut, signUpWithPassword } from './auth/Product2Auth.js';
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
    const client = supabase;
    if (!client) {
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

    void hydrate();

    const { data } = client.auth.onAuthStateChange((_event, authSession) => {
      if (!authSession) {
        clearProduct2Session();
        setSession(null);
        setWorkbook(null);
        return;
      }
      void client.auth.getUser().then(async ({ data: userData, error: userError }) => {
        if (cancelled || userError || !userData.user) return;
        try {
          const resolved = await resolveProduct2Session(userData.user);
          saveProduct2Session(resolved);
          setSession(resolved);
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Could not resolve Product 2 access.');
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
  if (session.productAccess !== 'active') return <PlanSelection session={session} onActivated={next => { saveProduct2Session(next); setSession(next); setError(''); }} />;
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
        setMessage(data.session ? 'Account created. Loading your Product 2 workspace…' : 'Account created. Check your email to confirm the account, then sign in.');
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

function PlanSelection({ session, onActivated }: { session: NonNullable<ReturnType<typeof loadProduct2Session>>; onActivated: (session: NonNullable<ReturnType<typeof loadProduct2Session>>) => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const plans = [
    { id: 'free', name: 'Free', description: 'Core savings and debt tracking with the standalone Product 2 workspace.' },
    { id: 'plus', name: 'Plus', description: 'Paid tier selection is recorded now; billing activation will be added separately.' },
    { id: 'pro', name: 'Pro', description: 'Paid tier selection is recorded now; billing activation will be added separately.' },
  ];

  const choose = async (planId: string) => {
    setBusy(true);
    setMessage('');
    try {
      const result = await selectProduct2Plan(session.tenantId, planId);
      if (planId === 'free') {
        const { user } = await getInitialProduct2AuthState();
        if (!user) throw new Error('Your authentication session expired. Please sign in again.');
        onActivated(await resolveProduct2Session(user));
        return;
      }
      setMessage(`${result?.plan_id ?? planId} selected. Payment is required before paid access is activated; no paid entitlement was granted.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not save your plan selection.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="setup"><article className="card setup-card">
    <div className="brand-mark">P2</div>
    <p className="eyebrow">Choose your Product 2 subscription</p>
    <h1>Start with the plan that fits your needs</h1>
    <p>Your selection is tenant-scoped. Free activates immediately. Plus and Pro are recorded as pending payment until billing is connected.</p>
    <div className="plan-grid">{plans.map(plan => <div className="card plan-card" key={plan.id}>
      <p className="eyebrow">{plan.name}</p><h2>{plan.id === 'free' ? 'No payment required' : 'Paid plan'}</h2><p>{plan.description}</p>
      <button className="primary" disabled={busy} onClick={() => void choose(plan.id)}>{busy ? 'Saving…' : `Choose ${plan.name}`}</button>
    </div>)}</div>
    {session.planSelectionStatus === 'pending_payment' && <p className="form-message">Current selection: {session.planId}. Paid access remains inactive until billing confirms the subscription.</p>}
    {message && <p className="form-message">{message}</p>}
  </article></main>;
}

function Start({ workbook, savings, debt, payoff }: { workbook: Product2Workbook; savings: number; debt: number; payoff: number | null }) {
  return <div className="grid"><article className="hero card"><p className="eyebrow">Welcome, {workbook.account.displayName}</p><h2>One independent workspace for goals and debt.</h2><p>Product 2 stores its own workbook namespace and calculates savings progress, payment allocation, and repayment scenarios without Product 1.</p>
    <div className="stats"><Metric label="Savings" value={savings.toFixed(2)} /><Metric label="Debt" value={debt.toFixed(2)} /><Metric label="Debts" value={String(workbook.debts.length)} /><Metric label="Goals" value={String(workbook.savingsGoals.length)} /></div></article>
    <article className="card"><p className="eyebrow">Repayment</p><h3>Current avalanche projection</h3><strong>{payoff == null ? 'No payoff within projection horizon' : payoff === 0 ? 'No active debt' : `${payoff} periods`}</strong><p className="muted">Missing interest rates are treated as 0% under the documented Product 2 assumptions.</p></article></div>;
}

function Metric({label,value}:{label:string;value:string}) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }

function GoalsView({ workbook, onSave }: { workbook: Product2Workbook; onSave: (w: Product2Workbook) => Promise<void> }) {
  const [name,setName]=useState(''); const [target,setTarget]=useState(''); const [opening,setOpening]=useState('0'); const [message,setMessage]=useState('');
  const add=async()=>{ const goal:SavingsGoal={id:id('goal'),accountId:workbook.account.id,name:name.trim(),targetAmount:Number(target),openingBalance:Number(opening),status:'active'}; const errors=validateSavingsGoal(goal); if(errors.length){setMessage(errors.join(' '));return;} await onSave({...workbook,savingsGoals:[...workbook.savingsGoals,goal]}); setName('');setTarget('');setOpening('0');setMessage('Goal added.'); };
  return <section><div className="card form-grid"><div><p className="eyebrow">New goal</p><label>Name<input value={name} onChange={e=>setName(e.target.value)} /></label><label>Target amount<input type="number" min="0" value={target} onChange={e=>setTarget(e.target.value)} /></label><label>Opening balance<input type="number" min="0" value={opening} onChange={e=>setOpening(e.target.value)} /></label><button className="primary" onClick={add}>Add savings goal</button>{message&&<p className="form-message">{message}</p>}</div><div><p className="eyebrow">Goals</p>{workbook.savingsGoals.map(g=>{const p=calculateSavingsProgress(g,workbook.savingsContributions);return <div className="list-row" key={g.id}><div><strong>{g.name}</strong><small>{p.currentBalance.toFixed(2)} / {g.targetAmount.toFixed(2)} · {p.completionPercentage.toFixed(0)}%</small></div><button className="icon" onClick={()=>onSave({...workbook,savingsGoals:workbook.savingsGoals.filter(x=>x.id!==g.id),savingsContributions:workbook.savingsContributions.filter(x=>x.goalId!==g.id)})}><Trash2 size={16}/></button></div>})}{!workbook.savingsGoals.length&&<p className="muted">No savings goals yet.</p>}</div></div></section>;
}

function ContributionsView({ workbook, onSave }: { workbook: Product2Workbook; onSave: (w: Product2Workbook) => Promise<void> }) {
  const [goalId,setGoalId]=useState(workbook.savingsGoals[0]?.id||''); const [amount,setAmount]=useState(''); const [message,setMessage]=useState('');
  const add=async()=>{const value=Number(amount);if(!goalId||!Number.isFinite(value)||value<=0){setMessage('Select a goal and enter a positive amount.');return;}await onSave({...workbook,savingsContributions:[...workbook.savingsContributions,{id:id('contribution'),accountId:workbook.account.id,goalId,date:today(),amount:value}]});setAmount('');setMessage('Contribution recorded.');};
  return <section className="card"><p className="eyebrow">Savings contribution</p>{workbook.savingsGoals.length?<><label>Goal<select value={goalId} onChange={e=>setGoalId(e.target.value)}>{workbook.savingsGoals.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><label>Amount<input type="number" min="0" value={amount} onChange={e=>setAmount(e.target.value)}/></label><button className="primary" onClick={add}>Record contribution</button>{message&&<p className="form-message">{message}</p>}<div className="table">{workbook.savingsContributions.map(c=><div className="list-row" key={c.id}><span>{c.date}</span><strong>{c.amount.toFixed(2)}</strong><small>{workbook.savingsGoals.find(g=>g.id===c.goalId)?.name}</small></div>)}</div></>:<p className="muted">Create a savings goal first.</p>}</section>;
}

function DebtsView({ workbook, onSave }: { workbook: Product2Workbook; onSave: (w: Product2Workbook) => Promise<void> }) {
  const [creditor,setCreditor]=useState('');const [balance,setBalance]=useState('');const [rate,setRate]=useState('');const [minimum,setMinimum]=useState('');const [message,setMessage]=useState('');
  const add=async()=>{const debt:DebtAccount={id:id('debt'),accountId:workbook.account.id,creditor:creditor.trim(),openingBalance:Number(balance),balance:Number(balance),interestRate:rate===''?undefined:Number(rate),minimumPayment:Number(minimum),paymentFrequency:'monthly',status:'active'};const errors=validateDebt(debt);if(errors.length){setMessage(errors.join(' '));return;}await onSave({...workbook,debts:[...workbook.debts,debt]});setCreditor('');setBalance('');setRate('');setMinimum('');setMessage('Debt added.');};
  return <section className="card form-grid"><div><p className="eyebrow">New debt</p><label>Creditor<input value={creditor} onChange={e=>setCreditor(e.target.value)}/></label><label>Balance<input type="number" min="0" value={balance} onChange={e=>setBalance(e.target.value)}/></label><label>Annual interest rate %<input type="number" min="0" value={rate} onChange={e=>setRate(e.target.value)} placeholder="Unknown"/></label><label>Minimum payment<input type="number" min="0" value={minimum} onChange={e=>setMinimum(e.target.value)}/></label><button className="primary" onClick={add}>Add debt</button>{message&&<p className="form-message">{message}</p>}</div><div><p className="eyebrow">Debt accounts</p>{workbook.debts.map(d=><div className="list-row" key={d.id}><div><strong>{d.creditor}</strong><small>{d.balance.toFixed(2)} · {d.interestRate == null ? 'Rate unknown' : `${d.interestRate}%`} · min {d.minimumPayment.toFixed(2)}</small></div><button className="icon" onClick={()=>onSave({...workbook,debts:workbook.debts.filter(x=>x.id!==d.id),debtPayments:workbook.debtPayments.filter(p=>p.debtId!==d.id)})}><Trash2 size={16}/></button></div>)}{!workbook.debts.length&&<p className="muted">No debt accounts yet.</p>}</div></section>;
}

function PaymentsView({ workbook, onSave }: { workbook: Product2Workbook; onSave: (w: Product2Workbook) => Promise<void> }) {
  const [debtId,setDebtId]=useState(workbook.debts[0]?.id||'');const [amount,setAmount]=useState('');const [message,setMessage]=useState('');
  const debt=workbook.debts.find(d=>d.id===debtId);const preview=debt?calculatePaymentAllocation(debt,Number(amount)||0):null;
  const add=async()=>{if(!debt||!Number.isFinite(Number(amount))||Number(amount)<=0){setMessage('Select a debt and enter a positive amount.');return;}const allocation=calculatePaymentAllocation(debt,Number(amount));const nextDebt={...debt,balance:Math.max(0,Math.round((debt.balance-allocation.principal)*100)/100),status:allocation.principal>=debt.balance?'paid':debt.status};await onSave({...workbook,debts:workbook.debts.map(d=>d.id===debt.id?nextDebt:d),debtPayments:[...workbook.debtPayments,{id:id('payment'),accountId:workbook.account.id,debtId:debt.id,date:today(),amount:allocation.total,principal:allocation.principal,interest:allocation.interest,fees:allocation.fees}]});setAmount('');setMessage(`Payment recorded: ${allocation.principal.toFixed(2)} principal, ${allocation.interest.toFixed(2)} interest.`);};
  return <section className="card"><p className="eyebrow">Debt payment</p>{workbook.debts.length?<><label>Debt<select value={debtId} onChange={e=>setDebtId(e.target.value)}>{workbook.debts.map(d=><option key={d.id} value={d.id}>{d.creditor}</option>)}</select></label><label>Requested payment<input type="number" min="0" value={amount} onChange={e=>setAmount(e.target.value)}/></label>{preview&&<div className="allocation"><span>Principal {preview.principal.toFixed(2)}</span><span>Interest {preview.interest.toFixed(2)}</span><span>Fees {preview.fees.toFixed(2)}</span><span>Total {preview.total.toFixed(2)}</span></div>}<button className="primary" onClick={add}>Record debt payment</button>{message&&<p className="form-message">{message}</p>}<div className="table">{workbook.debtPayments.map(p=><div className="list-row" key={p.id}><span>{p.date}</span><strong>{p.amount.toFixed(2)}</strong><small>{workbook.debts.find(d=>d.id===p.debtId)?.creditor} · principal {p.principal?.toFixed(2)}</small></div>)}</div></>:<p className="muted">Create a debt account first.</p>}</section>;
}

function PlannerView({ debts }: { debts: DebtAccount[] }) {
  const scenarios=['minimum','snowball','avalanche'] as const;return <section className="grid">{scenarios.map(strategy=>{const p=projectRepaymentScenario(debts,strategy);return <article className="card" key={strategy}><p className="eyebrow">{strategy}</p><h2>{p.payoffMonth==null?'Beyond horizon':`${p.payoffMonth} periods`}</h2><p>Total interest {p.totalInterest.toFixed(2)}</p><p>Total payments {p.totalPayments.toFixed(2)}</p><small>Payoff order: {p.order.length?p.order.join(' → '):'none'}</small></article>})}</section>;
}

function Dashboard({ workbook }: { workbook: Product2Workbook }) {
  const goalProgress=workbook.savingsGoals.map(g=>calculateSavingsProgress(g,workbook.savingsContributions));const savings=goalProgress.reduce((s,g)=>s+g.currentBalance,0);const debt=workbook.debts.reduce((s,d)=>s+d.balance,0);return <section className="grid"><article className="card"><p className="eyebrow">Savings</p><h2>{savings.toFixed(2)}</h2><p>{workbook.savingsGoals.length} goal(s), {goalProgress.filter(g=>g.completionPercentage===100).length} completed.</p></article><article className="card"><p className="eyebrow">Debt</p><h2>{debt.toFixed(2)}</h2><p>{workbook.debts.length} account(s), {workbook.debts.filter(d=>d.status==='paid').length} paid.</p></article></section>;
}

function SettingsView({ workbook, onSave }: { workbook: Product2Workbook; onSave: (w: Product2Workbook) => Promise<void> }) {
  const [currency,setCurrency]=useState(workbook.settings.currency);return <section className="card"><p className="eyebrow">Product 2 settings</p><label>Currency<input value={currency} onChange={e=>setCurrency(e.target.value.toUpperCase())}/></label><p className="muted">Interest convention: nominal annual · Payment timing: end of period · Minimum payment policy: configured minimum.</p><button className="primary" onClick={()=>onSave({...workbook,account:{...workbook.account,currency},settings:{...workbook.settings,currency}})}>Save settings</button></section>;
}
