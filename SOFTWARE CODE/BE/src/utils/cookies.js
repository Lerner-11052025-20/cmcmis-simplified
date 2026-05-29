// ============================================================================
// src/utils/cookies.js  —  Cookie names and option presets
// ----------------------------------------------------------------------------
// PURPOSE
//   Centralise the cookie names and the exact option bag we pass to
//   res.cookie() for the two cookies the auth flow issues. Defining
//   these once means /login, /refresh, /logout, and the FE interceptors
//   can never drift apart — a security-critical guarantee.
//
// THE TWO COOKIES
//
//   1. cmcmis_rt   — REFRESH TOKEN
//      httpOnly    : true   → JavaScript can NEVER read this. Even XSS
//                              that injects into the page cannot exfil-
//                              trate the 7-day refresh secret.
//      secure      : prod   → only sent over HTTPS in production (we
//                              relax this in dev because Vite serves http).
//      sameSite    : 'lax'  → not sent on cross-site POST / fetch /
//                              iframe — defeats most CSRF. The /refresh
//                              endpoint *also* enforces a double-submit
//                              token (see controller) so the cookie alone
//                              is never sufficient.
//      path        : '/api/v1/auth' → narrow scope. The cookie is sent
//                              only on auth endpoints, never on equip-
//                              ment / JR / JC reads. Smaller blast
//                              radius if a sub-path is ever compromised.
//      maxAge      : 7 days → matches JWT_REFRESH_TTL_SEC.
//
//   2. cmcmis_csrf — CSRF DOUBLE-SUBMIT TOKEN
//      httpOnly    : FALSE  → JS *MUST* be able to read this so the
//                              frontend interceptor can echo it back in
//                              an X-CSRF-Token header on /refresh writes.
//      secure      : prod   → HTTPS-only in production.
//      sameSite    : 'lax'  → keeps it from leaking cross-site.
//      path        : '/'    → must be readable on all FE pages so the
//                              interceptor can pick it up regardless of
//                              the current route.
//      maxAge      : 7 days → mirror the refresh cookie's life.
//
// WHY a factory function and not a constant object?
//   `secure` depends on env.NODE_ENV at runtime. We export *functions*
//   that take an env and return a fresh option bag. Constants would
//   freeze the wrong value if env was edited via tests.
// ============================================================================

'use strict';

const REFRESH_COOKIE_NAME = 'cmcmis_rt';
const CSRF_COOKIE_NAME = 'cmcmis_csrf';

// 7 days in milliseconds (cookie maxAge is ms, not seconds).
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Options bag for the refresh-token cookie.
 * @param {{ NODE_ENV: string }} env
 */
function refreshCookieOpts(env) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth', // narrow scope — see header note
    maxAge: SEVEN_DAYS_MS,
  };
}

/**
 * Options bag for the CSRF double-submit cookie.
 * @param {{ NODE_ENV: string }} env
 */
function csrfCookieOpts(env) {
  return {
    httpOnly: false, // FE *must* read this
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SEVEN_DAYS_MS,
  };
}

module.exports = {
  REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  refreshCookieOpts,
  csrfCookieOpts,
};
