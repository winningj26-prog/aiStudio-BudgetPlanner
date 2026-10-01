import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  CircleAlert,
  Coins,
  CreditCard,
  Filter,
  Globe2,
  History,
  KeyRound,
  Loader2,
  Save,
  Search,
  Settings2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { getAuthAccessToken } from '../services/supabaseAuth';

type PlatformConfig = {
  currency: string;
  plusAmount: number;
  proAmount: number;
  mobileMoneyProvider: string;
  mobileMoneyAccountName: string;
  mobileMoneyAccountNumber: string;
  mobileMoneyInstructions: string;
  monimeApiVersion: string;
  appBaseUrl: string;
  integrationSettings: Record<string, unknown>;
  secrets: Record<string, boolean>;
  updatedBy: string | null;
  updatedAt: string | null;
};

interface Props { onBack: () => void; }

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.75 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10';

const sectionClass =
  'rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5';

const labelClass = 'text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500';

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({
  label,
  hint,
  children,
  className = '',
}) => (
  <label className={`block ${className}`}>
    <span className={labelClass}>{label}</span>
    {children}
    {hint && <span className="mt-1.5 block text-xs leading-5 text-slate-400">{hint}</span>}
  </label>
);

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}> = ({ icon, eyebrow, title, description }) => (
  <div className="flex items-start gap-3.5">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-600">{eyebrow}</p>
      <h2 className="mt-0.5 text-lg font-extrabold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">{description}</p>
    </div>
  </div>
);

const StatusPill: React.FC<{ active: boolean; activeLabel?: string; inactiveLabel?: string }> = ({
  active,
  activeLabel = 'Configured',
  inactiveLabel = 'Not configured',
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
      active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
    }`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
    {active ? activeLabel : inactiveLabel}
  </span>
);

export const PlatformDashboardView: React.FC<Props> = ({ onBack }) => {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'payments' | 'config' | 'audits'>('overview');

  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secrets, setSecrets] = useState({
    monimeAccessToken: '',
    monimeSpaceId: '',
    monimeWebhookSecret: '',
    geminiApiKey: '',
    resendSmtpPassword: '',
  });

  // Comprehensive Admin Lists States
  const [users, setUsers] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, { email: string, display_name: string | null }>>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Review interaction state
  const [decisionNote, setDecisionNote] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewLoading, setReviewingLoading] = useState(false);

  // User search/filter state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState<'all' | 'free' | 'plus' | 'pro'>('all');

  // Account Override and Management States
  const [selectedUserForManage, setSelectedUserForManage] = useState<any | null>(null);
  const [managePlanId, setManagePlanId] = useState<'free' | 'plus' | 'pro'>('free');
  const [manageOnboardingCompleted, setManageOnboardingCompleted] = useState(false);
  const [manageAppAccess, setManageAppAccess] = useState<Record<string, boolean>>({
    'budget-planner': true,
    'app-2': false,
    'app-3': false,
    'app-4': false,
  });
  const [manageSaving, setManageSaving] = useState(false);
  const [manageReason, setManageReason] = useState('');

  const handleSaveUserOverride = async () => {
    if (!selectedUserForManage) return;
    setManageSaving(true);
    setMessage(null);
    setError(null);
    try {
      const token = await getAuthAccessToken();
      const response = await fetch('/api/platform/users/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: selectedUserForManage.id,
          planId: managePlanId,
          onboardingCompleted: manageOnboardingCompleted,
          appAccess: manageAppAccess,
          reason: manageReason,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Failed to apply overrides.');

      setMessage(`Account overrides applied successfully for ${selectedUserForManage.email}`);
      setSelectedUserForManage(null);
      await loadLists();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to apply account overrides.');
    } finally {
      setManageSaving(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthAccessToken();
      const response = await fetch('/api/platform/config', { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to load platform configuration.');
      setConfig(body.config);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load platform configuration.');
    } finally {
      setLoading(false);
    }
  };

  const loadLists = async () => {
    setListsLoading(true);
    try {
      const token = await getAuthAccessToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Load users list, payment request queue, and audit logs in parallel
      const [usersRes, paymentsRes, auditsRes] = await Promise.all([
        fetch('/api/platform/users', { headers }),
        fetch('/api/platform/payment-requests', { headers }),
        fetch('/api/platform/audit-logs', { headers })
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.profiles || []);
        setSubscriptions(data.subscriptions || []);
      }
      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPaymentRequests(data.requests || []);
        const pMap: Record<string, { email: string, display_name: string | null }> = {};
        for (const p of data.profiles || []) {
          pMap[p.id] = { email: p.email, display_name: p.display_name };
        }
        setProfilesMap(pMap);
      }
      if (auditsRes.ok) {
        const data = await auditsRes.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load lists:', err);
    } finally {
      setListsLoading(false);
      setLastRefreshedAt(new Date());
    }
  };

  useEffect(() => {
    void load();
    void loadLists();
  }, []);

  const update = <K extends keyof PlatformConfig>(key: K, value: PlatformConfig[K]) => {
    setConfig((current) => current ? { ...current, [key]: value } : current);
    setMessage(null);
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const token = await getAuthAccessToken();
      const response = await fetch('/api/platform/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...config, ...secrets }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to save platform configuration.');
      setMessage('Platform configuration saved securely.');
      setSecrets({ monimeAccessToken: '', monimeSpaceId: '', monimeWebhookSecret: '', geminiApiKey: '', resendSmtpPassword: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save platform configuration.');
    } finally {
      setSaving(false);
    }
  };

  // Mobile Money subscription reviewer handler
  const handleReviewPayment = async (requestId: string, decision: 'approve' | 'reject') => {
    setReviewingLoading(true);
    setMessage(null);
    setError(null);
    try {
      const token = await getAuthAccessToken();
      const response = await fetch('/api/billing/mobile-money/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          requestId,
          decision,
          reviewerNote: decisionNote
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Failed to complete payment review.');
      
      setMessage(`Payment request ${decision === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setDecisionNote('');
      setReviewingId(null);
      await loadLists();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to review subscription payment.');
    } finally {
      setReviewingLoading(false);
    }
  };

  const configuredSecrets = useMemo(() => Object.values(config?.secrets ?? {}).filter(Boolean).length, [config]);

  // Derived Admin Aggregations
  const totalUsersCount = users.length;
  const activePremiumCount = useMemo(() => {
    return subscriptions.filter(s =>
      (s.status === 'active' || s.status === 'trialing') && s.plan_id !== 'free'
    ).length;
  }, [subscriptions]);

  const subscriptionByUser = useMemo(() => {
    const map: Record<string, any> = {};
    for (const subscription of subscriptions) {
      const current = map[subscription.user_id];
      if (!current) {
        map[subscription.user_id] = subscription;
        continue;
      }
      const currentEnd = current.current_period_end ? new Date(current.current_period_end).getTime() : 0;
      const nextEnd = subscription.current_period_end ? new Date(subscription.current_period_end).getTime() : 0;
      if (subscription.status === 'active' && current.status !== 'active') {
        map[subscription.user_id] = subscription;
      } else if (subscription.status === current.status && nextEnd > currentEnd) {
        map[subscription.user_id] = subscription;
      }
    }
    return map;
  }, [subscriptions]);

  const pendingPaymentsCount = useMemo(() => {
    return paymentRequests.filter(r => r.status === 'pending').length;
  }, [paymentRequests]);

  const totalCollectedRevenue = useMemo(() => {
    return paymentRequests
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + (r.amount_value || 0), 0);
  }, [paymentRequests]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const sub = subscriptionByUser[u.id];
      const plan = sub?.plan_id || 'free';
      const matchesSearch = 
        u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.display_name?.toLowerCase().includes(userSearchQuery.toLowerCase());
      
      if (userPlanFilter !== 'all' && plan !== userPlanFilter) return false;
      return matchesSearch;
    });
  }, [users, subscriptionByUser, userSearchQuery, userPlanFilter]);

  if (loading || !config) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-600" /> Loading platform configuration…
          </div>
        </div>
      </div>
    );
  }

  const mobileMoneyReady = Boolean(
    config.mobileMoneyProvider && config.mobileMoneyAccountName && config.mobileMoneyAccountNumber,
  );
  const monimeReady = Boolean(
    config.secrets.monimeAccessTokenConfigured &&
    config.secrets.monimeSpaceIdConfigured &&
    config.secrets.monimeWebhookSecretConfigured,
  );
  const configuredIntegrations = [
    mobileMoneyReady,
    monimeReady,
    Boolean(config.secrets.geminiApiKeyConfigured),
    Boolean(config.secrets.resendSmtpPasswordConfigured),
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-cyan-200">
      {/* 1. Header Bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 text-slate-500" /> Back to Toolkit
            </button>
            <div className="flex items-center gap-2 text-xs font-black uppercase text-cyan-600 tracking-wider">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
              Platform Superadmin Mode
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Overview banner */}
      <div className="bg-slate-950 border-b border-slate-800 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" /> Superadmin Central Control
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white">Platform Administration</h1>
              <p className="mt-1 text-sm text-slate-400">
                Manage global settings, verify mobile money billing ledger snapshots, audits, and profile state.
              </p>
            </div>
            
            {/* Quick stats grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[480px]">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">Total Users</p>
                <p className="mt-1.5 text-base font-black text-white">{totalUsersCount}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">Premium Plans</p>
                <p className="mt-1.5 text-base font-black text-cyan-300">{activePremiumCount} active</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 relative">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">Pending Reviews</p>
                <p className={`mt-1.5 text-base font-black ${pendingPaymentsCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-300'}`}>
                  {pendingPaymentsCount} requests
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">Approved Payments</p>
                <p className="mt-1.5 text-base font-black text-emerald-400">Le {totalCollectedRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main tabbed panel navigation */}
      <div className="flex border-b border-slate-200 bg-white shadow-2xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex gap-6 overflow-x-auto scrollbar-none">
            {[
              { id: 'overview', label: 'Metrics Overview', icon: <Sparkles className="h-4.5 w-4.5" /> },
              { id: 'users', label: 'User Directory', icon: <Users className="h-4.5 w-4.5" /> },
              { id: 'payments', label: 'Manual Payments Queue', icon: <Smartphone className="h-4.5 w-4.5" /> },
              { id: 'config', label: 'Platform Config', icon: <Settings2 className="h-4.5 w-4.5" /> },
              { id: 'audits', label: 'Audit Logs', icon: <History className="h-4.5 w-4.5" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setMessage(null);
                  setError(null);
                }}
                className={`flex items-center gap-2 border-b-2 py-4 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-cyan-600 text-cyan-600 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'payments' && pendingPaymentsCount > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-white shrink-0">
                    {pendingPaymentsCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Content Area */}
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        
        {/* Success/Error Banners */}
        {message && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-800 animate-in fade-in duration-100">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> {message}
          </div>
        )}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-semibold text-rose-800 animate-in fade-in duration-100">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" /> {error}
          </div>
        )}

        {listsLoading && (
          <div className="flex items-center justify-center p-8 text-slate-500 text-xs gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-600" /> Loading latest ledger transactions & profiles...
          </div>
        )}

        {/* -------------------- OVERVIEW TAB -------------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Metrics Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-3xs flex items-center gap-4">
                <div className="p-3 bg-cyan-50 text-cyan-700 rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">Registered Accounts</span>
                  <span className="text-xl font-black text-slate-900 mt-1 block">{totalUsersCount} users</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-3xs flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Coins className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">Premium Conversions</span>
                  <span className="text-xl font-black text-slate-900 mt-1 block">{activePremiumCount} premium</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-3xs flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">Pending Mobile Money</span>
                  <span className="text-xl font-black text-slate-900 mt-1 block">{pendingPaymentsCount} waiting</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-3xs flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">Configured Integrations</span>
                  <span className="text-xl font-black text-slate-900 mt-1 block">{configuredIntegrations} / 4 ready</span>
                </div>
              </div>
            </div>

            {/* Quick Stats list split */}
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Left Column: Recent Signups */}
              <div className={`${sectionClass} lg:col-span-6 p-5 sm:p-6`}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
                  <h3 className="font-extrabold text-slate-900 text-sm">Recent Registered Users</h3>
                  <button onClick={() => setActiveTab('users')} className="text-xs font-bold text-cyan-600 hover:text-cyan-700">View All</button>
                </div>
                <div className="divide-y divide-slate-100 space-y-2">
                  {users.slice(0, 5).map(u => {
                    const sub = subscriptionByUser[u.id];
                    const plan = sub?.plan_id || 'free';
                    return (
                      <div key={u.id} className="pt-2 pb-1.5 flex items-center justify-between text-xs gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{u.display_name || 'No Name'}</p>
                          <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            plan === 'pro'
                              ? 'bg-violet-100 text-violet-700 border border-violet-200'
                              : plan === 'plus'
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {plan}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(u.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {users.length === 0 && (
                    <p className="text-slate-400 text-xs text-center py-4">No users registered yet.</p>
                  )}
                </div>
              </div>

              {/* Right Column: Pending Mobile Money Requests */}
              <div className={`${sectionClass} lg:col-span-6 p-5 sm:p-6`}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
                  <h3 className="font-extrabold text-slate-900 text-sm">Pending Payments Review Queue</h3>
                  <button onClick={() => setActiveTab('payments')} className="text-xs font-bold text-cyan-600 hover:text-cyan-700">Go to Queue</button>
                </div>
                <div className="space-y-3">
                  {paymentRequests.filter(r => r.status === 'pending').slice(0, 4).map(req => {
                    const u = profilesMap[req.user_id] || { email: 'Unknown Email', display_name: 'Unknown User' };
                    return (
                      <div key={req.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.25 bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider rounded border border-amber-200">
                              {req.plan_id}
                            </span>
                            <span className="font-black text-slate-800 truncate">{u.display_name || u.email}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 font-mono truncate">TxID: {req.transaction_id}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Submitted: {new Date(req.created_at).toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => {
                            setReviewingId(req.id);
                            setActiveTab('payments');
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                        >
                          Review Now
                        </button>
                      </div>
                    );
                  })}
                  {paymentRequests.filter(r => r.status === 'pending').length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      <Check className="mx-auto h-8 w-8 text-emerald-500" />
                      <p className="mt-2 font-semibold text-slate-600">All payments are fully reviewed!</p>
                      <p className="text-[10px] mt-0.5">There are no pending manual payments left in queue.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={`${sectionClass} p-5 sm:p-6`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Platform Readiness</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Operational configuration at a glance. Secret values remain hidden.</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  {lastRefreshedAt && <span>Updated {lastRefreshedAt.toLocaleTimeString()}</span>}
                  <button
                    type="button"
                    onClick={() => { void load(); void loadLists(); }}
                    disabled={listsLoading || loading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${listsLoading || loading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Mobile Money', mobileMoneyReady, 'Payment instructions are customer-ready.'],
                  ['Monime', monimeReady, 'Gateway credentials are stored in Vault.'],
                  ['Gemini', Boolean(config.secrets.geminiApiKeyConfigured), 'AI integration credential is configured.'],
                  ['Resend', Boolean(config.secrets.resendSmtpPasswordConfigured), 'SMTP credential is configured.'],
                ].map(([label, ready, description]) => (
                  <div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-800">{String(label)}</span>
                      <StatusPill active={Boolean(ready)} />
                    </div>
                    <p className="mt-2 text-[10px] leading-4 text-slate-500">{String(description)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* -------------------- USER DIRECTORY TAB -------------------- */}
        {activeTab === 'users' && (
          <div className={`${sectionClass} p-5 sm:p-6`}>
            {/* Title & Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="font-black text-slate-900 text-base">User Directory & Entitlement Dashboard</h3>
                <p className="text-xs text-slate-500 mt-0.5">List of users registered on this workspace and their active subscription tiers.</p>
              </div>

              {/* Filtering Controls */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Search query box */}
                <div className="relative min-w-44">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold placeholder-slate-400 focus:outline-hidden focus:border-cyan-500"
                  />
                  {userSearchQuery && (
                    <button onClick={() => setUserSearchQuery('')} className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-slate-600">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Plan select filter */}
                <div className="flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <select
                    value={userPlanFilter}
                    onChange={(e) => setUserPlanFilter(e.target.value as any)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 cursor-pointer focus:outline-hidden"
                  >
                    <option value="all">All Plans</option>
                    <option value="free">Free Plan</option>
                    <option value="plus">Plus Tier</option>
                    <option value="pro">Pro Tier</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Main Interactive Directory Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] font-black">
                    <th className="py-3 px-2">Account Owner</th>
                    <th className="py-3 px-2">Account Email</th>
                    <th className="py-3 px-2">Registered Date</th>
                    <th className="py-3 px-2">Onboarding</th>
                    <th className="py-3 px-2">Subscription Tier</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(u => {
                    const sub = subscriptions.find(s => s.user_id === u.id);
                    const plan = sub?.plan_id || 'free';
                    const subStatus = sub?.status || 'active';
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-2 font-bold text-slate-900">{u.display_name || 'No Name'}</td>
                        <td className="py-3 px-2 text-slate-500 font-medium">{u.email}</td>
                        <td className="py-3 px-2 text-slate-400 font-mono">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            u.onboarding_completed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {u.onboarding_completed ? 'Completed' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              plan === 'pro'
                                ? 'bg-violet-100 text-violet-700 border border-violet-200'
                                : plan === 'plus'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              {plan}
                            </span>
                            {plan !== 'free' && (
                              <span className="text-[10px] text-slate-400 font-medium capitalize">({subStatus})</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button
                            onClick={() => {
                              setSelectedUserForManage(u);
                              setManagePlanId(plan as any);
                              setManageOnboardingCompleted(u.onboarding_completed);
                              setManageAppAccess({
                                'budget-planner': true,
                                'app-2': false,
                                'app-3': false,
                                'app-4': false,
                              });
                              setManageReason('');
                            }}
                            className="px-2.5 py-1 text-cyan-600 hover:bg-cyan-50 font-bold rounded cursor-pointer transition-colors"
                          >
                            Manage Account
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">No matching accounts found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------- MANUAL PAYMENTS REVIEW QUEUE TAB -------------------- */}
        {activeTab === 'payments' && (
          <div className="grid gap-6 lg:grid-cols-12">
            
            {/* Left Column: Payments List */}
            <div className={`${sectionClass} lg:col-span-7 p-5 sm:p-6`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
                <div>
                  <h3 className="font-black text-slate-900 text-base">Mobile Money Billing Requests</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Reviews submitted transaction receipts for paid Plus and Pro tiers.</p>
                </div>
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider rounded-full">
                  {paymentRequests.filter(r => r.status === 'pending').length} pending review
                </span>
              </div>

              {/* Request List divided by Status */}
              <div className="space-y-3">
                {paymentRequests.map(req => {
                  const u = profilesMap[req.user_id] || { email: 'Unknown Email', display_name: 'Unknown User' };
                  const isPending = req.status === 'pending';
                  const isSelected = reviewingId === req.id;

                  return (
                    <div
                      key={req.id}
                      onClick={() => isPending && setReviewingId(req.id)}
                      className={`p-4 border rounded-xl transition-all ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-50/20 shadow-xs'
                          : isPending
                          ? 'border-amber-200 bg-amber-50/15 cursor-pointer hover:bg-amber-50/30'
                          : 'border-slate-200 bg-white opacity-85'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded ${
                              req.plan_id === 'pro'
                                ? 'bg-violet-100 text-violet-700 border border-violet-200'
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}>
                              {req.plan_id}
                            </span>
                            <span className="font-extrabold text-slate-900 truncate">
                              {u.display_name || 'No Name'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 truncate">{u.email}</p>
                          <div className="mt-2.5 space-y-1 font-medium text-[11px] text-slate-600">
                            <p className="font-mono">Transaction ID: <strong className="text-slate-800 font-extrabold">{req.transaction_id}</strong></p>
                            {req.payer_name && <p>Payer Name Submitted: <strong>{req.payer_name}</strong></p>}
                            <p>Amount Sent: <strong>{req.currency} {req.amount_value.toLocaleString()}</strong></p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            req.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : req.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                          }`}>
                            {req.status}
                          </span>
                          <p className="text-[9px] text-slate-400 mt-2 font-mono">
                            {new Date(req.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Display reviewer details if reviewed */}
                      {!isPending && (
                        <div className="mt-3.5 pt-3 border-t border-dashed border-slate-100 text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-lg space-y-1">
                          <p className="font-bold text-slate-700">Reviewer Logs:</p>
                          <p>Reviewed By: <strong className="text-slate-700">{req.reviewed_by}</strong></p>
                          <p>Reviewed On: <strong className="text-slate-700">{new Date(req.reviewed_at).toLocaleString()}</strong></p>
                          {req.reviewer_note && <p>Reviewer Notes: <strong className="text-slate-700 italic">"{req.reviewer_note}"</strong></p>}
                        </div>
                      )}
                    </div>
                  );
                })}
                {paymentRequests.length === 0 && (
                  <p className="text-center text-slate-400 py-8 text-xs font-semibold">No payment requests submitted yet.</p>
                )}
              </div>
            </div>

            {/* Right Column: Interactive Verdict Panel */}
            <div className="lg:col-span-5 space-y-6">
              <div className={`${sectionClass} p-5 sm:p-6`}>
                <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                  <Smartphone className="h-4.5 w-4.5 text-cyan-600" />
                  Review Verdict Terminal
                </h4>

                {reviewingId ? (() => {
                  const req = paymentRequests.find(r => r.id === reviewingId);
                  const u = profilesMap[req?.user_id || ''] || { email: 'Unknown Email', display_name: 'Unknown User' };
                  if (!req) return null;

                  return (
                    <div className="space-y-4 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-1.5">
                        <p>Request ID: <span className="font-mono text-slate-900 select-all font-bold">{req.id}</span></p>
                        <p>User: <strong className="text-slate-950 font-black">{u.display_name || u.email}</strong></p>
                        <p>Tier Requested: <strong className="text-cyan-700 uppercase">{req.plan_id}</strong></p>
                        <p>Stated Transaction ID: <strong className="text-slate-950 font-mono font-bold select-all">{req.transaction_id}</strong></p>
                      </div>

                      <div className="space-y-2">
                        <label className="block font-bold text-slate-700">Reviewer Notes (Required for audit)</label>
                        <textarea
                          rows={3}
                          placeholder="e.g. Verified Orange Money transaction matching TxID on ledger. Approved."
                          value={decisionNote}
                          onChange={(e) => setDecisionNote(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-cyan-500 focus:outline-hidden"
                        />
                      </div>

                      {/* Decison Action Buttons */}
                      <div className="grid grid-cols-2 gap-2.5 pt-2">
                        <button
                          type="button"
                          disabled={reviewLoading}
                          onClick={() => handleReviewPayment(req.id, 'reject')}
                          className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Ban className="h-4 w-4 shrink-0" /> Reject Request
                        </button>
                        <button
                          type="button"
                          disabled={reviewLoading}
                          onClick={() => handleReviewPayment(req.id, 'approve')}
                          className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {reviewLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          ) : (
                            <Check className="h-4 w-4 shrink-0" />
                          )}
                          Approve payment
                        </button>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="text-center py-10 text-slate-400">
                    <Smartphone className="mx-auto h-8 w-8 text-slate-300 animate-bounce" />
                    <p className="mt-3 font-semibold text-slate-600 text-xs">Select a Pending Payment</p>
                    <p className="text-[10px] mt-0.5">Click any pending Mobile Money card on the left queue to open the review panel.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -------------------- CONFIG TAB -------------------- */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="grid gap-5 lg:grid-cols-12">
              <section className={`${sectionClass} lg:col-span-7`}>
                <div className="border-b border-slate-100 p-5 sm:p-6">
                  <SectionHeader
                    icon={<CreditCard className="h-5 w-5" />}
                    eyebrow="Billing"
                    title="Plans & currency"
                    description="Set the amounts shown to customers and used by the billing flows."
                  />
                </div>
                <div className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
                  <Field label="Currency" hint="Three-letter payment currency code.">
                    <input className={inputClass} value={config.currency} onChange={e => update('currency', e.target.value.toUpperCase())} />
                  </Field>
                  <Field label="Plus amount">
                    <input className={inputClass} type="number" min="1" step="1" value={config.plusAmount} onChange={e => update('plusAmount', Number(e.target.value))} />
                  </Field>
                  <Field label="Pro amount">
                    <input className={inputClass} type="number" min="1" step="1" value={config.proAmount} onChange={e => update('proAmount', Number(e.target.value))} />
                  </Field>
                </div>
              </section>

              <section className={`${sectionClass} lg:col-span-5`}>
                <div className="border-b border-slate-100 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <SectionHeader
                      icon={<Smartphone className="h-5 w-5" />}
                      eyebrow="Payments"
                      title="Mobile Money"
                      description="Customer-facing manual payment details."
                    />
                    <StatusPill active={mobileMoneyReady} />
                  </div>
                </div>
                <div className="grid gap-5 p-5 sm:p-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Provider">
                      <input className={inputClass} value={config.mobileMoneyProvider} onChange={e => update('mobileMoneyProvider', e.target.value)} placeholder="e.g. Orange Money" />
                    </Field>
                    <Field label="Account name">
                      <input className={inputClass} value={config.mobileMoneyAccountName} onChange={e => update('mobileMoneyAccountName', e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Account / phone number">
                    <input className={inputClass} value={config.mobileMoneyAccountNumber} onChange={e => update('mobileMoneyAccountNumber', e.target.value)} />
                  </Field>
                  <Field label="Payment instructions" hint="Keep these short and explicit for customers.">
                    <textarea className={inputClass} rows={4} value={config.mobileMoneyInstructions} onChange={e => update('mobileMoneyInstructions', e.target.value)} />
                  </Field>
                </div>
              </section>

              <section className={`${sectionClass} lg:col-span-7`}>
                <div className="border-b border-slate-100 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <SectionHeader
                      icon={<KeyRound className="h-5 w-5" />}
                      eyebrow="Payments"
                      title="Monime"
                      description="Optional gateway configuration. Secret values are stored in Supabase Vault."
                    />
                    <StatusPill active={monimeReady} />
                  </div>
                </div>
                <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                  {[
                    ['monimeAccessToken','Access token','monimeAccessTokenConfigured'],
                    ['monimeSpaceId','Space ID','monimeSpaceIdConfigured'],
                    ['monimeWebhookSecret','Webhook secret','monimeWebhookSecretConfigured'],
                  ].map(([key,label,statusKey]) => (
                    <Field
                      key={key}
                      label={label}
                      hint={config.secrets[statusKey] ? 'Configured. Leave blank to keep the existing secret.' : 'No value stored yet.'}
                    >
                      <input
                        className={inputClass}
                        type="password"
                        placeholder={config.secrets[statusKey] ? 'Configured — leave blank' : 'Enter secret'}
                        value={secrets[key as keyof typeof secrets]}
                        onChange={e => setSecrets(s => ({ ...s, [key]: e.target.value }))}
                      />
                    </Field>
                  ))}
                  <Field label="API version">
                    <input className={inputClass} value={config.monimeApiVersion} onChange={e => update('monimeApiVersion', e.target.value)} />
                  </Field>
                  <Field label="Application base URL" className="sm:col-span-2" hint="Used when a provider needs to return users to the application.">
                    <div className="relative">
                      <Globe2 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input className={`${inputClass} pl-9`} value={config.appBaseUrl} onChange={e => update('appBaseUrl', e.target.value)} placeholder="https://your-app.example" />
                    </div>
                  </Field>
                </div>
              </section>

              <section className={`${sectionClass} lg:col-span-5`}>
                <div className="border-b border-slate-100 p-5 sm:p-6">
                  <SectionHeader
                    icon={<Settings2 className="h-5 w-5" />}
                    eyebrow="Integrations"
                    title="Other services"
                    description="Manage optional credentials without exposing their values in the browser."
                  />
                </div>
                <div className="grid gap-5 p-5 sm:p-6">
                  <Field
                    label="Gemini API key"
                    hint={config.secrets.geminiApiKeyConfigured ? 'Configured. Leave blank to keep the existing key.' : 'No key stored yet.'}
                  >
                    <input className={inputClass} type="password" placeholder={config.secrets.geminiApiKeyConfigured ? 'Configured — leave blank' : 'Enter API key'} value={secrets.geminiApiKey} onChange={e => setSecrets(s => ({ ...s, geminiApiKey: e.target.value }))} />
                  </Field>
                  <Field
                    label="Resend SMTP password"
                    hint={config.secrets.resendSmtpPasswordConfigured ? 'Configured. Leave blank to keep the existing password.' : 'No password stored yet.'}
                  >
                    <input className={inputClass} type="password" placeholder={config.secrets.resendSmtpPasswordConfigured ? 'Configured — leave blank' : 'Enter SMTP password'} value={secrets.resendSmtpPassword} onChange={e => setSecrets(s => ({ ...s, resendSmtpPassword: e.target.value }))} />
                  </Field>
                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                      <div>
                        <p className="text-sm font-bold text-cyan-950">Authentication stays with Supabase</p>
                        <p className="mt-1 text-xs leading-5 text-cyan-800/80">
                          Google sign-in, sessions, and Google Sheets OAuth are managed by Supabase Auth. Client secrets are not exposed here.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Bottom floating Save banner for config edits */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {config.updatedAt ? `Last saved ${new Date(config.updatedAt).toLocaleString()}` : 'Configuration has not been saved yet.'}
                  </p>
                  <p className="hidden text-[11px] text-slate-400 sm:block">Changes are applied to platform settings after you save.</p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.75 text-sm font-extrabold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Saving configuration…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- AUDIT LOGS TAB -------------------- */}
        {activeTab === 'audits' && (
          <div className={`${sectionClass} p-5 sm:p-6`}>
            <div className="border-b border-slate-100 pb-3.5 mb-4">
              <h3 className="font-black text-slate-900 text-base">Configuration Audit Trail</h3>
              <p className="text-xs text-slate-500 mt-0.5">Durable, un-editable audit entries tracking updates made to critical system parameters.</p>
            </div>
            
            {/* Audit Logs Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] font-black">
                    <th className="py-3 px-2">Log ID</th>
                    <th className="py-3 px-2">Administrator</th>
                    <th className="py-3 px-2">Module/Section</th>
                    <th className="py-3 px-2">Edited Fields</th>
                    <th className="py-3 px-2">Edit Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-2 font-mono text-[10px] text-slate-400 select-all">{log.id}</td>
                      <td className="py-3 px-2 font-bold text-slate-900">{log.admin_email}</td>
                      <td className="py-3 px-2">
                        <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 capitalize">
                          {log.section}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-medium text-slate-600 max-w-sm truncate">
                        {Array.isArray(log.changed_fields)
                          ? log.changed_fields.join(', ')
                          : typeof log.changed_fields === 'object'
                          ? Object.keys(log.changed_fields).join(', ')
                          : String(log.changed_fields || '—')}
                      </td>
                      <td className="py-3 px-2 text-slate-400 font-mono">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400 font-medium">No audit entries logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Manage User Overrides Modal overlay */}
        {selectedUserForManage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto text-slate-900">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-cyan-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">Account Override Panel</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUserForManage(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* User info */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-600">
                  <p>Display Name: <strong className="text-slate-900">{selectedUserForManage.display_name || 'No Name'}</strong></p>
                  <p>Email Address: <strong className="text-slate-900 font-mono select-all">{selectedUserForManage.email}</strong></p>
                  <p>Unique Profile ID: <span className="font-mono text-slate-400 select-all">{selectedUserForManage.id}</span></p>
                </div>

                {/* Onboarding completed */}
                <div className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl bg-white shadow-2xs">
                  <div>
                    <h4 className="font-bold text-slate-800">Complete Onboarding</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Toggle to bypass onboarding flows and activate app launcher.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manageOnboardingCompleted}
                      onChange={(e) => setManageOnboardingCompleted(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Plan Tier Override Dropdown */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Manual Plan Override</label>
                  <select
                    value={managePlanId}
                    onChange={(e) => setManagePlanId(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 cursor-pointer focus:outline-hidden focus:border-cyan-500"
                  >
                    <option value="free">Free Tier (Local only)</option>
                    <option value="plus">Plus Tier (Sheets & Cloud Sync)</option>
                    <option value="pro">Pro Tier (AI Spending Insights & Advanced Analytics)</option>
                  </select>
                </div>

                {/* Required audit reason */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Override Reason (required)</label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={manageReason}
                    onChange={(e) => setManageReason(e.target.value)}
                    placeholder="Explain why this account needs a manual entitlement or subscription override."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-medium text-slate-900 focus:border-cyan-500 focus:outline-hidden"
                  />
                  <p className="text-[10px] leading-4 text-slate-400">This reason is stored with the administrator audit record.</p>
                </div>

                {/* App Entitlements Toggle privileges */}
                <div className="space-y-2">
                  <label className="block font-bold text-slate-700">Launcher Application Access</label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { id: 'budget-planner', name: 'BudgetPlanner' },
                      { id: 'app-2', name: 'Toolkit App 2' },
                      { id: 'app-3', name: 'Toolkit App 3' },
                      { id: 'app-4', name: 'Toolkit App 4' },
                    ].map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-2.5 border border-slate-200 bg-slate-50/50 rounded-xl">
                        <span className="font-semibold text-slate-700 text-[11px]">{app.name}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(manageAppAccess[app.id])}
                            onChange={(e) => setManageAppAccess((prev) => ({ ...prev, [app.id]: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3.5 mt-5 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedUserForManage(null)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={manageSaving || manageReason.trim().length < 5}
                  onClick={() => void handleSaveUserOverride()}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {manageSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <Check className="h-4 w-4 shrink-0" />
                  )}
                  Apply Overrides
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
