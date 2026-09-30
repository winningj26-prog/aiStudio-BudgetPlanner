import React, { useState } from 'react';
import { MailCheck, ShieldCheck } from 'lucide-react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

export const EmailConfirmationView: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get('token_hash');
  const type = params.get('type') as EmailOtpType | null;
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const verifyEmail = async () => {
    if (!tokenHash || type !== 'email') {
      setErrorMessage('This confirmation link is incomplete or invalid. Please request a new confirmation email.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      });
      if (error) throw error;
      setVerified(true);
    } catch (error: any) {
      setErrorMessage(error?.message || 'This confirmation link is invalid or has expired. Please request a new email.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-[#0b2b4f] to-[#081e36] p-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 p-6 text-center shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
          {verified ? <MailCheck className="h-7 w-7 text-emerald-300" /> : <ShieldCheck className="h-7 w-7 text-emerald-300" />}
        </div>

        {verified ? (
          <>
            <h1 className="text-2xl font-black text-white">Email verified</h1>
            <p className="mt-2 text-sm text-slate-300">Your BudgetPlanner account is confirmed. Continue to your workspace.</p>
            <button
              type="button"
              onClick={() => window.location.replace(window.location.origin)}
              className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              Continue to BudgetPlanner
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-white">Confirm your email</h1>
            <p className="mt-2 text-sm text-slate-300">Your confirmation link is ready. Click below to verify your email address.</p>
            <button
              type="button"
              onClick={verifyEmail}
              disabled={isVerifying}
              className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {isVerifying ? 'Verifying…' : 'Verify email address'}
            </button>
          </>
        )}

        {errorMessage && (
          <p className="mt-4 text-xs font-medium text-rose-300">{errorMessage}</p>
        )}
      </div>
    </div>
  );
};
