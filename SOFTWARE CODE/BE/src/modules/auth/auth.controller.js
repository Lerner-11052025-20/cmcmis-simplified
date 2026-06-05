// ============================================================================
// src/modules/auth/auth.controller.js  —  HTTP handlers for the auth router
// ----------------------------------------------------------------------------
// PURPOSE
//   Thin shims between Express's req/res world and the auth service's
//   pure-business-logic world. Controllers MUST stay thin: no SQL, no
//   bcrypt, no JWT signing — that all lives in the service / repo
//   layers below.
//
// WHAT THIS FILE DOES
//   • Pull the right slice of `req` into a service argument object.
//   • Set / clear cookies for the refresh + CSRF tokens.
//   • Render the standard success envelope `{ data: ... }`.
//   • Forward any throw to next() — errorHandler.js produces the
//     standard error envelope.
//
// COOKIE BEHAVIOUR (see utils/cookies.js for the option presets)
//   POST /login   → sets cmcmis_rt (httpOnly) + cmcmis_csrf (JS-readable)
//   POST /refresh → rotates BOTH cookies on success (new CSRF every time)
//   POST /logout  → clears both cookies (and revokes the refresh row)
// ============================================================================

'use strict';

const env = require('../../config/env');
const service = require('./auth.service');
const { randomToken } = require('../../utils/crypto');
const { errors } = require('../../middleware/errorHandler');
const {
  REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  refreshCookieOpts,
  csrfCookieOpts,
} = require('../../utils/cookies');

// ─────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/login
// ─────────────────────────────────────────────────────────────────────────
async function postLogin(req, res, next) {
  try {
    // req.body is already zod-parsed by validate(loginSchema) middleware,
    // so we can trust the shape and types here.
    const { employee_id, password } = req.body;

    const { accessToken, refreshToken, user } = await service.login({
      employeeId: employee_id,
      password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    // 1) Issue the refresh cookie (httpOnly — JS cannot read it).
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOpts(env));

    // 2) Issue a CSRF token that the FE MUST echo back as X-CSRF-Token
    //    on /refresh. The token sits in a non-httpOnly cookie so JS can
    //    read it; same value also returned in the JSON body so the FE
    //    can grab it without cookie-parsing.
    const csrfToken = randomToken();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOpts(env));

    // 3) Response envelope: the access token lives in memory only (FE
    //    holds it in a JS module variable + React context).
    return res.json({
      data: { accessToken, csrfToken, user },
    });
  } catch (e) {
    return next(e);
  }
}

// POST /api/v1/auth/sso/employee-login
async function postSsoEmployeeLogin(req, res, next) {
  try {
    const { employee_id } = req.body;

    const { accessToken, refreshToken, user } = await service.loginSsoByEmployeeId({
      employeeId: employee_id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOpts(env));

    const csrfToken = randomToken();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOpts(env));

    return res.json({
      data: { accessToken, csrfToken, user },
    });
  } catch (e) {
    return next(e);
  }
}


// ─────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/refresh
// ─────────────────────────────────────────────────────────────────────────
async function postRefresh(req, res, next) {
  try {
    const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME];

    // ── Double-submit CSRF check ──────────────────────────────────────
    // The attacker on another origin can make the browser SEND both our
    // cookies, but they cannot READ the cmcmis_csrf cookie cross-site
    // (same-origin policy blocks document.cookie inspection). Therefore
    // they cannot set the X-CSRF-Token header to a matching value. We
    // demand: header == cookie. Anything else is rejected as CSRF.
    const csrfHeader = req.headers['x-csrf-token'];
    const csrfCookie = req.cookies[CSRF_COOKIE_NAME];
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      throw errors.forbidden('CSRF token missing or mismatched');
    }

    const { accessToken, refreshToken, user } = await service.refresh({
      rawRefreshToken,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    // Rotate the cookies — new refresh + new CSRF on every successful
    // refresh. Both cookies overwrite their previous values.
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOpts(env));
    const newCsrfToken = randomToken();
    res.cookie(CSRF_COOKIE_NAME, newCsrfToken, csrfCookieOpts(env));

    return res.json({
      data: { accessToken, csrfToken: newCsrfToken, user },
    });
  } catch (e) {
    return next(e);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/logout
// ─────────────────────────────────────────────────────────────────────────
async function postLogout(req, res, next) {
  try {
    const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME];
    // authenticate middleware attached req.user; if the access token was
    // valid we get an employeeId to write to login_audit.
    const employeeId = req.user && req.user.employeeId;

    await service.logout({
      rawRefreshToken,
      employeeId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    // ClearCookie must match the original Path / SameSite to actually
    // unset the cookie in the browser. The refresh cookie was scoped to
    // /api/v1/auth — clearing it requires the same path.
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOpts(env));
    res.clearCookie(CSRF_COOKIE_NAME, csrfCookieOpts(env));

    // 204 No Content — there is no useful body for a successful logout.
    return res.status(204).end();
  } catch (e) {
    return next(e);
  }
}

module.exports = { postLogin, postSsoEmployeeLogin, postRefresh, postLogout };
