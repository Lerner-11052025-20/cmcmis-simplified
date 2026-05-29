// ============================================================================
// src/lib/api-client.js  —  Axios instance + auth interceptors
// ----------------------------------------------------------------------------
// PURPOSE
//   The central nervous system of the frontend. Every HTTP call to the
//   backend goes through `api`. Two interceptors do the heavy lifting:
//
//     REQUEST  — attaches Authorization: Bearer <accessToken> on every
//                outgoing request, and X-CSRF-Token on every state-
//                changing verb (POST / PATCH / DELETE).
//
//     RESPONSE — catches 401 from any non-auth endpoint, fires a SINGLE
//                /auth/refresh call (coalescing concurrent failures
//                into one in-flight promise), then retries the original
//                request with the new Bearer. On refresh failure it
//                redirects to /login.
//
// SECURITY MODEL (locked, do not deviate)
//   • Access token lives ONLY in module-private memory below — never
//     in localStorage / sessionStorage / cookies. XSS that reads
//     `localStorage` will find nothing useful here.
//   • Refresh token lives ONLY in an httpOnly cookie (set by the BE).
//     JS literally cannot read it.
//   • CSRF token lives in a JS-readable cookie + module state. We
//     read it on POST/PATCH/DELETE and echo it back as a header
//     (double-submit pattern — BE enforces equality on /auth/refresh).
//
// WHY refresh COALESCING?
//   When the access token expires, MANY in-flight requests can 401
//   simultaneously (a dashboard refresh that fires N widgets). Without
//   coalescing each 401 triggers its own /auth/refresh — N concurrent
//   refreshes, N-1 of them fail with "token already rotated", the
//   whole dashboard explodes. With coalescing the FIRST 401 fires one
//   refresh; every other concurrent 401 waits on the same promise and
//   reuses the result. Net: smooth UX on token expiry.
// ============================================================================

import axios from 'axios';

// ── Module-private state ────────────────────────────────────────────────
// These are NOT exported as values. Callers update them via the setter
// functions below; that gives us a single point of audit for "who can
// change the access token?".
let accessToken = null;
let csrfToken = null;
// Tracks an in-flight refresh promise. While non-null, any 401 retry
// inside the response interceptor will await this promise instead of
// starting a new refresh.
let refreshInFlight = null;

// ── Public setters / getters ────────────────────────────────────────────
/** @param {string | null} t */
export function setAccessToken(t) { accessToken = t; }
/** @param {string | null} t */
export function setCsrfToken(t)   { csrfToken   = t; }
/** @returns {string | null} */
export function getAccessToken()  { return accessToken; }
/** @returns {string | null} */
export function getCsrfToken()    { return csrfToken;   }

/** Reset both — called by auth-context.logout(). */
export function clearAuthTokens() {
  accessToken = null;
  csrfToken = null;
}

// ── Cookie helper (handles the first-page-load case) ────────────────────
/**
 * Read a cookie by name. Used as a fallback when csrfToken is not in
 * module state yet but the cookie may still be sitting in the browser
 * from a previous session — typical scenario after a hard refresh.
 *
 * @param {string} name
 * @returns {string | null}
 */
function readCookie(name) {
  if (typeof document === 'undefined' || !document.cookie) return null;
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp('(?:^|; )' + escapedName + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// ── The axios instance ──────────────────────────────────────────────────
// withCredentials: true makes the browser send cookies on cross-origin
// requests AND honour cross-origin Set-Cookie responses — required for
// the httpOnly refresh cookie to round-trip.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
});

// ── REQUEST INTERCEPTOR ─────────────────────────────────────────────────
// Attaches the Authorization header (if we have an access token) and
// X-CSRF-Token (on state-changing verbs). Both are no-ops on the very
// first request before the user authenticates — which is why /auth/login
// has no Bearer expectation on the BE side.
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.set
      ? config.headers.set('Authorization', `Bearer ${accessToken}`)
      : (config.headers.Authorization = `Bearer ${accessToken}`);
  }

  const method = (config.method || 'get').toLowerCase();
  if (['post', 'patch', 'delete'].includes(method)) {
    // Prefer module state; fall back to the cookie (handles hard refresh
    // when the FE just loaded but the cookie survived from last session).
    const csrf = csrfToken || readCookie('cmcmis_csrf');
    if (csrf) {
      config.headers.set
        ? config.headers.set('X-CSRF-Token', csrf)
        : (config.headers['X-CSRF-Token'] = csrf);
    }
  }
  return config;
});

// ── RESPONSE INTERCEPTOR ────────────────────────────────────────────────
// Single responsibility: turn a 401 into a transparent refresh + retry.
// 403, 404, 422, 500 etc. all pass through untouched — refresh would
// not help any of those cases.
api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const original = error.config;

    // Bail out if axios couldn't even build a config (network error etc).
    if (!original) return Promise.reject(error);

    // Already retried once? Don't loop — surface the failure.
    if (original._retried) return Promise.reject(error);

    // Anything other than 401 is not a refresh-fixable error.
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // PHASE 7 — SESSION_REVOKED branch (D-7.2).
    // The BE's authenticate middleware tags 401s with details.reason:
    //   'SESSION_REVOKED'  → Super Admin acted on this account
    //                         (role change / deactivate / force-logout).
    //                         No amount of /auth/refresh will help —
    //                         the user's old refresh token is also
    //                         invalidated, and even if it weren't,
    //                         the new access token would carry the
    //                         old token_version. Force re-login.
    //   'TOKEN_EXPIRED'    → normal 15-min access-token lifecycle —
    //                         falls through to the refresh path below.
    //   undefined          → malformed / signature error — treat as
    //                         refresh-fixable for back-compat.
    const reason = error.response?.data?.error?.details?.reason;
    if (reason === 'SESSION_REVOKED') {
      // Wipe local tokens + UI state, then bounce to /login. We can't
      // call AuthContext from here (cyclic), so we just blow the tokens
      // out of module state and reload the page — AuthProvider sees no
      // valid refresh and renders the login form.
      try {
        clearAuthTokens();
      } catch { /* ignore */ }
      if (typeof window !== 'undefined') {
        // Use a query param so the Login page can surface a toast.
        const target = `/login?reason=session_revoked`;
        window.location.replace(target);
      }
      return Promise.reject(error);
    }

    // The refresh / login / logout endpoints themselves must never
    // trigger a retry — that would loop forever ("/refresh returned 401
    // → call /refresh → 401 → call /refresh …"). Treat them as terminal.
    if (typeof original.url === 'string' && /\/auth\//.test(original.url)) {
      return Promise.reject(error);
    }

    original._retried = true;

    // Coalesce: first 401 starts the refresh; the rest await the same promise.
    if (!refreshInFlight) {
      refreshInFlight = refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
    }

    try {
      const newToken = await refreshInFlight;
      // Re-attach the fresh Bearer to the original request and replay it.
      // The request interceptor would also pick up the new token from
      // module state, but explicit here is clearer + handles a race where
      // refresh succeeded but the new token hasn't yet been set when this
      // line runs (it has — refreshAccessToken sets it synchronously before
      // resolving).
      if (original.headers && original.headers.set) {
        original.headers.set('Authorization', `Bearer ${newToken}`);
      } else {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
      }
      return api(original);
    } catch (refreshError) {
      // Refresh failed — could be expired refresh cookie, revoked session,
      // or BE-side token-theft sweep. In every case the user needs to
      // re-authenticate. Bounce to /login.
      if (typeof window !== 'undefined') {
        // Use replace() so the current (now-broken) page isn't in history.
        window.location.replace('/login');
      }
      return Promise.reject(refreshError);
    }
  },
);

// ── Internal: the actual refresh call ───────────────────────────────────
// Called only from the response interceptor (above) and from the
// AuthProvider's mount-time silent refresh. Keeps the URL + state-update
// logic in ONE place so there's no chance of divergence.
async function refreshAccessToken() {
  // POST with no body. The request interceptor will auto-attach the
  // CSRF header by reading the cookie if module state isn't set yet.
  const r = await api.post('/auth/refresh');
  // Update module state synchronously so that ANY subsequent request
  // (including the retry from the response interceptor a few ticks
  // later) sees the new tokens.
  setAccessToken(r.data.data.accessToken);
  setCsrfToken(r.data.data.csrfToken);
  return r.data.data.accessToken;
}
