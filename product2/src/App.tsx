import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CircleDollarSign, CreditCard, LayoutDashboard, Settings, Target, Trash2 } from 'lucide-react';
import type { DebtAccount, Product2Workbook, SavingsGoal } from './domain/types.js';
import { calculatePaymentAllocation, projectRepaymentScenario } from './domain/debt.js';
import { calculateSavingsProgress } from './domain/savings.js';
import { validateDebt, validateSavingsGoal } from './domain/validation.js';
import { SupabaseProduct2Repository } from './repository/SupabaseProduct2Repository.js';
import type { Product2Session } from './session/Product2Session.js';
import { getInitialProduct2AuthState, resolveProduct2Session, signOut } from './auth/Product2Auth.js';
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
  const [session, setSession] = useState<Product2Session | null>(null);
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
        if (!user) {
          if (!cancelled) window.location.assign('/');
          return;
        }
        const resolved = await resolveProduct2Session(user);
        if (!cancelled) setSession(resolved);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not restore the shared Toolkit account.');
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
        setSession(null);
        setWorkbook(null);
        window.location.assign('/');
        return;
      }
      void client.auth.getUser().then(async ({ data: userData, error: userError }) => {
        if (cancelled || userError || !userData.user) return;
        try {
          const resolved = await resolveProduct2Session(userData.user);
          if (!cancelled) setSession(resolved);
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Could not resolve shared account access.');
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
    const repo = new SupabaseProduct2Repository(session.accountId, session.displayName, session.email);
    repo.load().then(loaded => {
      if (loaded) setWorkbook(loaded);
      else setWorkbook(emptyWorkbook(session.accountId, session.displayName));
    }).catch(e => setError(e instanceof Error ? e.message : 'Could not load Product 2.'));
  }, [session]);
  const persist = async (next: Product2Workbook) => {
    if (!session) return;
    next.account.updatedAt = new Date().toISOString();
    const repo = new SupabaseProduct2Repository(session.accountId, session.displayName, session.email);
    await repo.save(next);
    setWorkbook(structuredClone(next));
  };

  const recordDebtPayment = async (payment: Parameters<SupabaseProduct2Repository['appendDebtPayment']>[0]) => {
    if (!session) return;
    const repo = new SupabaseProduct2Repository(session.accountId, session.displayName, session.email);
    await repo.appendDebtPayment(payment);
    const refreshed = await repo.load();
    if (refreshed) setWorkbook(refreshed);
  };

  if (!supabase || !authReady || authLoading) {
    if (!supabase) return <main className="setup"><article className="card setup-card"><div className="brand-mark">P2</div><h1>Product 2 cloud configuration required</h1><p>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> before starting the production app.</p></article></main>;
    return <main className="loading">Checking your account…</main>;
  }

  if (!session) return <AccountRequired />;
  if (session.productAccess !== 'active') return <ProductAccessRequired />;
  if (!workbook) return <main className="loading">Loading Product 2…</main>;

  const savings = workbook.savingsGoals.reduce((sum, goal) => sum + calculateSavingsProgress(goal, workbook.savingsContributions).currentBalance, 0);
  const debt = workbook.debts.reduce((sum, item) => sum + item.balance, 0);
  const planner = projectRepaymentScenario(workbook.debts, 'avalanche');

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">P2</div><div><strong>BudgetPlanner</strong><span>Product 2</span></div></div>
      <nav>{modules.map(([idValue, label, Icon]) => <button key={idValue} className={active === idValue ? 'nav-item active' : 'nav-item'} onClick={() => setActive(idValue)}><Icon size={18} /> {label}</button>)}</nav>
      <p className="independence">Independent tool<br />Uses the shared Toolkit account and database. Product 1 is not required at runtime.</p>
      <button className="signout" onClick={async () => { await signOut(); setSession(null); setWorkbook(null); }}>Sign out</button>
    </aside>
    <section className="content">
      <header><div><p className="eyebrow">Savings Goal and Debt Tracker</p><h1>{modules.find(([idValue]) => idValue === active)?.[1]}</h1><small>{session.email}</small></div><span className="pill">Shared account: {session.accountId.slice(0, 8)}…</span></header>
      {error && <div className="alert">{error}</div>}
      {active === 'start' && <Start workbook={workbook} savings={savings} debt={debt} payoff={planner.payoffMonth} />}
      {active === 'settings' && <SettingsView workbook={workbook} onSave={persist} />}
      {active === 'goals' && <GoalsView workbook={workbook} onSave={persist} />}
      {active === 'contributions' && <ContributionsView workbook={workbook} onSave={persist} />}
      {active === 'debts' && <DebtsView workbook={workbook} onSave={persist} />}
      {active === 'payments' && <PaymentsView workbook={workbook} onRecordPayment={recordDebtPayment} />}
      {active === 'planner' && <PlannerView debts={workbook.debts} />}
      {active === 'dashboard' && <Dashboard workbook={workbook} />}
    </section>
  </main>;
}

function AccountRequired() {
  return <main className="setup"><article className="card setup-card">
    <div className="brand-mark">P2</div>
    <p className="eyebrow">Toolkit account required</p>
    <h1>Sign in to the Toolkit first</h1>
    <p>Product 2 is an independent tool, but authentication is owned by the shared Toolkit account. Return to the Toolkit to sign in or complete onboarding.</p>
    <button className="primary" onClick={() => window.location.assign('/')}>Return to Toolkit</button>
  </article></main>;
}

function ProductAccessRequired() {
  return <main className="setup"><article className="card setup-card">
    <div className="brand-mark">P2</div>
    <p className="eyebrow">Product 2 access</p>
    <h1>This tool is not enabled for your account</h1>
    <p>Your authentication and subscription are managed by the Toolkit. Product 2 does not create a separate subscription or account.</p>
    <button className="primary" onClick={() => window.location.assign('/')}>Return to Toolkit</button>
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

function PaymentsView({ workbook, onRecordPayment }: { workbook: Product2Workbook; onRecordPayment: (payment: Parameters<SupabaseProduct2Repository['appendDebtPayment']>[0]) => Promise<void> }) {
  const [debtId,setDebtId]=useState(workbook.debts[0]?.id||'');const [amount,setAmount]=useState('');const [message,setMessage]=useState('');
  const debt=workbook.debts.find(d=>d.id===debtId);const preview=debt?calculatePaymentAllocation(debt,Number(amount)||0):null;
  const add=async()=>{if(!debt||!Number.isFinite(Number(amount))||Number(amount)<=0){setMessage('Select a debt and enter a positive amount.');return;}const allocation=calculatePaymentAllocation(debt,Number(amount));try{await onRecordPayment({id:id('payment'),accountId:workbook.account.id,debtId:debt.id,date:today(),amount:allocation.total,principal:allocation.principal,interest:allocation.interest,fees:allocation.fees});setAmount('');setMessage(`Payment recorded: ${allocation.principal.toFixed(2)} principal, ${allocation.interest.toFixed(2)} interest, ${allocation.fees.toFixed(2)} fees.`);}catch(e){setMessage(e instanceof Error?e.message:'Could not record the debt payment.');}};
  return <section className="card"><p className="eyebrow">Debt payment</p>{workbook.debts.length?<><label>Debt<select value={debtId} onChange={e=>setDebtId(e.target.value)}>{workbook.debts.map(d=><option key={d.id} value={d.id}>{d.creditor}</option>)}</select></label><label>Requested payment<input type="number" min="0" value={amount} onChange={e=>setAmount(e.target.value)}/></label>{preview&&<div className="allocation"><span>Principal {preview.principal.toFixed(2)}</span><span>Interest {preview.interest.toFixed(2)}</span><span>Fees {preview.fees.toFixed(2)}</span><span>Total {preview.total.toFixed(2)}</span></div>}<button className="primary" onClick={add}>Record debt payment</button>{message&&<p className="form-message">{message}</p>}<div className="table">{workbook.debtPayments.map(p=><div className="list-row" key={p.id}><span>{p.date}</span><strong>{p.amount.toFixed(2)}</strong><small>{workbook.debts.find(d=>d.id===p.debtId)?.creditor} · principal {p.principal?.toFixed(2)}</small></div>)}</div></>:<p className="muted">Create a debt account first.</p>}</section>;
}
function PlannerView({ debts }: { debts: DebtAccount[] }) {
  const scenarios=['minimum','snowball','avalanche'] as const;return <section className="grid">{scenarios.map(strategy=>{const p=projectRepaymentScenario(debts,strategy);return <article className="card" key={strategy}><p className="eyebrow">{strategy}</p><h2>{p.payoffMonth==null?'Beyond horizon':`${p.payoffMonth} periods`}</h2><p>Total interest {p.totalInterest.toFixed(2)}</p><p>Total payments {p.totalPayments.toFixed(2)}</p><small>Payoff order: {p.order.length?p.order.join(' → '):'none'}</small></article>})}</section>;
}

function Dashboard({ workbook }: { workbook: Product2Workbook }) {
  const goalProgress=workbook.savingsGoals.map(g=>calculateSavingsProgress(g,workbook.savingsContributions));const savings=goalProgress.reduce((s,g)=>s+g.currentBalance,0);const debt=workbook.debts.reduce((s,d)=>s+d.balance,0);return <section className="grid"><article className="card"><p className="eyebrow">Savings</p><h2>{savings.toFixed(2)}</h2><p>{workbook.savingsGoals.length} goal(s), {goalProgress.filter(g=>g.completionPercentage===100).length} completed.</p></article><article className="card"><p className="eyebrow">Debt</p><h2>{debt.toFixed(2)}</h2><p>{workbook.debts.length} account(s), {workbook.debts.filter(d=>d.status==='paid').length} paid.</p></article></section>;
}

function SettingsView({ workbook, onSave }: { workbook: Product2Workbook; onSave: (w: Product2Workbook) => Promise<void> }) {
  const [currency, setCurrency] = useState(workbook.settings.currency);
  const [message, setMessage] = useState('');

  return <section className="card">
    <p className="eyebrow">Product 2 settings</p>
    <label>Currency<input value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())}/></label>
    <p className="muted">Interest convention: nominal annual · Payment timing: end of period · Minimum payment policy: configured minimum.</p>
    <p className="muted">Authentication, subscription, and app access are managed by the shared Toolkit account.</p>
    <button className="primary" onClick={async () => {
      try {
        await onSave({...workbook, account:{...workbook.account,currency}, settings:{...workbook.settings,currency}});
        setMessage('Settings saved.');
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Could not save settings.');
      }
    }}>Save settings</button>
    {message && <p className="form-message">{message}</p>}
  </section>;
}
