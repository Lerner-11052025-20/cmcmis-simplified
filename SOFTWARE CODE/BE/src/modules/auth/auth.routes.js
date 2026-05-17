// ============================================================================
// src/modules/auth/auth.routes.js  —  URL wiring for the auth module
// ----------------------------------------------------------------------------
// Mounted at `${env.API_BASE_PATH}/auth` in server.js (default '/api/v1/auth').
//
// ROUTE TABLE
//
//   POST  /login    → rate-limit ─ zod-validate body ─ controller
//                     Public. Accepts { employee_id, password }.
//
//   POST  /refresh  → rate-limit ─ controller (CSRF + cookie checks inside)
//                     "Public-ish": no Bearer required, but the refresh
//                     cookie and matching X-CSRF-Token header are.
//
//   POST  /logout   → authenticate ─ controller
//                     Requires a valid access token so we can audit
//                     LOGOUT against a known employee_id.
//
// The middleware order on each route mirrors the locked 13-step pipeline:
//   rateLimit → validate → controller   (login)
//   rateLimit → controller              (refresh)
//   authenticate → controller           (logout)
// ============================================================================

'use strict';

const express = require('express');

const validate = require('../../middleware/validate');
const { loginLimiter, refreshLimiter } = require('../../middleware/rateLimit');
const authenticate = require('../../middleware/authenticate');

const { loginSchema } = require('./auth.validators');
const ctrl = require('./auth.controller');

const router = express.Router();

// Public — rate-limited and zod-validated
router.post(
  '/login',
  loginLimiter,
  validate(loginSchema, 'body'),
  ctrl.postLogin,
);

// Public-with-cookie — rate-limited; CSRF + cookie validation lives in ctrl
router.post(
  '/refresh',
  refreshLimiter,
  ctrl.postRefresh,
);

// Protected — needs a valid access token so logout is attributable
router.post(
  '/logout',
  authenticate,
  ctrl.postLogout,
);

module.exports = router;
