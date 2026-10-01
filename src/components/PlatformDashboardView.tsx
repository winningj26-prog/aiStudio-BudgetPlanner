import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, Save, Settings2, ShieldCheck, Smartphone } from 'lucide-react';
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

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100';

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

  if (loading || !config) {
    return <div className="min-h-screen bg-slate-950 p-8 text-slate-100"><div className="mx-auto max-w-5xl">Loading platform configuration…</div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Platform administration</p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Configuration dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">Centralize billing, payment channels, and integration credentials.</p>
          </div>
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to toolkit
          </button>
        </header>

        {message && <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200"><CheckCircle2 className="mr-2 inline h-4 w-4" />{message}</div>}
        {error && <div className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div>}

        <main className="grid gap-5 py-7 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3"><Settings2 className="h-5 w-5 text-cyan-300" /><div><h2 className="font-bold text-white">Plans & currency</h2><p className="text-xs text-slate-400">Amounts used by both payment flows.</p></div></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <label className="text-xs font-semibold text-slate-400">Currency<input className={inputClass} value={config.currency} onChange={e => update('currency', e.target.value)} /></label>
              <label className="text-xs font-semibold text-slate-400">Plus amount<input className={inputClass} type="number" min="1" step="1" value={config.plusAmount} onChange={e => update('plusAmount', Number(e.target.value))} /></label>
              <label className="text-xs font-semibold text-slate-400">Pro amount<input className={inputClass} type="number" min="1" step="1" value={config.proAmount} onChange={e => update('proAmount', Number(e.target.value))} /></label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3"><Smartphone className="h-5 w-5 text-emerald-300" /><div><h2 className="font-bold text-white">Mobile Money</h2><p className="text-xs text-slate-400">Displayed to customers for manual payment.</p></div></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-400">Provider<input className={inputClass} value={config.mobileMoneyProvider} onChange={e => update('mobileMoneyProvider', e.target.value)} /></label>
              <label className="text-xs font-semibold text-slate-400">Account name<input className={inputClass} value={config.mobileMoneyAccountName} onChange={e => update('mobileMoneyAccountName', e.target.value)} /></label>
              <label className="text-xs font-semibold text-slate-400 sm:col-span-2">Account / phone number<input className={inputClass} value={config.mobileMoneyAccountNumber} onChange={e => update('mobileMoneyAccountNumber', e.target.value)} /></label>
              <label className="text-xs font-semibold text-slate-400 sm:col-span-2">Payment instructions<textarea className={inputClass} rows={4} value={config.mobileMoneyInstructions} onChange={e => update('mobileMoneyInstructions', e.target.value)} /></label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-violet-300" /><div><h2 className="font-bold text-white">Monime</h2><p className="text-xs text-slate-400">Credentials are stored in Supabase Vault and never returned to the browser.</p></div></div>
            <div className="mt-4 grid gap-3">
              {[
                ['monimeAccessToken','Access token','monimeAccessTokenConfigured'],
                ['monimeSpaceId','Space ID','monimeSpaceIdConfigured'],
                ['monimeWebhookSecret','Webhook secret','monimeWebhookSecretConfigured'],
              ].map(([key,label,statusKey]) => (
                <label key={key} className="text-xs font-semibold text-slate-400">{label}<input className={inputClass} type="password" placeholder={config.secrets[statusKey] ? 'Configured — leave blank to keep it' : 'Not configured'} value={secrets[key as keyof typeof secrets]} onChange={e => setSecrets(s => ({ ...s, [key]: e.target.value }))} /></label>
              ))}
              <label className="text-xs font-semibold text-slate-400">API version<input className={inputClass} value={config.monimeApiVersion} onChange={e => update('monimeApiVersion', e.target.value)} /></label>
              <label className="text-xs font-semibold text-slate-400">Application base URL<input className={inputClass} value={config.appBaseUrl} onChange={e => update('appBaseUrl', e.target.value)} placeholder="https://your-app.example" /></label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-amber-300" /><div><h2 className="font-bold text-white">Other integrations</h2><p className="text-xs text-slate-400">Central place for credentials and provider readiness.</p></div></div>
            <div className="mt-4 grid gap-3">
              <label className="text-xs font-semibold text-slate-400">Gemini API key<input className={inputClass} type="password" placeholder={config.secrets.geminiApiKeyConfigured ? 'Configured — leave blank to keep it' : 'Not configured'} value={secrets.geminiApiKey} onChange={e => setSecrets(s => ({ ...s, geminiApiKey: e.target.value }))} /></label>
              <label className="text-xs font-semibold text-slate-400">Resend SMTP password<input className={inputClass} type="password" placeholder={config.secrets.resendSmtpPasswordConfigured ? 'Configured — leave blank to keep it' : 'Not configured'} value={secrets.resendSmtpPassword} onChange={e => setSecrets(s => ({ ...s, resendSmtpPassword: e.target.value }))} /></label>
              <div className="rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-slate-400">
                <p><span className="font-bold text-slate-300">Google / Supabase Auth:</span> authentication and Google Sheets OAuth remain managed by Supabase Auth. This dashboard does not expose client secrets.</p>
              </div>
            </div>
          </section>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <p className="text-xs text-slate-500">Last updated {config.updatedAt ? new Date(config.updatedAt).toLocaleString() : 'not yet saved'}.</p>
          <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save platform configuration'}
          </button>
        </footer>
      </div>
    </div>
  );
};
