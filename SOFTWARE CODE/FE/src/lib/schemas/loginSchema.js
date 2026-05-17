// ============================================================================
// src/lib/schemas/loginSchema.js  —  Login form validation (Zod)
// ----------------------------------------------------------------------------
// PURPOSE
//   Mirrors the backend's `auth.validators.js` schema exactly so the FE
//   form rejects malformed input BEFORE making a network call. This is
//   the "JS + Zod" half of the locked stack decision: Zod schemas at
//   module boundaries on both sides of the wire give us the same
//   validation guarantees that TypeScript types would — without a
//   build step.
//
// CONTRACT
//   employee_id : 2 uppercase letters + 5 digits  (e.g. SA79900)
//   password    : same regex (v1 password == employee_id)
//   No other keys allowed (.strict()) — paranoid against payload smuggling.
//
//   On failure react-hook-form / zodResolver surfaces field-level
//   messages: `errors.employee_id.message` / `errors.password.message`.
// ============================================================================

import { z } from 'zod';

// Same regex the BE bcrypted against in Phase 3. Keep these two strings
// in lockstep with the BE — any drift means the FE rejects input the
// BE would accept, or vice versa, and both produce confusing UX.
export const PASSWORD_REGEX = /^[A-Z]{2}[0-9]{5}$/;
const FORMAT_HINT = 'Format: 2 uppercase letters + 5 digits (e.g. SA79900)';

export const loginSchema = z
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
  .strict();
