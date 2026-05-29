// ============================================================================
// src/pages/Login.jsx  —  Authentication entry point (the ONLY public page)
// ----------------------------------------------------------------------------
// LAYOUT (matches the reference mockup in TECH spec)
//
//     ┌──────────────────────────────────────────────┐
//     │                                              │
//     │                   CMCMIS·                    │   ← hero
//     │      Calibration & Maintenance Management    │
//     │                  ISRO SAC                    │
//     │                                              │
//     │     ┌────────────────────────────────────┐   │
//     │     │  Sign In                           │   │
//     │     │  Employee ID  [____________]       │   │   ← card
//     │     │  Password     [____________]       │   │
//     │     │  [   →  Sign In   ]                │   │
//     │     │  ────────────────────              │   │
//     │     │  [ Continue with SSO  (soon) ]     │   │
//     │     │  Authorised personnel only…        │   │
//     │     └────────────────────────────────────┘   │
//     │                                              │
//     └──────────────────────────────────────────────┘
//
// VALIDATION  (post Phase-7 patch, 2026-05-19)
//   loginSchema (Zod, same shape as BE) attached via @hookform/resolvers.
//   The schema only enforces non-empty + sanity length caps now — any
//   character / length combination is accepted. The DB row is the
//   single source of truth: BE looks up the user, bcrypt.compare's the
//   submitted password against the stored hash, and a mismatch surfaces
//   as a generic "Invalid credentials".
//
//   Removed in this revision:
//     • auto-uppercase onChange handlers (no canonical format anymore)
//     • maxLength={7} attribute (sanity cap is now in schema, ≤ 50 / 256)
//     • "SA79900" placeholder + "Two uppercase letters + five digits" helper
//     • autoCapitalize='characters' (legacy carry-over from regex era)
//
// AFTER SUCCESS
//   Navigate to location.state.from?.pathname (set by ProtectedRoute
//   when it bounced an unauthenticated user) or /dashboard otherwise.
//   `replace: true` so /login isn't in the back-history.
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, User, Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';

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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    // mode 'onSubmit' is the RHF default — surface zod errors only after
    // the first submit attempt. Less noisy than 'onChange' for short forms.
  });

  // ── Already-signed-in redirect ─────────────────────────────────────
  // If a user re-visits /login after a silent refresh succeeded, send
  // them straight to the dashboard. Wait for `loading` to settle first.
  useEffect(() => {
    if (!loading && user) {
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    }
  }, [loading, user, location.state, navigate]);

  /** @param {{ employee_id: string, password: string }} values */
  async function onSubmit(values) {
    setServerError('');
    try {
      // Pass the raw values straight through — no client-side normalisation.
      // The BE compares the bcrypt hash of the stored password against
      // exactly what the user typed; any massaging here would diverge
      // from what they remember entering at setup time.
      await login(values.employee_id, values.password);
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      // Form/Card shake error feedback trigger
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      // BE returns { error: { code, message, details } } envelope.
      // Surface the human-safe message. Generic "Invalid credentials"
      // is shown for all 4 failure variants (no user enumeration).
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
      <main className="min-h-screen flex items-center justify-center">
        <Spinner size={28} className="text-ink-soft" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-base technical-grid-bg relative overflow-hidden select-none">
      {/* Blueprint Grid Technical Aesthetics (Cosmetic crosshairs) */}
      <div className="absolute top-8 left-8 w-10 h-10 pointer-events-none opacity-[0.12] border-t-2 border-l-2 border-ink" />
      <div className="absolute top-8 right-8 w-10 h-10 pointer-events-none opacity-[0.12] border-t-2 border-r-2 border-ink" />
      <div className="absolute bottom-8 left-8 w-10 h-10 pointer-events-none opacity-[0.12] border-b-2 border-l-2 border-ink" />
      <div className="absolute bottom-8 right-8 w-10 h-10 pointer-events-none opacity-[0.12] border-b-2 border-r-2 border-ink" />

      {/* Decorative technical coordinate/telemetry markers */}
      <div className="absolute top-6 left-24 text-[9px] font-mono tracking-widest text-ink-soft/25 pointer-events-none hidden md:block">
        SYS.LOC // IN: 23.02 N / 72.57 E
      </div>
      <div className="absolute bottom-6 right-24 text-[9px] font-mono tracking-widest text-ink-soft/25 pointer-events-none hidden md:block">
        TERM.STATUS // ACTIVE.SECURE
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* ── HERO above card ─────────────────────────────────────── */}
        <div className="text-center mb-6 select-none flex flex-col items-center">
          {/* Custom animated space calibration SVG */}
          <div className="relative mb-3">
            <svg
              viewBox="0 0 100 100"
              className="w-16 h-16 text-accent select-none"
              aria-hidden="true"
            >
              {/* Outer telemetry target ring */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                className="animate-spin-slow opacity-60"
              />
              {/* Inner calibration reference ring */}
              <circle
                cx="50"
                cy="50"
                r="30"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="opacity-40"
              />
              {/* Telemetry horizontal/vertical guidelines */}
              <line
                x1="50"
                y1="2"
                x2="50"
                y2="98"
                stroke="currentColor"
                strokeWidth="0.5"
                className="opacity-20"
              />
              <line
                x1="2"
                y1="50"
                x2="98"
                y2="50"
                stroke="currentColor"
                strokeWidth="0.5"
                className="opacity-20"
              />
              {/* Orbiting satellite indicator */}
              <circle
                cx="50"
                cy="20"
                r="4"
                fill="currentColor"
                className="animate-pulse"
              />
              {/* Central laser diagnostic core */}
              <circle
                cx="50"
                cy="50"
                r="6"
                fill="currentColor"
                className="animate-pulse-radar"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold tracking-wider text-ink select-none font-sans flex items-center gap-1.5">
            <span>CMCMIS</span>
            <span className="text-accent animate-pulse">·</span>
          </h1>
          <p className="mt-2 text-xs font-semibold text-ink-soft uppercase tracking-wider">
            Calibration &amp; Maintenance Management
          </p>
          <p className="mt-0.5 text-[10px] font-mono text-ink-soft/70 uppercase tracking-widest">
            ISRO Space Applications Centre
          </p>
        </div>

        {/* ── Card ───────────────────────────────────────────────── */}
        <div
          className={`bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-[0_20px_50px_rgba(47,53,69,0.05)] p-7 relative overflow-hidden transition-transform duration-300 ${
            isShaking ? 'animate-shake border-danger/40 shadow-danger/5' : ''
          }`}
        >
          {/* Subtle decorative color border header */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent/30 via-accent to-accent/30" />

          <h2 className="text-lg font-bold text-ink mb-5 tracking-tight">Sign In</h2>

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
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-soft/40 group-focus-within:text-accent transition-colors">
                  <User size={18} strokeWidth={1.75} />
                </span>
                <Input
                  id="employee_id"
                  autoComplete="username"
                  spellCheck={false}
                  autoFocus
                  className="pl-9 pr-3 focus:ring-accent/25 focus:ring-offset-0 focus:border-accent"
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
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-soft/40 group-focus-within:text-accent transition-colors">
                  <Lock size={18} strokeWidth={1.75} />
                </span>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  spellCheck={false}
                  className="pl-9 pr-9 focus:ring-accent/25 focus:ring-offset-0 focus:border-accent"
                  invalid={Boolean(errors.password)}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-soft/40 hover:text-ink transition-colors focus:outline-none focus-visible:text-accent"
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
                <span className="leading-normal font-medium">{serverError}</span>
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              className="w-full shimmer-effect shadow-md shadow-accent/10 hover:shadow-accent/20 active:translate-y-[0.5px] transition-all duration-150 flex items-center justify-center gap-2"
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
            <span className="text-[10px] uppercase tracking-widest text-ink-soft/70 font-semibold">or</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <Button
            variant="secondary"
            className="w-full border border-border/80 text-ink/75 hover:text-ink flex items-center justify-center gap-2"
            disabled
            title="Active Directory SSO will be enabled in a future release."
          >
            <span className="text-xs font-semibold">Continue with SSO</span>
            <Badge color="ink" className="text-[9px] px-1.5 py-0 bg-base-elev text-ink-soft border border-border/40 font-mono">
              Soon
            </Badge>
          </Button>

          {/* Compliance footer */}
          <p className="mt-6 text-[10px] text-ink-soft/75 text-center leading-normal max-w-xs mx-auto">
            🔒 SECURE TERMINAL · Authorized Personnel Only<br />
            All sign-in attempts are monitored and audited.
          </p>
        </div>
      </div>
    </main>
  );
}
