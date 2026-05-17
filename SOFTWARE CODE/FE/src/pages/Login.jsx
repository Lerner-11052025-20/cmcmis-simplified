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
// VALIDATION
//   loginSchema (Zod, same regex as BE) attached via @hookform/resolvers.
//   Both fields are auto-uppercased on input — v1 password equals the
//   employee_id, both must be `^[A-Z]{2}[0-9]{5}$`.
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
import { ArrowRight } from 'lucide-react';

import { Brand } from '../components/Brand.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { FormField } from '../components/ui/FormField.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useAuth } from '../lib/auth-context.jsx';
import { loginSchema } from '../lib/schemas/loginSchema.js';

export function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Top-of-form server error message (e.g. "Invalid credentials" from BE).
  // Distinct from per-field zod errors which RHF tracks separately.
  const [serverError, setServerError] = useState('');

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
      await login(values.employee_id, values.password);
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
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
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-base">
      <div className="w-full max-w-md">
        {/* ── HERO above card ─────────────────────────────────────── */}
        <div className="text-center mb-8 select-none">
          <Brand size="lg" />
          <p className="mt-3 text-sm text-ink-soft">
            Calibration &amp; Maintenance Management
          </p>
          <p className="text-xs text-ink-soft/80">ISRO SAC</p>
        </div>

        {/* ── Card ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-border shadow-card p-7">
          <h2 className="text-xl font-semibold text-ink mb-5">Sign In</h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Employee ID — auto-uppercased as the user types so the
                user sees the canonical form. autoComplete='username'
                lets the browser/password manager fill correctly. */}
            <FormField
              label="Employee ID"
              error={errors.employee_id?.message}
              helper="Two uppercase letters + five digits (e.g. SA79900)"
            >
              <Input
                placeholder="SA79900"
                autoComplete="username"
                maxLength={7}
                spellCheck={false}
                autoCapitalize="characters"
                autoFocus
                {...register('employee_id', {
                  onChange: (e) => {
                    // Coerce to uppercase in place — RHF reads value AFTER this fires.
                    e.target.value = (e.target.value || '').toUpperCase();
                  },
                })}
              />
            </FormField>

            {/* Password — auto-uppercased too because v1 password == employee_id
                (regex-checked). Render as password type so screen onlookers
                don't see the characters, even though the value is the same. */}
            <FormField label="Password" error={errors.password?.message}>
              <Input
                type="password"
                autoComplete="current-password"
                maxLength={7}
                spellCheck={false}
                {...register('password', {
                  onChange: (e) => {
                    e.target.value = (e.target.value || '').toUpperCase();
                  },
                })}
              />
            </FormField>

            {/* Server error banner — appears below the inputs, above submit. */}
            {serverError ? (
              <div
                role="alert"
                className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2"
              >
                {serverError}
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner size={14} className="text-white" /> Signing in…
                </>
              ) : (
                <>
                  <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          {/* ── Divider + SSO placeholder (disabled, future feature) ─ */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] uppercase tracking-wider text-ink-soft">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button
            variant="secondary"
            className="w-full"
            disabled
            title="Active Directory SSO will be enabled in a future release."
          >
            Continue with SSO <Badge color="badge">Coming soon</Badge>
          </Button>

          {/* Compliance footer */}
          <p className="mt-5 text-[11px] text-ink-soft text-center">
            Authorised personnel only. All sign-in attempts are logged.
          </p>
        </div>
      </div>
    </main>
  );
}
