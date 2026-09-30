import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { supabaseSignOut } from '../services/supabaseAuth';
import { supabase } from '../services/supabaseClient';

type Props = {
  onComplete: () => void;
};

export const PasswordRecoveryView: React.FC<Props> = ({ onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setErrorMessage('Choose a password of at least 6 characters.');
      return;
    }
    if (password !== confirmation) {
      setErrorMessage('The passwords do not match.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccessMessage('Your password has been updated. You can sign in with the new password.');
      await supabaseSignOut();
      window.setTimeout(onComplete, 900);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not update your password. Please request a new reset email.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-[#0b2b4f] to-[#081e36] p-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
            <ShieldCheck className="h-7 w-7 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-black text-white">Set a new password</h1>
          <p className="mt-2 text-sm text-slate-300">Choose a new password for your BudgetPlanner account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-300">
            New password
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-emerald-400"
                placeholder="At least 6 characters"
              />
            </div>
          </label>

          <label className="block text-xs font-semibold text-slate-300">
            Confirm password
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                type="password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-emerald-400"
                placeholder="Enter it again"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {isSaving ? 'Updating…' : 'Update password'}
          </button>
        </form>

        {errorMessage && <p className="mt-4 text-center text-xs font-medium text-rose-300">{errorMessage}</p>}
        {successMessage && <p className="mt-4 text-center text-xs font-medium text-emerald-300">{successMessage}</p>}
      </div>
    </div>
  );
};
