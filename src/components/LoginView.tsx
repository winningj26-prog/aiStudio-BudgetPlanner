import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn } from '../services/googleAuth';

interface LoginViewProps {
  onGoogleLogin: (user: User, token: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onGoogleLogin }) => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);

    try {
      const res = await googleSignIn();
      if (res) {
        onGoogleLogin(res.user, res.accessToken);
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setErrorMessage(err.message || 'Could not complete Google Sign-In');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-[#0b2b4f] to-[#081e36] p-4 text-slate-100">
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 p-2 shadow-xl backdrop-blur-md border border-white/20">
            <svg viewBox="0 0 56 48" className="h-12 w-12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="11" r="5" fill="#059669" />
              <path d="M17 19C17 11.268 23.268 5 31 5C38.732 5 45 11.268 45 19" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
              <rect x="4" y="14" width="48" height="32" rx="9" fill="#0b3052" />
              <path d="M4 22H52" stroke="#16436f" strokeWidth="2" />
              <circle cx="44" cy="30" r="3" fill="#ffffff" />
              <circle cx="44" cy="30" r="1.5" fill="#0b3052" />
              <rect x="1" y="22" width="3" height="12" rx="1.5" fill="#00a86b" />
            </svg>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Personal Monthly Budget Planner
          </h1>
          <p className="mt-1 text-xs font-medium tracking-wide text-blue-200 sm:text-sm">
            Plan Today • Track Spending • Save More • Reach Your Goals
          </p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Sign In</h2>
              <p className="text-xs text-slate-300">Use your Google account to access your personal workbook.</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-400/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Google Secure</span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/95 hover:bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-md transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-60"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.43 7.33 24 12 24z" />
              <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.17 0 9.99 1.25 5.42l4.03-3.13z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.57 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z" />
            </svg>
            <span>{isGoogleLoading ? 'Connecting Google Account...' : 'Continue with Google'}</span>
            {!isGoogleLoading && <ArrowRight className="h-4 w-4" />}
          </button>

          {errorMessage && (
            <p className="mt-3 text-center text-xs font-medium text-rose-300">{errorMessage}</p>
          )}

          <div className="mt-6 rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>New personal workspace</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed">
              Your financial workbook starts empty. Add your own income, expenses, budgets, savings goals, and debts after signing in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
