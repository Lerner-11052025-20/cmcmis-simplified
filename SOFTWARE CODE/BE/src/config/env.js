// ============================================================================
// src/config/env.js  —  Validated environment configuration
// ----------------------------------------------------------------------------
// PURPOSE
//   Read process.env exactly ONCE, validate every variable the application
//   depends on, coerce numeric values to numbers, and expose the result as
//   a frozen object. If any required variable is missing or malformed, the
//   process exits with a clear message BEFORE Express ever opens a port.
//
// WHY fail-fast?
//   A subtle DB_USER typo discovered at request time produces a confusing
//   "ECONNREFUSED" stack trace; the same typo discovered at boot produces
//   "Invalid environment variable DB_USER" — orders of magnitude cheaper
//   to debug. We pay for this safety in 5ms at startup; it pays back
//   forever.
//
// SECURITY contract
//   1. JWT_ACCESS_SECRET MUST differ from JWT_REFRESH_SECRET (asserted below).
//      If they were equal, a leaked access token could be replayed as a
//      refresh token — converting a 15-minute compromise into a 7-day one.
//   2. No other file in the codebase should call `process.env` directly;
//      they import from here. This guarantees consistent typing and a
//      single audit point for "what env vars does this app touch?".
// ============================================================================

'use strict';

// dotenv.config() merges KEY=VALUE pairs from `.env` into process.env. It is
// a no-op if the file is absent, which is the right behaviour for production
// where env vars come from systemd / pm2 / CI rather than a dotfile.
require('dotenv').config();

const { cleanEnv, str, num, port } = require('envalid');

// cleanEnv parses + validates. Any failure throws and aborts the process.
const env = cleanEnv(process.env, {
  // ─── Server ─────────────────────────────────────────────────────────────
  NODE_ENV: str({ choices: ['development', 'production', 'test'] }),
  PORT: port({ default: 3000 }),
  API_BASE_PATH: str({ default: '/api/v1' }),
  CORS_ORIGIN: str({ desc: 'Exact frontend origin; e.g. http://localhost:5173' }),

  // ─── Database (Phase 3 sealed schema) ───────────────────────────────────
  DB_HOST: str(),
  DB_PORT: port({ default: 3306 }),
  DB_USER: str(),
  DB_PASSWORD: str({ default: '' }), // empty is valid for local dev MySQL
  DB_NAME: str(),
  DB_POOL_LIMIT: num({ default: 15 }),

  // ─── JWT (see SECURITY contract above) ──────────────────────────────────
  JWT_ACCESS_SECRET: str({ desc: 'min 32 chars; rotate per env' }),
  JWT_REFRESH_SECRET: str({ desc: 'min 32 chars; MUST differ from access' }),
  JWT_ACCESS_TTL_SEC: num({ default: 900 }),     // 15 minutes
  JWT_REFRESH_TTL_SEC: num({ default: 604800 }), // 7 days

  // ─── Bcrypt ─────────────────────────────────────────────────────────────
  BCRYPT_ROUNDS: num({ default: 10 }),

  // ─── Rate limiting ──────────────────────────────────────────────────────
  LOGIN_RATE_WINDOW_MS: num({ default: 900000 }), // 15 minutes
  LOGIN_RATE_MAX: num({ default: 10 }),

  // ─── Logging ────────────────────────────────────────────────────────────
  LOG_LEVEL: str({ default: 'info' }),
});

// Defensive cross-field invariant: the two JWT secrets MUST be different.
// envalid cannot express this — we assert it manually here, BEFORE the rest
// of the app boots, so the developer sees a precise error instead of a
// subtle "tokens accepted by refresh route" footgun.
if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
  // eslint-disable-next-line no-console
  console.error(
    '\n[env.js] FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are identical.\n' +
    '         Generate two DIFFERENT 32-byte hex strings:\n' +
    '           node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n'
  );
  process.exit(1);
}

// Freeze the object so downstream code cannot accidentally mutate it.
// Object.freeze is shallow; that is sufficient — every value is a primitive.
module.exports = Object.freeze(env);
