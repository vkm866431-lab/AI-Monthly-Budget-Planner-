import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { api } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginSession, notify } = useExpense();

  const prefilledEmail =
    (location.state as { registeredEmail?: string } | null)?.registeredEmail || '';

  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotNotice, setForgotNotice] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.login({
        email: email.trim(),
        password,
        remember_me: rememberMe,
      });
      await loginSession(res.token, res.user, res.settings, rememberMe);
      notify('success', `Welcome back, ${res.user.full_name}.`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10 text-[#F8FAFC]"
      style={{
        backgroundColor: '#050B14',
        backgroundImage:
          'radial-gradient(circle at 50% 18%, rgba(16, 185, 129, 0.12) 0%, rgba(10, 22, 40, 0.45) 38%, rgba(5, 11, 20, 1) 75%)',
      }}
    >
      {/* Centered Brand Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#10B981] flex items-center justify-center shadow-[0_0_28px_rgba(16,185,129,0.35)] mb-3.5">
          <Wallet className="w-6 h-6 text-[#031B12]" strokeWidth={2.2} />
        </div>
        <h1 className="font-display text-2xl sm:text-[26px] font-bold tracking-tight leading-none">
          <span className="text-white">Budget</span>
          <span className="text-[#10B981]">Ledger</span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#94A3B8]">
          Personal Finance Management &amp; Monthly Budget Planner
        </p>
      </div>

      {/* Centered Auth Card */}
      <div className="w-full max-w-[440px] rounded-2xl border border-[#1E293B] bg-[#0B1221]/95 p-6 sm:p-7 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
        {/* 2-Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#060B16] border border-[#172236] p-1 mb-6">
          <Link
            to="/register"
            className="h-9 rounded-lg text-[#94A3B8] hover:text-white text-xs sm:text-sm font-medium flex items-center justify-center whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
          >
            Create Account
          </Link>
          <button
            type="button"
            aria-current="page"
            className="h-9 rounded-lg bg-[#10B981] text-[#031B12] text-xs sm:text-sm font-semibold flex items-center justify-center whitespace-nowrap shrink-0 shadow-xs"
          >
            Sign In
          </button>
        </div>

        {prefilledEmail && !error && (
          <div className="mb-4 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 px-3.5 py-2.5 text-xs text-[#34D399]">
            Account created successfully. Enter your password below to sign in.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 px-3.5 py-2.5 text-xs text-red-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email Address */}
          <div>
            <label
              htmlFor="login-email"
              className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5"
            >
              Email Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full h-11 rounded-xl border border-[#1E293B] bg-[#070D19] pl-10 pr-3.5 text-sm text-white placeholder:text-[#475569] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:border-[#10B981] transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password"
                className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]"
              >
                Password <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setForgotNotice((v) => !v)}
                className="text-xs font-medium text-[#10B981] hover:text-[#34D399] transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full h-11 rounded-xl border border-[#1E293B] bg-[#070D19] pl-10 pr-10 text-sm text-white placeholder:text-[#475569] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:border-[#10B981] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#64748B] hover:text-white rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {forgotNotice && (
            <div className="rounded-xl border border-[#1E293B] bg-[#070D19] px-3.5 py-2.5 flex items-start gap-2 text-xs text-[#94A3B8]">
              <Info className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <span>
                Automated email password recovery is disabled in local SQLite mode. You can update
                your password in Settings after signing in, or create a new account.
              </span>
            </div>
          )}

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-[#1E293B] bg-[#070D19] text-[#10B981] focus:ring-[#10B981]"
            />
            <span className="text-xs text-[#94A3B8]">Remember me on this device</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-1 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#031B12] text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-[0_8px_24px_rgba(16,185,129,0.22)] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1221]"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-[#031B12] border-t-transparent animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#172236] text-center">
          <p className="text-xs text-[#94A3B8]">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-[#10B981] hover:text-[#34D399] transition-colors"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>

      {/* Subtle Unboxed Footer */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-[#64748B]">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
          Private Account Ledger
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
          SQLite Persistence
        </span>
        <span aria-hidden="true">·</span>
        <span>BudgetLedger Secure Portal</span>
      </div>
    </div>
  );
}
