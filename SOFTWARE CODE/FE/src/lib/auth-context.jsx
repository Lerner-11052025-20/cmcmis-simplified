// ============================================================================
// src/lib/auth-context.jsx  —  React context for the authenticated session
// ----------------------------------------------------------------------------
// PURPOSE
//   Holds the React-visible half of the auth state:
//     • `user`         — { sub, uid, role, permissions[] } | null
//     • `loading`      — true while the mount-time silent refresh is in flight
//   And exposes the actions every page needs:
//     • login(employeeId, password)  — POST /auth/login
//     • logout()                     — POST /auth/logout (best effort)
//     • hasPermission(code)          — boolean gate for components
//     • hasAny(...codes)             — any-of gate for overlapping perms
//
//   The api-client module stores the actual ACCESS + CSRF tokens (in
//   memory). This file only holds React state and orchestrates calls.
//
// MOUNT-TIME SILENT REFRESH
//   On every page load (or hard refresh) the AuthProvider tries to
//   exchange the existing httpOnly refresh cookie for a fresh access
//   token. Success → hydrate `user` + tokens, render dashboard.
//   Failure (no/expired/revoked cookie) → stay anonymous, ProtectedRoute
//   bounces the user to /login.
//
// PERMISSION-CHECK CONTRACT (BR-RBAC-03)
//   Always check permission strings, never role names. The hasPermission
//   helper does a single Array.includes() — O(N) where N≈40 is trivial.
//   If a future hot path needs O(1), wrap permissions in a Set inside
//   useMemo; for now KISS.
// ============================================================================

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  api,
  setAccessToken,
  setCsrfToken,
  clearAuthTokens,
} from './api-client.js';
// Phase 12 — register the token-capsule interceptor (side-effect import)
// and keep its permission snapshot in sync with the current user.
import './tokens/tokenInterceptor.js';
import { setAuthSnapshot } from './tokens/tokenInterceptor.js';

// ── Module-level singleton for the mount-time silent refresh ─────────────
// React.StrictMode in development double-invokes effects to surface side-
// effect bugs. Without this guard, AuthProvider's mount useEffect would
// fire TWO network calls to /auth/refresh in dev. We capture the FIRST
// promise here so the second mount reuses it instead of starting a new
// request. Production (no StrictMode double-mount) behaves identically.
let bootRefreshPromise = null;
function bootRefreshOnce() {
  if (!bootRefreshPromise) {
    bootRefreshPromise = api.post('/auth/refresh');
  }
  return bootRefreshPromise;
}

/**
 * @typedef {Object} User
 * @property {string}   sub          The employee_id (canonical subject).
 * @property {number}   uid          users.user_id from the DB.
 * @property {string}   role         e.g. 'SUPER_ADMIN'.
 * @property {string[]} permissions  Resolved permission codes.
 */

/**
 * @typedef {Object} AuthContextValue
 * @property {User|null} user
 * @property {boolean}   loading
 * @property {(employeeId: string, password: string) => Promise<void>} login
 * @property {() => Promise<void>}                                     logout
 * @property {(code: string) => boolean}                               hasPermission
 * @property {(...codes: string[]) => boolean}                         hasAny
 */

// Initial value is `null` so consumers outside an <AuthProvider> trip a
// loud error inside useAuth() — that beats a silent "always false" gate.
const AuthContext = createContext(/** @type {AuthContextValue|null} */ (null));

/**
 * Wraps the app and provides the auth state to every descendant.
 * Add this once in App.jsx (or main.jsx) at the very top.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(/** @type {User|null} */ (null));
  const [loading, setLoading] = useState(true);

  // Phase 12 — keep the token-interceptor's permission snapshot fresh
  // whenever `user` changes. The interceptor uses this to decide whether
  // to fire capsule tokens (View-Only users get none — they hold no
  // notifications:read-own).
  useEffect(() => {
    setAuthSnapshot(user);
  }, [user]);

  // ── Mount-time silent refresh + profile enrichment ────────────────────
  // Phase 4: just /auth/refresh.
  // Phase 5: AFTER a successful refresh, also call GET /me to enrich
  //          the user object with display_name / designation / email
  //          (needed for the Equipment Form's Section 5 auto-fill).
  // bootRefreshOnce() is a module-level singleton so StrictMode's
  // double-mount in dev reuses ONE network call.
  useEffect(() => {
    let cancelled = false;
    bootRefreshOnce()
      .then(async (r) => {
        if (cancelled) return;
        setAccessToken(r.data.data.accessToken);
        setCsrfToken(r.data.data.csrfToken);
        // First, hydrate with whatever /refresh returned.
        const base = r.data.data.user;
        setUser(base);
        // Then enrich with /me. Best-effort: if /me fails, the user is
        // still signed in with the base JWT fields.
        try {
          const me = await api.get('/me');
          if (!cancelled) setUser({ ...base, ...me.data.data });
        } catch {
          // ignore — base user stays
        }
      })
      .catch(() => {
        // No valid session — normal on first visit. Stay anonymous.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────
  // useCallback so the function identities are stable — consumers that
  // depend on `login` / `logout` in their own useEffect arrays won't
  // re-run on every parent render.

  const login = useCallback(async (employeeId, password) => {
    // Throws on failure; caller (Login.jsx) renders the error.
    const r = await api.post('/auth/login', {
      employee_id: employeeId,
      password,
    });
    setAccessToken(r.data.data.accessToken);
    setCsrfToken(r.data.data.csrfToken);
    const base = r.data.data.user;
    setUser(base);
    // Enrich with display_name / designation / email from cmms_emp_mst.
    let enriched = base;
    try {
      const me = await api.get('/me');
      enriched = { ...base, ...me.data.data };
      setUser(enriched);
    } catch {
      // ignore — base user stays
    }
    return enriched;
  }, []);

  const logout = useCallback(async () => {
    // Best effort: ignore errors. The user is logging out — even if the
    // backend call fails (network blip, already-revoked token) we still
    // want the local state cleared so the UI flips to anonymous.
    try {
      await api.post('/auth/logout');
    } catch {
      // intentional swallow
    }
    clearAuthTokens();
    setUser(null);
  }, []);

  // ── Permission helpers ────────────────────────────────────────────────
  // Bound to `user` so they update automatically when login/logout
  // changes the state. Both default to `false` for the anonymous case.

  const hasPermission = useCallback(
    (code) => (user ? user.permissions.includes(code) : false),
    [user],
  );

  const hasAny = useCallback(
    (...codes) => {
      if (!user) return false;
      const owned = new Set(user.permissions);
      return codes.some((c) => owned.has(c));
    },
    [user],
  );

  // useMemo so the context value reference is stable when nothing
  // relevant has changed — prevents needless re-renders in every
  // consumer of useAuth().
  const value = useMemo(
    () => ({ user, loading, login, logout, hasPermission, hasAny }),
    [user, loading, login, logout, hasPermission, hasAny],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Read the auth state. MUST be called inside an <AuthProvider>.
 * Throws a clear error otherwise — beats debugging a silent `false`.
 *
 * @returns {AuthContextValue}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be used inside <AuthProvider>. ' +
                    'Wrap your app in <AuthProvider> at the App root.');
  }
  return ctx;
}
