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
import { ArrowRight } from 'lucide-react';

import { Brand } from '../components/Brand.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { FormField } from '../components/ui/FormField.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { MadeWithLove } from '../components/MadeWithLove.jsx';
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
      // Pass the raw values straight through — no client-side normalisation.
      // The BE compares the bcrypt hash of the stored password against
      // exactly what the user typed; any massaging here would diverge
      // from what they remember entering at setup time.
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
            {/* Employee ID — NO transform, NO format restrictions.
                autoComplete='username' lets the browser/password manager
                fill correctly. autoFocus drops the cursor in the right
                place on first paint. */}
            <FormField
              label="Employee ID"
              error={errors.employee_id?.message}
            >
              <Input
                autoComplete="username"
                spellCheck={false}
                autoFocus
                {...register('employee_id')}
              />
            </FormField>

            {/* Password — NO transform, NO format restrictions.
                Rendered as password type so onlookers can't read it. */}
            <FormField label="Password" error={errors.password?.message}>
              <Input
                type="password"
                autoComplete="current-password"
                spellCheck={false}
                {...register('password')}
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

          {/* Authorship credit — bottom of the sign-in card. */}
          <MadeWithLove size="sm" />
        </div>

        {/* Page-level authorship credit — appears under the card too so the
            sign-in screen carries the same "made-with-love" mark as every
            authenticated page. */}
        <MadeWithLove />
      </div>
    </main>
  );
}
