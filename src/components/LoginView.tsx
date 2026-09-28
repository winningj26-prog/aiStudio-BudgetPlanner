import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn } from '../services/googleAuth';

interface LoginViewProps {
  initialEmail?: string;
  onLogin: (email: string) => void;
  onGoogleLogin?: (user: User, token: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  initialEmail = 'winningj26@gmail.com',
  onLogin,
  onGoogleLogin,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('password123');
  const [rememberMe, setRememberMe] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onLogin(email.trim());
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        if (onGoogleLogin) {
          onGoogleLogin(res.user, res.accessToken);
        } else {
          onLogin(res.user.email || 'Google User');
        }
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setErrorMessage(err.message || 'Could not complete Google Sign-In');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-[#0b2b4f] to-[#081e36] p-4 text-slate-100 selection:bg-blue-300 selection:text-slate-900">
      {/* Background glow accents */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* App Logo & Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 p-2 shadow-xl backdrop-blur-md border border-white/20">
            <svg
              viewBox="0 0 56 48"
              className="h-12 w-12 drop-shadow-md"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="28" cy="11" r="5" fill="#059669" />
              <path
                d="M17 19C17 11.268 23.268 5 31 5C38.732 5 45 11.268 45 19"
                stroke="#10b981"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M21 21C21 14.5 25.5 10 32 10"
                stroke="#047857"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <rect
                x="4"
                y="14"
                width="48"
                height="32"
                rx="9"
                fill="#0b3052"
              />
              <path
                d="M4 22H52"
                stroke="#16436f"
                strokeWidth="2"
              />
              <path
                d="M38 24H50C51.6569 24 53 25.3431 53 27V33C53 34.6569 51.6569 36 50 36H38C36.3431 36 35 34.6569 35 33V27C35 25.3431 36.3431 24 38 24Z"
                fill="#0b3052"
                stroke="#1d4d7a"
                strokeWidth="1.5"
              />
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

        {/* Login Card */}
        <div className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Sign In</h2>
              <p className="text-xs text-slate-300">
                Access your personal finance workbook
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-400/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Secure Session</span>
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-200">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-slate-900/60 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-400 shadow-inner focus:border-blue-400 focus:outline-hidden focus:ring-2 focus:ring-blue-400/30"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-200">
                  Password
                </label>
                <span className="text-[11px] text-blue-300">
                  Demo Protected
                </span>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-slate-900/60 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-400 shadow-inner focus:border-blue-400 focus:outline-hidden focus:ring-2 focus:ring-blue-400/30"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <span>Remember this device</span>
              </label>
              <span className="text-blue-300 hover:text-blue-200 cursor-pointer">
                Forgot password?
              </span>
            </div>

            <button
              type="submit"
              className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/40 hover:from-blue-500 hover:to-indigo-500 transition-all hover:scale-101 cursor-pointer"
            >
              <span>Sign In & Go to Home Page</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>

            {/* Google OAuth Sign-In Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/15" />
              </div>
              <span className="relative bg-slate-900/90 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-300 rounded-full">
                Or Connect with Google
              </span>
            </div>

            {/* Official Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/95 hover:bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-800 shadow-md transition-all hover:scale-101 cursor-pointer disabled:opacity-60"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.43 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.57 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>{isGoogleLoading ? 'Connecting Google Account...' : 'Sign in with Google'}</span>
            </button>

            {errorMessage && (
              <p className="mt-2 text-center text-xs font-medium text-rose-300">
                {errorMessage}
              </p>
            )}
          </form>

          <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Landing Page Routing:</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-300 leading-relaxed">
              Upon successful sign-in, you will land directly on the <strong>Home (Start Here)</strong> onboarding page outside the dashboard to review setup instructions or jump into your financial worksheets.
            </p>
          </div>
        </div>

        {/* Quick Demo Credentials Footer */}
        <div className="mt-6 text-center text-xs text-slate-400">
          <p>Logged-in demonstration account: <span className="font-semibold text-slate-200">{initialEmail}</span></p>
        </div>
      </div>
    </div>
  );
};
