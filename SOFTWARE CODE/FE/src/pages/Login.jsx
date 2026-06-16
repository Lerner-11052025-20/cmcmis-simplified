// ============================================================================
// src/pages/Login.jsx  —  Authentication entry point (the ONLY public page)
// ----------------------------------------------------------------------------
// LAYOUT: Two-panel split-screen terminal specifically styled for ISRO SAC.
// - Left: 50% width, ISRO SAC space-grade branding, scope animation, and clean
//   high-contrast space status badges in bold Google-standard typography.
// - Right: 50% width, glassmorphic sign-in box over drafting blueprint grid.
//
// VIEWPORT BEHAVIOR:
// - h-screen max-h-screen overflow-hidden locks the layout from scrolling,
//   creating a professional fixed telemetry kiosk workstation.
//
// POST-LOGIN POPUP:
// - Displays a highly polished centered overlay welcoming the user for 
//   exactly 2 seconds, with their name and employee ID in badge formats.
// - Features an interactive top-right close icon (X) and uses 100% Google 
//   standard sans-serif (Inter) typography.
//
// VALIDATION:
// - Zod schema attached via react-hook-form zodResolver.
// - Integrates shake animations on validation and credentials errors.
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  ArrowRight, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldAlert,
  X,
  CheckCircle2,
  Circle
} from 'lucide-react';

import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { FormField } from '../components/ui/FormField.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useAuth } from '../lib/auth-context.jsx';
import { api } from '../lib/api-client.js';
import { loginSchema } from '../lib/schemas/loginSchema.js';
import isroLogo from '../assets/isro-logo.svg';

// NOTE — authorship credit is rendered globally by the watchdog (loaded via
// the side-effect import in src/main.jsx). It paints itself in the
// bottom-right corner and is self-healing. No inline credit on this page.

const PASSWORD_RULES = [
  { key: 'upper', label: 'Capital letter', test: (value) => /[A-Z]/.test(value) },
  { key: 'lower', label: 'Small letter', test: (value) => /[a-z]/.test(value) },
  { key: 'number', label: 'Number', test: (value) => /[0-9]/.test(value) },
  { key: 'special', label: 'Special character', test: (value) => /[^A-Za-z0-9]/.test(value) },
];

function getPasswordStrength(password) {
  const ruleScore = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  const lengthScore = password.length >= 12 ? 2 : password.length >= 8 ? 1 : 0;
  const score = Math.min(5, ruleScore + lengthScore);

  if (score <= 1) return { label: 'Weak', width: '20%', bar: 'bg-red-500', text: 'text-red-600' };
  if (score <= 3) return { label: 'Fair', width: '45%', bar: 'bg-amber-500', text: 'text-amber-600' };
  if (score === 4) return { label: 'Good', width: '70%', bar: 'bg-sky-500', text: 'text-sky-600' };
  return { label: 'Strong', width: '100%', bar: 'bg-emerald-500', text: 'text-emerald-600' };
}

export function Login() {
  const { login, ssoEmployeeLogin, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Top-of-form server error message (e.g. "Invalid credentials" from BE).
  // Distinct from per-field zod errors which RHF tracks separately.
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSsoOpen, setIsSsoOpen] = useState(false);
  const [ssoEmployeeId, setSsoEmployeeId] = useState('');
  const [ssoError, setSsoError] = useState('');
  const [isSsoSubmitting, setIsSsoSubmitting] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmployeeId, setForgotEmployeeId] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotConfirm, setForgotConfirm] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
  
  // Track active form submission state to prevent the boot-time useEffect
  // from immediately redirecting when the context user hydrates.
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const forgotRuleStates = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(forgotPassword),
  }));
  const forgotStrength = getPasswordStrength(forgotPassword);
  const forgotPasswordLongEnough = forgotPassword.length >= 8;
  const forgotPasswordMatches = forgotConfirm.length > 0 && forgotPassword === forgotConfirm;
  const canSubmitForgot =
    forgotEmployeeId.trim().length > 0 &&
    forgotPasswordLongEnough &&
    forgotRuleStates.every((rule) => rule.passed) &&
    forgotPasswordMatches &&
    !isForgotSubmitting;

  // ── Already-signed-in redirect ─────────────────────────────────────
  // If a user re-visits /login after a silent refresh succeeded, send
  // them straight to the dashboard. Wait for `loading` to settle first.
  // We gate this with isLoggingIn to prevent active sign-in form submits
  // from getting hijacked before showing the welcome popup.
  useEffect(() => {
    if (!loading && user && !isLoggingIn) {
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    }
  }, [loading, user, isLoggingIn, location.state, navigate]);

  /** @param {{ employee_id: string, password: string }} values */
  async function onSubmit(values) {
    setServerError('');
    setIsLoggingIn(true);
    try {
      await login(values.employee_id, values.password);
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      setIsLoggingIn(false);
      // Form/Card shake error feedback trigger
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      const apiMessage =
        err?.response?.data?.error?.message ||
        (err?.response?.status === 429
          ? 'Too many attempts. Please try again later.'
          : 'Sign-in failed. Please try again.');
      setServerError(apiMessage);
    }
  }

  // Handle client-side Zod validation errors to trigger field shake
  const onValidationError = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  async function onSsoSubmit(event) {
    event.preventDefault();
    const employeeId = ssoEmployeeId.trim().toUpperCase();
    if (!employeeId) {
      setSsoError('Employee ID is required');
      return;
    }

    setSsoError('');
    setIsSsoSubmitting(true);
    setIsLoggingIn(true);
    try {
      await ssoEmployeeLogin(employeeId);
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      setIsLoggingIn(false);
      const apiMessage =
        err?.response?.data?.error?.message ||
        (err?.response?.status === 429
          ? 'Too many attempts. Please try again later.'
          : 'SSO sign-in failed. Please try again.');
      setSsoError(apiMessage);
    } finally {
      setIsSsoSubmitting(false);
    }
  }

  function openForgotPassword() {
    setForgotEmployeeId((getValues('employee_id') || '').trim());
    setForgotPassword('');
    setForgotConfirm('');
    setShowForgotPassword(false);
    setShowForgotConfirm(false);
    setForgotError('');
    setForgotSuccess('');
    setIsForgotOpen(true);
  }

  async function onForgotSubmit(event) {
    event.preventDefault();
    if (!canSubmitForgot) {
      setForgotError('Please complete all password requirements before submitting.');
      return;
    }

    setForgotError('');
    setForgotSuccess('');
    setIsForgotSubmitting(true);
    try {
      await api.post('/auth/forgot-password', {
        employee_id: forgotEmployeeId.trim(),
        new_password: forgotPassword,
        confirm_password: forgotConfirm,
      });
      setForgotSuccess('Password updated successfully. You can sign in with the new password.');
      setForgotPassword('');
      setForgotConfirm('');
    } catch (err) {
      const validationDetails = err?.response?.data?.error?.details;
      const firstValidationMessage = Array.isArray(validationDetails)
        ? validationDetails[0]?.message
        : null;
      const apiMessage =
        firstValidationMessage ||
        err?.response?.data?.error?.message ||
        (err?.response?.status === 429
          ? 'Too many attempts. Please try again later.'
          : 'Password reset failed. Please try again.');
      setForgotError(apiMessage);
    } finally {
      setIsForgotSubmitting(false);
    }
  }

  // While the silent refresh is in flight, render a centred spinner so
  // we don't flash the form just to hide it a tick later.
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-base">
        <Spinner size={28} className="text-ink-soft" />
      </main>
    );
  }

  return (
    <main className="h-screen max-h-screen overflow-hidden grid grid-cols-1 lg:grid-cols-2 bg-base select-none relative">
      
      {/* Left panel: mission identity and orbital visual only. Login box is untouched. */}
      <div className="hidden lg:flex bg-white border-r border-slate-200 flex-col justify-between px-12 py-10 xl:px-16 h-full relative overflow-hidden">
        <div className="absolute inset-0 technical-grid-bg opacity-60 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-orange-400" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-sky-100 bg-white shadow-sm">
              <svg className="h-8 w-8 text-sky-600" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="6" className="opacity-25" />
                <path d="M50 86 L58 50 L50 14" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
                <ellipse cx="50" cy="50" rx="42" ry="15" fill="none" stroke="currentColor" strokeWidth="3" transform="rotate(-18 50 50)" className="opacity-60" />
                <circle cx="24" cy="39" r="6" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-[0.22em] text-slate-900 uppercase font-sans">
                ISRO SAC
              </h2>
              <p className="text-[10px] font-sans font-semibold text-slate-500 tracking-[0.18em] uppercase">
                Space Applications Centre
              </p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Secure Portal
          </span>
        </div>

        <div className="relative z-10 my-auto grid gap-8">
          <div className="mx-auto flex h-[200px] w-[200px] items-center justify-center rounded-2xl border border-slate-100 bg-white/70 shadow-[0_18px_48px_rgba(15,23,42,0.07)] backdrop-blur-sm">
            <svg
              viewBox="0 0 320 320"
              className="h-[200px] w-[200px] text-indigo-500 select-none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="loginOrbit" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#a5b4fc" />
                  <stop offset="55%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
              <line x1="160" y1="14" x2="160" y2="306" stroke="currentColor" strokeWidth="1.5" className="opacity-20" />
              <line x1="14" y1="160" x2="306" y2="160" stroke="currentColor" strokeWidth="1.5" className="opacity-20" />
              <circle cx="160" cy="160" r="116" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
              <circle cx="160" cy="160" r="78" fill="none" stroke="currentColor" strokeWidth="3" className="opacity-35" />
              <circle cx="160" cy="160" r="46" fill="none" stroke="url(#loginOrbit)" strokeWidth="5" className="opacity-85" />
              <ellipse cx="160" cy="160" rx="117" ry="36" fill="none" stroke="url(#loginOrbit)" strokeWidth="2.5" transform="rotate(-18 160 160)" className="opacity-45 animate-spin-slow" style={{ transformOrigin: '160px 160px' }} />
              <ellipse cx="160" cy="160" rx="130" ry="33" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(-36 160 160)" className="opacity-25" />
              <g className="animate-spin-slow" style={{ transformOrigin: '160px 160px' }}>
                <line x1="160" y1="160" x2="139" y2="292" stroke="url(#loginOrbit)" strokeWidth="6" strokeLinecap="round" />
                <circle cx="139" cy="292" r="12" fill="url(#loginOrbit)" />
              </g>
              <circle cx="70" cy="121" r="15" fill="url(#loginOrbit)" className="opacity-70 animate-pulse" />
              <circle cx="160" cy="160" r="13" fill="url(#loginOrbit)" className="opacity-55 animate-pulse-radar" />
              <circle cx="160" cy="160" r="5" fill="#ffffff" className="opacity-90" />
            </svg>
          </div>

          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-700">
              CMCMIS Mission Console
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">
              Calibration &amp; Maintenance Management System
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm font-medium leading-7 text-slate-500">
              A secure operational suite for instrument records, job requests,
              calibration workflows, equipment verification, and audit-ready
              maintenance control.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          <span>CMCMIS Simplified</span>
          <span>Authenticated Access Only</span>
        </div>
      </div>

      {/* ── RIGHT PANEL: Standard Glassmorphic Sign-In Box (50% Width) ── */}
      <div className="col-span-1 flex items-center justify-center p-8 bg-base technical-grid-bg relative h-full">
        <div className="w-full max-w-md relative z-10 animate-fade-in">
          {/* On mobile: Render a smaller hero mark since the left panel is hidden */}
          <div className="text-center mb-6 select-none flex flex-col items-center lg:hidden">
            <div className="relative mb-2">
              <svg viewBox="0 0 100 100" className="w-12 h-12 text-accent" aria-hidden="true">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" className="animate-spin-slow opacity-60" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-40" />
                <line x1="50" y1="2" x2="50" y2="98" stroke="currentColor" strokeWidth="0.5" className="opacity-20" />
                <line x1="2" y1="50" x2="98" y2="50" stroke="currentColor" strokeWidth="0.5" className="opacity-20" />
                <circle cx="50" cy="20" r="4" fill="currentColor" className="animate-pulse" />
                <circle cx="50" cy="50" r="6" fill="currentColor" className="animate-pulse-radar" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-wider text-slate-800 flex items-center gap-1 font-sans">
              <span>CMCMIS</span>
              <span className="text-accent animate-pulse">·</span>
            </h1>
            <p className="mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">
              ISRO Space Applications Centre
            </p>
          </div>

          {/* ── Card ── */}
          <div
            className={`bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-[0_20px_50px_rgba(47,53,69,0.05)] p-7 relative overflow-hidden transition-transform duration-300 ${
              isShaking ? 'animate-shake border-danger/40 shadow-danger/5' : ''
            }`}
          >
            {/* Subtle decorative color border header */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent/30 via-accent to-accent/30" />

            <div className="mb-5 flex justify-center">
              <img
                src={isroLogo}
                alt="ISRO"
                className="h-20 w-auto object-contain"
                draggable="false"
              />
            </div>

            <h2 className="text-lg font-bold text-slate-800 mb-5 tracking-tight font-sans">Sign In</h2>

            <form
              onSubmit={handleSubmit(onSubmit, onValidationError)}
              noValidate
              className="space-y-4"
            >
              {/* Employee ID */}
              <FormField
                label="Employee ID"
                error={errors.employee_id?.message}
                htmlFor="employee_id"
              >
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-accent transition-colors">
                    <User size={18} strokeWidth={1.75} />
                  </span>
                  <Input
                    id="employee_id"
                    autoComplete="username"
                    spellCheck={false}
                    autoFocus
                    className="pl-9 pr-3 focus:ring-accent/25 focus:ring-offset-0 focus:border-accent font-sans text-slate-800"
                    invalid={Boolean(errors.employee_id)}
                    {...register('employee_id')}
                  />
                </div>
              </FormField>

              {/* Password */}
              <FormField
                label="Password"
                error={errors.password?.message}
                htmlFor="password"
              >
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-accent transition-colors">
                    <Lock size={18} strokeWidth={1.75} />
                  </span>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    spellCheck={false}
                    className="pl-9 pr-9 focus:ring-accent/25 focus:ring-offset-0 focus:border-accent font-sans text-slate-800"
                    invalid={Boolean(errors.password)}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-800 transition-colors focus:outline-none focus-visible:text-accent"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff size={18} strokeWidth={1.75} />
                    ) : (
                      <Eye size={18} strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </FormField>

              <div className="-mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-xs font-semibold text-accent hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-sm"
                >
                  Forgot password?
                </button>
              </div>

              {/* Server error banner */}
              {serverError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg bg-danger/10 border border-danger/15 text-danger text-xs px-3.5 py-2.5 animate-fade-in"
                >
                  <ShieldAlert size={16} strokeWidth={1.75} className="shrink-0 mt-0.5" />
                  <span className="leading-normal font-medium font-sans">{serverError}</span>
                </div>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                className="w-full shimmer-effect shadow-md shadow-accent/10 hover:shadow-accent/20 active:translate-y-[0.5px] transition-all duration-150 flex items-center justify-center gap-2 font-sans"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner size={14} className="text-white" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>

            {/* ── Divider + SSO placeholder ─ */}
            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-border/60" />
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold font-sans">or</span>
              <div className="flex-1 h-px bg-border/60" />
            </div>

            <Button
              variant="secondary"
              className="w-full border border-border/80 text-slate-700 hover:text-slate-800 flex items-center justify-center gap-2 font-sans"
              type="button"
              onClick={() => {
                setSsoEmployeeId('');
                setSsoError('');
                setIsSsoOpen(true);
              }}
            >
              <span className="text-xs font-semibold">Continue with SSO</span>
            </Button>

            {/* Compliance footer */}
            <p className="mt-6 text-[10px] text-slate-500 text-center leading-normal max-w-xs mx-auto font-sans font-medium">
              🔒 SECURE TERMINAL · Authorized Personnel Only<br />
              All sign-in attempts are monitored and audited.
            </p>
          </div>
        </div>
      </div>

      {isForgotOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/70 bg-white p-5 shadow-2xl animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-sans">Forgot password</h3>
                <p className="mt-1 text-xs font-medium text-slate-500 font-sans">
                  Set a new password for your Employee ID.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                title="Close"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={onForgotSubmit} className="mt-5 space-y-4">
              <FormField label="Employee ID" htmlFor="forgot_employee_id">
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-accent transition-colors">
                    <User size={18} strokeWidth={1.75} />
                  </span>
                  <Input
                    id="forgot_employee_id"
                    value={forgotEmployeeId}
                    onChange={(event) => {
                      setForgotEmployeeId(event.target.value);
                      setForgotError('');
                      setForgotSuccess('');
                    }}
                    autoComplete="username"
                    spellCheck={false}
                    className="pl-9 pr-3 focus:ring-accent/25 focus:ring-offset-0 focus:border-accent font-sans text-slate-800"
                  />
                </div>
              </FormField>

              <FormField label="New password" htmlFor="forgot_new_password">
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-accent transition-colors">
                    <Lock size={18} strokeWidth={1.75} />
                  </span>
                  <Input
                    id="forgot_new_password"
                    type={showForgotPassword ? 'text' : 'password'}
                    value={forgotPassword}
                    onChange={(event) => {
                      setForgotPassword(event.target.value);
                      setForgotError('');
                      setForgotSuccess('');
                    }}
                    autoComplete="new-password"
                    spellCheck={false}
                    className="pl-9 pr-9 focus:ring-accent/25 focus:ring-offset-0 focus:border-accent font-sans text-slate-800"
                    invalid={Boolean(forgotPassword) && !forgotPasswordLongEnough}
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(!showForgotPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-800 transition-colors focus:outline-none focus-visible:text-accent"
                    title={showForgotPassword ? 'Hide password' : 'Show password'}
                  >
                    {showForgotPassword ? (
                      <EyeOff size={18} strokeWidth={1.75} />
                    ) : (
                      <Eye size={18} strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </FormField>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 font-sans">Password strength</span>
                  <span className={`text-xs font-bold font-sans ${forgotStrength.text}`}>
                    {forgotStrength.label}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${forgotStrength.bar}`}
                    style={{ width: forgotPassword ? forgotStrength.width : '0%' }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {forgotRuleStates.map((rule) => (
                    <div
                      key={rule.key}
                      className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                        rule.passed ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {rule.passed ? (
                        <CheckCircle2 size={15} strokeWidth={2} />
                      ) : (
                        <Circle size={15} strokeWidth={1.75} />
                      )}
                      <span>{rule.label}</span>
                    </div>
                  ))}
                </div>
                <div
                  className={`mt-2 flex items-center gap-2 text-xs font-medium transition-colors ${
                    forgotPasswordLongEnough ? 'text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  {forgotPasswordLongEnough ? (
                    <CheckCircle2 size={15} strokeWidth={2} />
                  ) : (
                    <Circle size={15} strokeWidth={1.75} />
                  )}
                  <span>At least 8 characters</span>
                </div>
              </div>

              <FormField label="Confirm password" htmlFor="forgot_confirm_password">
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-accent transition-colors">
                    <Lock size={18} strokeWidth={1.75} />
                  </span>
                  <Input
                    id="forgot_confirm_password"
                    type={showForgotConfirm ? 'text' : 'password'}
                    value={forgotConfirm}
                    onChange={(event) => {
                      setForgotConfirm(event.target.value);
                      setForgotError('');
                      setForgotSuccess('');
                    }}
                    autoComplete="new-password"
                    spellCheck={false}
                    className="pl-9 pr-9 focus:ring-accent/25 focus:ring-offset-0 focus:border-accent font-sans text-slate-800"
                    invalid={Boolean(forgotConfirm) && !forgotPasswordMatches}
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotConfirm(!showForgotConfirm)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-800 transition-colors focus:outline-none focus-visible:text-accent"
                    title={showForgotConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showForgotConfirm ? (
                      <EyeOff size={18} strokeWidth={1.75} />
                    ) : (
                      <Eye size={18} strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </FormField>

              {forgotConfirm ? (
                <div
                  className={`flex items-center gap-2 text-xs font-semibold ${
                    forgotPasswordMatches ? 'text-emerald-700' : 'text-danger'
                  }`}
                >
                  {forgotPasswordMatches ? (
                    <CheckCircle2 size={15} strokeWidth={2} />
                  ) : (
                    <ShieldAlert size={15} strokeWidth={1.75} />
                  )}
                  <span>{forgotPasswordMatches ? 'Passwords match' : 'Passwords do not match'}</span>
                </div>
              ) : null}

              {forgotError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg bg-danger/10 border border-danger/15 text-danger text-xs px-3.5 py-2.5 animate-fade-in"
                >
                  <ShieldAlert size={16} strokeWidth={1.75} className="shrink-0 mt-0.5" />
                  <span className="leading-normal font-medium font-sans">{forgotError}</span>
                </div>
              ) : null}

              {forgotSuccess ? (
                <div
                  role="status"
                  className="flex items-start gap-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3.5 py-2.5 animate-fade-in"
                >
                  <CheckCircle2 size={16} strokeWidth={1.75} className="shrink-0 mt-0.5" />
                  <span className="leading-normal font-medium font-sans">{forgotSuccess}</span>
                </div>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                className="w-full flex items-center justify-center gap-2 font-sans"
                disabled={!canSubmitForgot}
              >
                {isForgotSubmitting ? (
                  <>
                    <Spinner size={14} className="text-white" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <span>Submit new password</span>
                    <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      ) : null}

      {isSsoOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-white/70 bg-white p-5 shadow-2xl animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-sans">Continue with SSO</h3>
                <p className="mt-1 text-xs font-medium text-slate-500 font-sans">
                  Enter your organization Employee ID.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSsoOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                title="Close"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={onSsoSubmit} className="mt-5 space-y-4">
              <FormField label="Employee ID" error={ssoError} htmlFor="sso_employee_id">
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-accent transition-colors">
                    <User size={18} strokeWidth={1.75} />
                  </span>
                  <Input
                    id="sso_employee_id"
                    value={ssoEmployeeId}
                    onChange={(event) => setSsoEmployeeId(event.target.value.toUpperCase())}
                    autoComplete="username"
                    spellCheck={false}
                    autoFocus
                    className="pl-9 pr-3 focus:ring-accent/25 focus:ring-offset-0 focus:border-accent font-sans text-slate-800"
                    invalid={Boolean(ssoError)}
                  />
                </div>
              </FormField>

              <Button
                type="submit"
                variant="primary"
                className="w-full flex items-center justify-center gap-2 font-sans"
                disabled={isSsoSubmitting}
              >
                {isSsoSubmitting ? (
                  <>
                    <Spinner size={14} className="text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      ) : null}


    </main>
  );
}
