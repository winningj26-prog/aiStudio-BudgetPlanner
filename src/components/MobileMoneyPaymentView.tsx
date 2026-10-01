import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Copy, Loader2, Smartphone } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { ToolkitPlanId } from '../types/toolkit';
import { createManualPaymentRequest, getMobileMoneyPaymentInfo, loadManualPaymentStatus } from '../services/toolkitAccount';

interface MobileMoneyPaymentViewProps {
  user: User;
  planId: 'plus' | 'pro';
  onBack: () => void;
  onApproved: () => Promise<void> | void;
}

export const MobileMoneyPaymentView: React.FC<MobileMoneyPaymentViewProps> = ({ user, planId, onBack, onApproved }) => {
  const [info, setInfo] = useState<{ provider: string; accountName: string; accountNumber: string; instructions: string; amount: number; currency: string; mobileMoneyProviders?: Array<{ id: string; name: string; accountName: string; accountNumber: string; instructions: string; enabled: boolean }> } | null>(null);
  const [providerId, setProviderId] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [paymentInfo, paymentStatus] = await Promise.all([
          getMobileMoneyPaymentInfo(planId),
          loadManualPaymentStatus(user, planId),
        ]);
        if (cancelled) return;
        setInfo(paymentInfo);
        const providers = (paymentInfo.mobileMoneyProviders ?? []).filter((provider: any) => provider.enabled !== false);
        setProviderId(providers[0]?.id ?? '');
        if (paymentStatus) {
          setStatus(paymentStatus.status);
          setTransactionId(paymentStatus.transactionId ?? '');
          setPayerName(paymentStatus.payerName ?? '');
          if (paymentStatus.status === 'approved') await onApproved();
        }
      } catch (error) {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : 'Unable to load Mobile Money payment details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [planId, user, onApproved]);

  const submit = async () => {
    if (!transactionId.trim()) {
      setErrorMessage('Enter the Mobile Money transaction ID after making the payment.');
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await createManualPaymentRequest(user, planId, transactionId.trim(), payerName.trim(), providerId || undefined);
      setStatus(result.status);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit the payment transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProvider = info?.mobileMoneyProviders?.find((provider) => provider.id === providerId);
  const displayInfo = selectedProvider ?? info;

  const copyAccount = async () => {
    if (displayInfo?.accountNumber) await navigator.clipboard?.writeText(displayInfo.accountNumber);
  };

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center text-sm text-slate-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading payment instructions…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back</button>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-500/15 p-2"><Smartphone className="h-5 w-5 text-emerald-300" /></div><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Manual payment</p><h1 className="text-2xl font-black text-white">Pay with Mobile Money</h1></div></div>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">Make the payment using the instructions below, then submit the transaction ID. Your {planId === 'plus' ? 'Plus' : 'Pro'} subscription will remain pending until the payment is manually verified.</p>

          {info && (
            <div className="mt-6 rounded-xl border border-white/10 bg-slate-900 p-5">
              {info.mobileMoneyProviders && info.mobileMoneyProviders.length > 0 && <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Mobile Money provider<select value={providerId} onChange={(e) => setProviderId(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400">{info.mobileMoneyProviders.filter((provider) => provider.enabled !== false).map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Provider</p><p className="mt-1 font-semibold text-white">{selectedProvider?.name || info?.provider || 'Mobile Money'}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Amount</p><p className="mt-1 font-semibold text-emerald-300">{info.currency} {info.amount.toLocaleString()}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Account name</p><p className="mt-1 font-semibold text-white">{displayInfo?.accountName || 'Payment account'}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Account / phone number</p><div className="mt-1 flex items-center gap-2"><p className="font-semibold text-white">{displayInfo?.accountNumber || 'Not configured yet'}</p>{displayInfo?.accountNumber && <button type="button" onClick={() => void copyAccount()} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Copy payment number"><Copy className="h-4 w-4" /></button>}</div></div>
              </div>
              {(displayInfo?.instructions || info.instructions) && <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-relaxed text-slate-300">{displayInfo?.instructions || info.instructions}</p>}
            </div>
          )}

          {status === 'approved' ? (
            <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-300" /><h2 className="mt-3 font-bold text-white">Payment verified</h2><p className="mt-1 text-sm text-slate-400">Your subscription is active.</p></div>
          ) : status === 'pending' ? (
            <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-5"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 text-amber-300" /><div><h2 className="font-bold text-white">Payment submitted for verification</h2><p className="mt-1 text-sm text-slate-300">Transaction ID: <span className="font-semibold">{transactionId}</span></p><p className="mt-2 text-xs text-slate-400">We will activate your plan after the payment is verified.</p></div></div></div>
          ) : (
            <div className="mt-6 space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Your name (optional)<input value={payerName} onChange={(e) => setPayerName(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400" placeholder="Name used for the payment" /></label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Transaction ID<input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400" placeholder="Enter the Mobile Money transaction ID" /></label>
              <button type="button" onClick={() => void submit()} disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}Submit payment for verification</button>
            </div>
          )}
          {status === 'rejected' && <p className="mt-4 text-sm font-medium text-rose-300">The submitted transaction could not be verified. Please check the transaction ID and contact support before submitting another payment.</p>}
          {errorMessage && <p className="mt-4 text-sm font-medium text-rose-300">{errorMessage}</p>}
        </div>
      </div>
    </div>
  );
};
