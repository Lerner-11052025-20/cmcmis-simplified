// ============================================================================
// src/modules/auth/auth.validators.js  —  Zod schemas for auth endpoints
// ----------------------------------------------------------------------------
// PURPOSE
//   The single source of truth for what the auth endpoints accept. The
//   frontend imports an identical schema (re-stated in TS for type
//   inference) — so the same rule rejects malformed input at both edges.
//
// WHY a regex AND a length check?
//   `.regex(...)` alone would accept any string that matches the pattern,
//   regardless of length (the regex is anchored, so it's already
//   effectively length-7, but explicit .length(7) makes intent clear and
//   gives a precise error if a user pastes whitespace or extra chars).
//
// SECURITY pay-off
//   bcrypt.compare is intentionally slow (~80ms with cost 10). If we let
//   garbage strings through to the service layer, every "abc" attack
//   wave costs us 80ms × N of CPU. Catching malformed input HERE — in
//   the middleware, before service.login() runs — closes that door in
//   under a millisecond per request. This is in addition to express-
//   rate-limit on /login (10 attempts/15min/IP).
// ============================================================================

'use strict';

const { z } = require('zod');

// Canonical employee-id / v1-password format: two upper-case letters
// followed by exactly five digits. Locked in Phase 2; bcrypted in Phase 3
// against the same regex. Frontend mirrors this exactly.
const PASSWORD_REGEX = /^[A-Z]{2}[0-9]{5}$/;
const FORMAT_HINT = 'Format: 2 uppercase letters + 5 digits (e.g. SA79900)';

// POST /api/v1/auth/login  — body schema
const loginSchema = z
  .object({
    employee_id: z
      .string()
      .length(7, FORMAT_HINT)
      .regex(PASSWORD_REGEX, FORMAT_HINT),
    password: z
      .string()
      .length(7, FORMAT_HINT)
      .regex(PASSWORD_REGEX, FORMAT_HINT),
  })
  // .strict() rejects extra/unknown fields. We do NOT want clients to
  // smuggle keys like { employee_id, password, isAdmin: true } past us.
  .strict();

// POST /api/v1/auth/refresh — body schema (must be empty; refresh comes
// from the httpOnly cookie + the CSRF header). .strict() means any body
// payload at all causes a 422.
const refreshSchema = z.object({}).strict();

module.exports = {
  loginSchema,
  refreshSchema,
  PASSWORD_REGEX,
};
