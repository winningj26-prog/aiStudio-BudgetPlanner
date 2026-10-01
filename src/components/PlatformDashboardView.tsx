import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Globe2,
  KeyRound,
  Loader2,
  Save,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
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

  useEffect(() => { void load(); }, []);

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

  const configuredSecrets = useMemo(() => Object.values(config?.secrets ?? {}).filter(Boolean).length, [config]);

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" /> Toolkit
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Admin-only configuration
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-7 sm:px-6 lg:px-8 lg:pt-9">
        <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-950/10 sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-violet-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" /> Platform administration
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Configuration dashboard</h1>
              <p className="mt-2 text-sm leading-6 text-slate-300 sm:text-base">
                Manage plans, payment channels, application settings, and integration credentials from one secure place.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[390px]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Currency</p>
                <p className="mt-1 text-lg font-black">{config.currency || '—'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plans</p>
                <p className="mt-1 text-lg font-black">{config.plusAmount} / {config.proAmount}</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-3 sm:col-span-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Secrets</p>
                <p className="mt-1 text-lg font-black">{configuredSecrets} configured</p>
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" /> {message}
          </div>
        )}
        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /> {error}
          </div>
        )}

        <div className="mt-7 grid gap-5 lg:grid-cols-12">
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
      </main>

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
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.75 text-sm font-extrabold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving configuration…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
