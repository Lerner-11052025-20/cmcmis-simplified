// ============================================================================
// src/modules/auth/auth.service.js  —  Auth business logic
// ----------------------------------------------------------------------------
// PURPOSE
//   Where authentication actually happens. Composes the three repos
//   (users, refreshTokens, loginAudit), applies the BR-AUTH-* business
//   rules, and either returns a JWT pair or throws a typed AppError
//   that the global error handler turns into the standard envelope.
//
// FUNCTIONS
//   login()    — username/password → JWT pair (+ persisted refresh hash)
//   refresh()  — old refresh token → new JWT pair (with rotation + theft
//                detection)
//   logout()   — revoke a refresh token (idempotent) + audit
//
// SECURITY-CRITICAL DECISIONS DOCUMENTED INLINE BELOW.
//   The single most important behaviour to understand is the THEFT
//   DETECTION block in refresh(): when a refresh JWT has a valid
//   signature but its hash is NOT found in refresh_tokens (or is
//   revoked), we treat that as evidence the legitimate user's prior
//   refresh was already replayed by an attacker — and we revoke EVERY
//   refresh token for that user. Both attacker and legit user get
//   logged out; the attacker loses persistent access. The legit user
//   re-authenticates with their password, which the attacker does not
//   have.
// ============================================================================

'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');

const jwtCfg = require('../../config/jwt');
const { errors } = require('../../middleware/errorHandler');

const usersRepo = require('./users.repo');
const refreshRepo = require('./refreshTokens.repo');
const auditRepo = require('./loginAudit.repo');

// ── Local helpers ────────────────────────────────────────────────────────

/**
 * Build the access-token payload shape we put inside the JWT.
 * Centralised so login() and refresh() can't drift.
 */
function buildAccessPayload(user, role_code, permissions) {
  return {
    sub: user.employee_id, // canonical subject — what authenticate.js maps to employeeId
    uid: user.user_id,
    role: role_code,
    permissions,
  };
}

/**
 * Sign an access JWT. JTI included so we could maintain a revocation
 * list per-token later if the threat model demands it.
 */
function signAccess(payload, userId) {
  return jwt.sign(payload, jwtCfg.accessSecret, {
    algorithm: jwtCfg.alg,
    expiresIn: jwtCfg.accessTtlSec,
    jwtid: `acc_${Date.now()}_${userId}`,
  });
}

/**
 * Sign a refresh JWT. The body is intentionally tiny — refresh tokens
 * carry only what's needed to look up the user. Permissions are reloaded
 * on every /refresh, so the access token's permissions array always
 * reflects the latest role grants (BR-RBAC-07).
 */
function signRefresh(user) {
  return jwt.sign(
    { sub: user.employee_id, uid: user.user_id, type: 'refresh' },
    jwtCfg.refreshSecret,
    {
      algorithm: jwtCfg.alg,
      expiresIn: jwtCfg.refreshTtlSec,
      jwtid: `ref_${Date.now()}_${user.user_id}`,
    },
  );
}

// ────────────────────────────────────────────────────────────────────────
//  login
// ────────────────────────────────────────────────────────────────────────
/**
 * Authenticate by employee_id + password.
 *
 * BUSINESS RULES (BR-AUTH-01 … 07)
 *   • Unknown employee_id → 401 with generic 'Invalid credentials'.
 *     We never reveal whether the username exists (user enumeration).
 *   • is_active = 0  → 401 'Invalid credentials' (same opaque message).
 *   • is_locked = 1  → 401 'Invalid credentials'.
 *   • bcrypt.compare returns false → increment failed_login_count, 401.
 *   • Successful auth → reset failed_login_count, stamp last_login_*,
 *     persist refresh hash, audit SUCCESS, return tokens.
 *
 * @param {{
 *   employeeId: string,
 *   password:   string,
 *   ipAddress:  string,
 *   userAgent?: string,
 * }} args
 * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
 */
async function login({ employeeId, password, ipAddress, userAgent }) {
  const GENERIC_FAIL = 'Invalid credentials';

  // 1) Lookup
  const user = await usersRepo.findByEmployeeId(employeeId);
  if (!user) {
    await auditRepo.record({ employeeId, outcome: 'FAILED_NOT_FOUND', ipAddress, userAgent });
    throw errors.unauthorized(GENERIC_FAIL);
  }

  // 2) Status gates — return the SAME generic message for all of these
  //    so a probing attacker can't distinguish "user exists but locked"
  //    from "user does not exist".
  if (!user.is_active) {
    await auditRepo.record({ employeeId, outcome: 'FAILED_USER_INACTIVE', ipAddress, userAgent });
    throw errors.unauthorized(GENERIC_FAIL);
  }
  if (user.is_locked) {
    await auditRepo.record({ employeeId, outcome: 'FAILED_USER_LOCKED', ipAddress, userAgent });
    throw errors.unauthorized(GENERIC_FAIL);
  }

  // 3) Password compare (intentionally slow — ~80ms at cost 10)
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    await usersRepo.incrementFailedLogin(user.user_id);
    await auditRepo.record({ employeeId, outcome: 'FAILED_BAD_PASSWORD', ipAddress, userAgent });
    throw errors.unauthorized(GENERIC_FAIL);
  }

  // 4) Load role + permissions in one JOIN
  const { role_code, permissions } = await usersRepo.loadRoleAndPermissions(user.user_id);

  // 5) Mint tokens
  const accessPayload = buildAccessPayload(user, role_code, permissions);
  const accessToken = signAccess(accessPayload, user.user_id);
  const refreshToken = signRefresh(user);

  // 6) Persist refresh hash (sha256 of the JWT — raw never stored)
  const expiresAt = dayjs().add(jwtCfg.refreshTtlSec, 'second').toDate();
  await refreshRepo.persist({
    userId: user.user_id,
    rawToken: refreshToken,
    expiresAt,
    userAgent,
    ipAddress,
  });

  // 7) Stamp last_login_* and reset failed counter
  await usersRepo.recordSuccessfulLogin(user.user_id, ipAddress);

  // 8) Audit success
  await auditRepo.record({ employeeId, outcome: 'SUCCESS', ipAddress, userAgent });

  return { accessToken, refreshToken, user: accessPayload };
}

// ────────────────────────────────────────────────────────────────────────
//  refresh  —  with rotation + theft detection
// ────────────────────────────────────────────────────────────────────────
/**
 * Exchange a still-valid refresh token for a new access+refresh pair.
 *
 * ROTATION
 *   On every successful refresh we MINT a brand-new refresh token and
 *   immediately REVOKE the one that was presented. This means a stolen
 *   refresh token works once: the next legitimate refresh fails (token
 *   already revoked) which triggers the theft-detection branch.
 *
 * THEFT DETECTION
 *   If a refresh arrives whose JWT signature is valid but whose hash is
 *   either revoked or missing from refresh_tokens, that is evidence the
 *   token was previously replayed. We respond by revoking EVERY refresh
 *   row for that user — kicking attacker and legit user out — and force
 *   a full re-login. The legit user still has their password; the
 *   attacker does not.
 *
 * BR-RBAC-07 — permissions take effect on refresh
 *   We re-read role_code + permissions on every refresh, so an admin
 *   changing a user's role propagates within (at most) one 15-minute
 *   access-token lifetime.
 *
 * @param {{ rawRefreshToken?: string | null, ipAddress: string, userAgent?: string }} args
 */
async function refresh({ rawRefreshToken, ipAddress, userAgent }) {
  if (!rawRefreshToken) {
    throw errors.unauthorized('No refresh token');
  }

  // 1) Signature + expiry check via jsonwebtoken
  let payload;
  try {
    payload = jwt.verify(rawRefreshToken, jwtCfg.refreshSecret, {
      algorithms: [jwtCfg.alg],
    });
  } catch (_e) {
    throw errors.unauthorized('Invalid refresh token');
  }

  // 2) Must exist + be unrevoked + unexpired in our DB
  const stored = await refreshRepo.findValid(rawRefreshToken);
  if (!stored) {
    // ★ THEFT DETECTION ★ — see header for rationale
    // payload.uid is the user_id encoded in the (signature-valid) JWT.
    await refreshRepo.revokeAllForUser(payload.uid, 'ADMIN_REVOKE');
    throw errors.unauthorized('Refresh token not recognised — please sign in again');
  }

  // 3) Rotate: revoke the presented token now, before issuing a new one.
  //    Done BEFORE we mint the replacement so a crash between the two
  //    leaves the user in a "force re-login" state rather than a "two
  //    valid tokens in the wild" state.
  await refreshRepo.revoke(rawRefreshToken, 'ROTATED');

  // 4) Reload user — role / status may have changed since last login.
  const user = await usersRepo.findByEmployeeId(payload.sub);
  if (!user || !user.is_active || user.is_locked) {
    throw errors.unauthorized('User account is no longer active');
  }
  const { role_code, permissions } = await usersRepo.loadRoleAndPermissions(user.user_id);

  // 5) Mint new pair
  const accessPayload = buildAccessPayload(user, role_code, permissions);
  const accessToken = signAccess(accessPayload, user.user_id);
  const newRefreshToken = signRefresh(user);

  // 6) Persist new refresh hash
  const expiresAt = dayjs().add(jwtCfg.refreshTtlSec, 'second').toDate();
  await refreshRepo.persist({
    userId: user.user_id,
    rawToken: newRefreshToken,
    expiresAt,
    userAgent,
    ipAddress,
  });

  // 7) Audit
  await auditRepo.record({
    employeeId: user.employee_id,
    outcome: 'TOKEN_REFRESH',
    ipAddress,
    userAgent,
  });

  return { accessToken, refreshToken: newRefreshToken, user: accessPayload };
}

// ────────────────────────────────────────────────────────────────────────
//  logout
// ────────────────────────────────────────────────────────────────────────
/**
 * Revoke the presented refresh token and audit a LOGOUT row.
 * Idempotent — if the cookie is missing we do nothing and 204.
 *
 * @param {{ rawRefreshToken?: string | null, employeeId?: string | null,
 *           ipAddress: string, userAgent?: string }} args
 */
async function logout({ rawRefreshToken, employeeId, ipAddress, userAgent }) {
  if (rawRefreshToken) {
    await refreshRepo.revoke(rawRefreshToken, 'LOGOUT');
  }
  if (employeeId) {
    await auditRepo.record({ employeeId, outcome: 'LOGOUT', ipAddress, userAgent });
  }
}

module.exports = { login, refresh, logout };
