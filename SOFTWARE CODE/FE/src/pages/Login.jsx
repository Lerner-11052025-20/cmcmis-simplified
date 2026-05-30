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
  X
} from 'lucide-react';

import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { FormField } from '../components/ui/FormField.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useAuth } from '../lib/auth-context.jsx';
import { loginSchema } from '../lib/schemas/loginSchema.js';

// NOTE — authorship credit is rendered globally by the watchdog (loaded via
// the side-effect import in src/main.jsx). It paints itself in the
// bottom-right corner and is self-healing. No inline credit on this page.

export function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Top-of-form server error message (e.g. "Invalid credentials" from BE).
  // Distinct from per-field zod errors which RHF tracks separately.
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [loginSuccessData, setLoginSuccessData] = useState(null);
  
  // Track active form submission state to prevent the boot-time useEffect
  // from immediately redirecting when the context user hydrates.
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  // ── Already-signed-in redirect ─────────────────────────────────────
  // If a user re-visits /login after a silent refresh succeeded, send
  // them straight to the dashboard. Wait for `loading` to settle first.
  // We gate this with isLoggingIn to prevent active sign-in form submits
  // from getting hijacked before showing the welcome popup.
  useEffect(() => {
    if (!loading && user && !isLoggingIn && !loginSuccessData) {
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    }
  }, [loading, user, isLoggingIn, loginSuccessData, location.state, navigate]);

  /** @param {{ employee_id: string, password: string }} values */
  async function onSubmit(values) {
    setServerError('');
    setIsLoggingIn(true);
    try {
      const enrichedUser = await login(values.employee_id, values.password);
      
      // Store user details to trigger the 2-second welcome popup
      setLoginSuccessData({
        display_name: enrichedUser.display_name || 'Authorized Operator',
        employee_id: enrichedUser.sub || values.employee_id,
      });

      // Pause transition for exactly 2 seconds
      setTimeout(() => {
        const target = location.state?.from?.pathname || '/dashboard';
        navigate(target, { replace: true });
      }, 2000);
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
              disabled
              title="Active Directory SSO will be enabled in a future release."
            >
              <span className="text-xs font-semibold">Continue with SSO</span>
              <Badge color="ink" className="text-[9px] px-1.5 py-0 bg-base-elev text-slate-500 border border-border/40 font-sans font-medium">
                Soon
              </Badge>
            </Button>

            {/* Compliance footer */}
            <p className="mt-6 text-[10px] text-slate-500 text-center leading-normal max-w-xs mx-auto font-sans font-medium">
              🔒 SECURE TERMINAL · Authorized Personnel Only<br />
              All sign-in attempts are monitored and audited.
            </p>
          </div>
        </div>
      </div>

      {/* ── HIGH-FIDELITY SECURE WELCOME POPUP OVERLAY (2-Second Delay) ── */}
      {loginSuccessData && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-lg animate-fade-in select-none pointer-events-auto">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_30px_60px_rgba(15,23,42,0.08)] p-8 max-w-sm w-full text-center relative overflow-hidden flex flex-col items-center animate-scale-up mx-4">
            {/* Subtle decorative color border header */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />
            
            {/* Interactive top-right close icon (X) */}
            <button
              type="button"
              onClick={() => {
                setLoginSuccessData(null);
                setIsLoggingIn(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none rounded-lg p-1 hover:bg-slate-50"
              title="Dismiss welcome message"
            >
              <X size={18} strokeWidth={2} />
            </button>

            {/* Verification Success Shield Vector */}
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100/70 flex items-center justify-center text-emerald-600 mb-5 relative shrink-0">
              <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-20 animate-ping" />
              <svg className="w-8 h-8 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight font-sans">
              Access Granted
            </h3>
            <p className="text-[10px] text-slate-400 font-sans uppercase tracking-widest mt-1 font-semibold">
              Telemetry Session Established
            </p>

            {/* Credentials Badges */}
            <div className="flex flex-col gap-2 mt-5 w-full items-center font-sans">
              <div className="text-[9px] font-sans text-slate-400 uppercase tracking-widest font-bold">
                Authenticated Operator:
              </div>
              
              {/* Employee Name Badge */}
              <div className="inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-extrabold bg-accent/5 text-accent border border-accent/10 shadow-sm max-w-full truncate font-sans">
                👤 {loginSuccessData.display_name}
              </div>
              
              {/* Employee ID Badge */}
              <div className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-sans font-extrabold bg-slate-50 text-slate-700 border border-slate-100 shadow-sm">
                🆔 {loginSuccessData.employee_id}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 font-sans font-semibold">
              <Spinner size={14} className="text-emerald-500 animate-spin" />
              <span>Redirecting to terminal…</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
