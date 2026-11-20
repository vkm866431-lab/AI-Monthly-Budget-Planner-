import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { api } from '../services/api';

interface FieldErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

function getPasswordStrength(pw: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  colorClass: string;
  textClass: string;
} {
  if (!pw) {
    return {
      score: 0,
      label: '',
      colorClass: 'bg-[#1E293B]',
      textClass: 'text-[#64748B]',
    };
  }

  let points = 0;
  if (pw.length >= 8) points += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) points += 1;
  if (/\d/.test(pw)) points += 1;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) points += 1;

  if (pw.length < 8 || points <= 1) {
    return {
      score: 1,
      label: 'Weak',
      colorClass: 'bg-[#EF4444]',
      textClass: 'text-red-400',
    };
  }
  if (points === 2) {
    return {
      score: 2,
      label: 'Fair',
      colorClass: 'bg-[#F59E0B]',
      textClass: 'text-amber-400',
    };
  }
  if (points === 3) {
    return {
      score: 3,
      label: 'Good',
      colorClass: 'bg-sky-400',
      textClass: 'text-sky-400',
    };
  }
  return {
    score: 4,
    label: 'Strong',
    colorClass: 'bg-[#10B981]',
    textClass: 'text-[#10B981]',
  };
}

export default function Register() {
  const navigate = useNavigate();
  const { notify } = useExpense();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  function validateForm(): boolean {
    const errors: FieldErrors = {};

    if (fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.';
    }
    if (phone.trim() && !/^[+\d\s()-]{7,20}$/.test(phone.trim())) {
      errors.phone = 'Please enter a valid phone number.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (password.length < 8) {
      errors.password = 'Password must contain at least 8 characters.';
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      await api.auth.register({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        role: 'B.Tech Student',
      });
      notify('success', 'Account created successfully! Please sign in to continue.');
      navigate('/login', {
        replace: true,
        state: { registeredEmail: email.trim() },
      });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Unable to create account.');
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
          <button
            type="button"
            aria-current="page"
            className="h-9 rounded-lg bg-[#10B981] text-[#031B12] text-xs sm:text-sm font-semibold flex items-center justify-center whitespace-nowrap shrink-0 shadow-xs"
          >
            Create Account
          </button>
          <Link
            to="/login"
            className="h-9 rounded-lg text-[#94A3B8] hover:text-white text-xs sm:text-sm font-medium flex items-center justify-center whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
          >
            Sign In
          </Link>
        </div>

        {serverError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 px-3.5 py-2.5 text-xs text-red-300"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Full Name */}
          <div>
            <label
              htmlFor="reg-fullname"
              className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5"
            >
              Full Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="reg-fullname"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: undefined }));
                }}
                placeholder="Enter your full name"
                className="w-full h-11 rounded-xl border border-[#1E293B] bg-[#070D19] pl-10 pr-3.5 text-sm text-white placeholder:text-[#475569] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:border-[#10B981] transition-colors"
              />
            </div>
            {fieldErrors.fullName && (
              <p className="mt-1.5 text-xs text-red-400">{fieldErrors.fullName}</p>
            )}
          </div>

          {/* Phone Number (Optional) */}
          <div>
            <label
              htmlFor="reg-phone"
              className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5"
            >
              Phone Number <span className="text-[#64748B] font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="reg-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined }));
                }}
                placeholder="Enter your phone number"
                className="w-full h-11 rounded-xl border border-[#1E293B] bg-[#070D19] pl-10 pr-3.5 text-sm text-white placeholder:text-[#475569] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:border-[#10B981] transition-colors"
              />
            </div>
            {fieldErrors.phone && (
              <p className="mt-1.5 text-xs text-red-400">{fieldErrors.phone}</p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label
              htmlFor="reg-email"
              className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5"
            >
              Email Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                }}
                placeholder="Enter your email address"
                className="w-full h-11 rounded-xl border border-[#1E293B] bg-[#070D19] pl-10 pr-3.5 text-sm text-white placeholder:text-[#475569] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:border-[#10B981] transition-colors"
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1.5 text-xs text-red-400">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="reg-password"
              className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5"
            >
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                }}
                placeholder="Create a secure password"
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

            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-1 rounded-sm transition-colors ${
                        strength.score >= step ? strength.colorClass : 'bg-[#1E293B]'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-medium ${strength.textClass}`}>
                    Strength: {strength.label}
                  </span>
                  <span className="text-[#64748B]">Min 8 chars, number &amp; symbol</span>
                </div>
              </div>
            )}

            {fieldErrors.password && (
              <p className="mt-1.5 text-xs text-red-400">{fieldErrors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="reg-confirm-password"
              className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5"
            >
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="reg-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
                  }
                }}
                placeholder="Re-enter password to confirm"
                className="w-full h-11 rounded-xl border border-[#1E293B] bg-[#070D19] pl-10 pr-10 text-sm text-white placeholder:text-[#475569] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:border-[#10B981] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#64748B] hover:text-white rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="mt-1.5 text-xs text-red-400">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#031B12] text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-[0_8px_24px_rgba(16,185,129,0.22)] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1221]"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-[#031B12] border-t-transparent animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#172236] text-center">
          <p className="text-xs text-[#94A3B8]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-[#10B981] hover:text-[#34D399] transition-colors"
            >
              Sign In here
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
