// ============================================================================
// src/modules/auth/auth.validators.js  —  Zod schemas for auth endpoints
// ----------------------------------------------------------------------------
// PURPOSE
//   The single source of truth for what shape the auth endpoints accept.
//   The frontend imports an identical-shape schema so the same rule
//   rejects malformed input at both edges of the wire.
//
// SCOPE OF THIS VALIDATOR (post Phase-7 patch, 2026-05-19)
//   This schema is now ONLY a shape check:
//     • employee_id : non-empty string, ≤ 50 chars
//     • password    : non-empty string, ≤ 256 chars
//     • no extra fields (.strict())
//
//   The actual decision of "is this credential valid?" is made by the
//   service layer doing a row lookup + bcrypt.compare. The DB row is
//   the only source of truth.
//
// WHY WE REMOVED THE ^[A-Z]{2}[0-9]{5}$ REGEX
//   The legacy employee directory contains IDs that do NOT conform to
//   the original tight pattern. The user explicitly requested: if the
//   credential exists in the database, the user must be allowed in.
//   A regex gate would lock out legitimate users.
//
// WHY THE SANITY CAPS REMAIN
//   • bcrypt silently truncates inputs longer than 72 bytes — clamping
//     at 256 stops a megabyte-string DoS that costs us 80ms of CPU per
//     bcrypt.compare without ever returning true.
//   • An unbounded string into a query parameter is a footgun even with
//     parameterised queries (memory pressure, log bloat).
//
// THE REAL BRUTE-FORCE DEFENCE
//   express-rate-limit fronts /auth/login (10 attempts / 15 min / IP).
//   That's the gate that stops "abc-abc-abc" attack waves now that the
//   regex is gone.
// ============================================================================

'use strict';

const { z } = require('zod');

// Sanity caps — high enough that no real workflow hits them, low enough
// that an oversized payload can't waste a bcrypt compare cycle.
const EMP_ID_MAX = 50;
const PASSWORD_MAX = 256;
const PASSWORD_MIN = 8;
const PASSWORD_SPECIAL_RE = /[^A-Za-z0-9]/;

// POST /api/v1/auth/login  — body schema (shape-only, no format)
const loginSchema = z
  .object({
    employee_id: z
      .string()
      .min(1, 'Employee ID is required')
      .max(EMP_ID_MAX, `Employee ID must be ${EMP_ID_MAX} characters or fewer`),
    password: z
      .string()
      .min(1, 'Password is required')
      .max(PASSWORD_MAX, `Password must be ${PASSWORD_MAX} characters or fewer`),
  })
  // .strict() rejects extra/unknown fields. We do NOT want clients to
  // smuggle keys like { employee_id, password, isAdmin: true } past us.
  .strict();

// POST /api/v1/auth/sso/employee-login - temporary SSO mode.
// Future real SSO will call the same service with a verified email from
// the organization; for now the popup proves identity by employee_id only.
const ssoEmployeeLoginSchema = z
  .object({
    employee_id: z
      .string()
      .trim()
      .min(1, 'Employee ID is required')
      .max(EMP_ID_MAX, `Employee ID must be ${EMP_ID_MAX} characters or fewer`)
      .transform((v) => v.toUpperCase()),
  })
  .strict();

// POST /api/v1/auth/forgot-password
const forgotPasswordSchema = z
  .object({
    employee_id: z
      .string()
      .trim()
      .min(1, 'Employee ID is required')
      .max(EMP_ID_MAX, `Employee ID must be ${EMP_ID_MAX} characters or fewer`),
    new_password: z
      .string()
      .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
      .max(PASSWORD_MAX, `Password must be ${PASSWORD_MAX} characters or fewer`)
      .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
      .regex(/[a-z]/, 'Password must include at least one lowercase letter')
      .regex(/[0-9]/, 'Password must include at least one number')
      .regex(PASSWORD_SPECIAL_RE, 'Password must include at least one special character'),
    confirm_password: z.string().min(1, 'Confirm password is required'),
  })
  .strict()
  .refine((body) => body.new_password === body.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  });

// POST /api/v1/auth/refresh — body schema (must be empty; refresh comes
// from the httpOnly cookie + the CSRF header). .strict() means any body
// payload at all causes a 422.
const refreshSchema = z.object({}).strict();

module.exports = {
  loginSchema,
  refreshSchema,
  ssoEmployeeLoginSchema,
  forgotPasswordSchema,
};
