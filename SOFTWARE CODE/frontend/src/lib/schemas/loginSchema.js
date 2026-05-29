// ============================================================================
// src/lib/schemas/loginSchema.js  —  Login form validation (Zod)
// ----------------------------------------------------------------------------
// PURPOSE
//   Mirrors the backend's `auth.validators.js` schema exactly so the FE
//   form rejects truly empty input BEFORE making a network call.
//
//   We deliberately allow ANY character / length combination beyond that
//   minimum: the AUTHORITATIVE check is the bcrypt comparison the BE
//   does against the row stored in `users`. The DB is the only thing
//   that knows whether the credential is real.
//
// HISTORY
//   Phase 4 / Phase 7: enforced ^[A-Z]{2}[0-9]{5}$ (e.g. SA79900) at the
//                     edge as a fast-fail before bcrypt — a deliberately
//                     narrow format check.
//   Phase 7 patch (2026-05-19): user instructed to lift the format gate.
//                     Real employees in the existing dataset have
//                     non-conforming IDs (e.g. lowercase, 6 chars,
//                     letters-only). Anything in `users.employee_id`
//                     with a matching bcrypt MUST be allowed in. The
//                     "fast fail" benefit is now provided by:
//                       1. express-rate-limit on /auth/login
//                       2. the DB lookup itself (cheap miss → 401)
//
// CONTRACT (relaxed)
//   employee_id : non-empty string, max 50 chars (sanity cap)
//   password    : non-empty string, max 256 chars (sanity cap)
//   .strict()   : no extra fields tolerated (anti-smuggling).
// ============================================================================

import { z } from 'zod';

// Sanity caps only — chosen far above any realistic employee_id length
// and the bcrypt-72-byte input ceiling. NOT a format check.
const EMP_ID_MAX = 50;
const PASSWORD_MAX = 256;

export const loginSchema = z
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
  .strict();
