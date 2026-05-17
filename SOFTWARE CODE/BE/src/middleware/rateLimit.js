// ============================================================================
// src/middleware/rateLimit.js  —  Brute-force throttling
// ----------------------------------------------------------------------------
// PURPOSE
//   Two rate limiters keyed by IP address. Layer-1 defence against
//   credential stuffing and refresh-token enumeration.
//
//   loginLimiter   — strict: 10 attempts / 15 min / IP. Combined with
//                    bcrypt cost 10 (~80ms per compare), an attacker
//                    bursting from one IP gets at most ~800ms of bcrypt
//                    work before they hit the limit and are 429'd.
//
//   refreshLimiter — generous: 30 attempts / 1 min / IP. A legitimate
//                    SPA refreshes its access token every ~14 minutes,
//                    so this ceiling is well above any reasonable use.
//                    The limiter exists so that *if* a bug puts the FE
//                    in a refresh loop, we crash safely instead of
//                    DoS-ing our own DB.
//
// CONTRACT
//   Both limiters render the standard error envelope on rejection:
//
//     { error: { code: 'RATE_LIMITED', message: '...', details: null } }
//
//   This matches the rest of the API surface — the FE renders a generic
//   "too many attempts, try later" toast.
//
// TRUST-PROXY NOTE
//   server.js sets `app.set('trust proxy', 1)`. That means `req.ip` is
//   computed from X-Forwarded-For when behind Nginx, but falls back to
//   the socket address in local dev. The default keyGenerator(req)
//   reads req.ip, so this DOES the right thing automatically.
// ============================================================================

'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// Standard envelope helper — both limiters use it via the `handler` hook
// so the response shape matches the rest of the API.
function rateLimitHandler(req, res /* next, options */) {
  res.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down and try again later.',
      details: null,
    },
  });
}

// ── /login limiter ───────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_WINDOW_MS, // 15 minutes by default
  max: env.LOGIN_RATE_MAX,            // 10 attempts default
  standardHeaders: true,              // RateLimit-* headers in response
  legacyHeaders: false,               // suppress X-RateLimit-* (deprecated)
  keyGenerator: (req) => req.ip,
  handler: rateLimitHandler,
  // Successful logins don't count toward the limit — we only want to
  // throttle attempts that failed authentication. (Optional polish;
  // turned ON so a user that legitimately mistypes a few times once
  // and succeeds doesn't burn their budget.)
  skipSuccessfulRequests: true,
});

// ── /refresh limiter ─────────────────────────────────────────────────────
const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,                // 1 minute
  max: 30,                            // generous — see header note
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: rateLimitHandler,
});

module.exports = { loginLimiter, refreshLimiter };
