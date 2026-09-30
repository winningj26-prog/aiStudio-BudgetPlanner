import React, { useState } from 'react';
import { ArrowRight, Mail, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import {
  googleSignIn,
  emailPasswordSignIn,
  emailPasswordSignUp,
  sendPasswordReset,
} from '../services/supabaseAuth';

interface LoginViewProps {
  onGoogleLogin: (user: User, token: string | null) => void;
}

type AuthMode = 'signIn' | 'signUp';

export const LoginView: React.FC<LoginViewProps> = ({ onGoogleLogin }) => {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const runAuth = async (action: () => Promise<unknown>) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await action();
      if (mode === 'signUp' && result && typeof result === 'object' && 'session' in result && !result.session) {
        setSuccessMessage('Account created. Check your email to confirm your address, then sign in.');
      }
    } catch (error: any) {
      console.error('Email authentication failed:', error);
      const messages: Record<string, string> = {
        'auth/invalid-credential': 'The email or password is incorrect.',
        'auth/email-already-in-use': 'An account already exists with this email. Try signing in.',
        'auth/weak-password': 'Choose a stronger password.',
        'auth/invalid-email': 'Enter a valid email address.',
        'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
      };
      setErrorMessage(messages[error?.code] || error?.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || password.length < 6) {
      setErrorMessage('Enter a valid email and a password of at least 6 characters.');
      return;
    }
    await runAuth(() =>
      mode === 'signUp'
        ? emailPasswordSignUp(email, password)
        : emailPasswordSignIn(email, password),
    );
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await googleSignIn();
    } catch (error: any) {
      console.error('Google Sign-In failed:', error);
      setErrorMessage(error?.message || 'Could not complete Google Sign-In.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      setErrorMessage('Enter your email address first.');
      return;
    }
    setIsResetting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await sendPasswordReset(email);
      setSuccessMessage('Password reset instructions have been sent to your email.');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not send the password reset email.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-[#0b2b4f] to-[#081e36] p-4 text-slate-100">
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-2 shadow-xl backdrop-blur-md">
            <ShieldCheck className="h-8 w-8 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Personal Monthly Budget Planner</h1>
          <p className="mt-1 text-xs font-medium tracking-wide text-blue-200 sm:text-sm">Plan Today • Track Spending • Save More • Reach Your Goals</p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">{mode === 'signIn' ? 'Sign In' : 'Create your account'}</h2>
            <p className="mt-1 text-xs text-slate-300">Choose Google or use your email and password.</p>
          </div>

          <button type="button" onClick={handleGoogleSignIn} disabled={isLoading} className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/95 px-4 py-3 text-sm font-bold text-slate-800 shadow-md transition hover:bg-white disabled:opacity-60">
            <span className="text-lg font-black">G</span>
            <span>{isLoading ? 'Working…' : 'Continue with Google'}</span>
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </button>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-slate-500">
            <div className="h-px flex-1 bg-white/10" />
            <span>or email</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Email
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-emerald-400" placeholder="you@example.com" />
              </div>
            </label>
            <label className="block text-xs font-semibold text-slate-300">
              Password
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'} className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-emerald-400" placeholder="At least 6 characters" />
              </div>
            </label>
            <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60">
              {isLoading ? 'Please wait…' : mode === 'signUp' ? 'Create account' : 'Sign in with email'}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs">
            <button type="button" onClick={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setErrorMessage(null); setSuccessMessage(null); }} className="font-semibold text-emerald-300 hover:text-emerald-200">
              {mode === 'signIn' ? 'Create an account' : 'Already have an account? Sign in'}
            </button>
            {mode === 'signIn' && (
              <button type="button" onClick={handleReset} disabled={isResetting} className="text-slate-400 hover:text-white">
                {isResetting ? 'Sending…' : 'Forgot password?'}
              </button>
            )}
          </div>

          {errorMessage && <p className="mt-4 text-center text-xs font-medium text-rose-300">{errorMessage}</p>}
          {successMessage && <p className="mt-4 text-center text-xs font-medium text-emerald-300">{successMessage}</p>}

          <div className="mt-6 rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-300"><Sparkles className="h-3.5 w-3.5" />New personal workspace</div>
            <p className="mt-1 text-[11px] leading-relaxed">After signing in, you will choose your name and Free, Plus, or Pro subscription before entering your workbook.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
