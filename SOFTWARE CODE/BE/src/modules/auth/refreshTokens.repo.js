// ============================================================================
// src/modules/auth/refreshTokens.repo.js  —  refresh_tokens DAL
// ----------------------------------------------------------------------------
// PURPOSE
//   CRUD over the refresh_tokens table. The raw JWT is NEVER persisted —
//   only its SHA-256 hex digest. If the DB is leaked, the attacker holds
//   a column of irreversible hashes; without the original JWT signatures
//   they cannot mint sessions.
//
// SCHEMA (Phase 3 sealed)
//   token_id        BIGINT PK
//   user_id         BIGINT
//   token_hash      VARCHAR(64)  UNIQUE   ← sha256 hex
//   issued_at       DATETIME(6)  default NOW(6)
//   expires_at      DATETIME(6)
//   revoked_at      DATETIME(6)  NULL
//   revoked_reason  ENUM('LOGOUT','ROTATED','ADMIN_REVOKE',
//                        'PASSWORD_CHANGE','EXPIRY_CLEANUP')
//   user_agent      VARCHAR(500)
//   ip_address      VARCHAR(45)
//
// LIFECYCLE
//   persist()           — called once per /login and once per /refresh
//                         success (after revoking the old token).
//   findValid()         — called on every /refresh. Returns null for
//                         missing / revoked / expired tokens. The
//                         missing case is how we detect token theft.
//   revoke()            — single-token revoke (LOGOUT or ROTATED).
//   revokeAllForUser()  — defensive sweep when theft is suspected.
// ============================================================================

'use strict';

const pool = require('../../config/db');
const { sha256 } = require('../../utils/crypto');

// Enum of legal revoke reasons; matches the SQL ENUM exactly. Service
// layer passes one of these and gets a clear error if it strays.
const REVOKE_REASONS = ['LOGOUT', 'ROTATED', 'ADMIN_REVOKE', 'PASSWORD_CHANGE', 'EXPIRY_CLEANUP'];

/**
 * Persist a new refresh token. The raw JWT is hashed first; only the
 * hash hits the DB.
 *
 * @param {{
 *   userId: number,
 *   rawToken: string,
 *   expiresAt: Date,
 *   userAgent?: string | null,
 *   ipAddress?: string | null,
 * }} args
 * @returns {Promise<string>} the sha256 hex that was stored (handy for tests)
 */
async function persist({ userId, rawToken, expiresAt, userAgent, ipAddress }) {
  const tokenHash = sha256(rawToken);
  await pool.query(
    `INSERT INTO refresh_tokens
       (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, tokenHash, expiresAt, userAgent || null, ipAddress || null],
  );
  return tokenHash;
}

/**
 * Look up a refresh token by its hash. Returns null for any reason
 * the token should NOT be honoured (missing, revoked, expired).
 *
 * NOTE: returning null on revoked OR expired is intentional — the
 * caller (refresh service) treats both the same way (re-login required).
 * Distinguishing them is only useful for telemetry, which we capture
 * via login_audit.
 *
 * @param {string} rawToken
 * @returns {Promise<null | { token_id: number, user_id: number, expires_at: Date }>}
 */
async function findValid(rawToken) {
  const tokenHash = sha256(rawToken);
  const [rows] = await pool.query(
    `SELECT token_id, user_id, expires_at
       FROM refresh_tokens
      WHERE token_hash = ?
        AND revoked_at IS NULL
        AND expires_at > NOW(6)
      LIMIT 1`,
    [tokenHash],
  );
  return rows[0] || null;
}

/**
 * Single-token revoke. Idempotent — if the row is already revoked the
 * UPDATE simply touches zero rows and we don't care.
 *
 * @param {string} rawToken
 * @param {'LOGOUT' | 'ROTATED' | 'ADMIN_REVOKE' | 'PASSWORD_CHANGE' | 'EXPIRY_CLEANUP'} reason
 */
async function revoke(rawToken, reason) {
  if (!REVOKE_REASONS.includes(reason)) {
    throw new Error(`refreshTokens.revoke: invalid reason "${reason}"`);
  }
  const tokenHash = sha256(rawToken);
  await pool.query(
    `UPDATE refresh_tokens
        SET revoked_at     = NOW(6),
            revoked_reason = ?
      WHERE token_hash = ?
        AND revoked_at IS NULL`,
    [reason, tokenHash],
  );
}

/**
 * Revoke every still-valid refresh token belonging to a user. Called by
 * the theft-detection branch of the refresh flow ("valid signature but
 * not in DB" pattern) and by password-change / admin revoke flows.
 *
 * @param {number} userId
 * @param {'ADMIN_REVOKE' | 'PASSWORD_CHANGE'} reason
 */
async function revokeAllForUser(userId, reason) {
  if (!REVOKE_REASONS.includes(reason)) {
    throw new Error(`refreshTokens.revokeAllForUser: invalid reason "${reason}"`);
  }
  await pool.query(
    `UPDATE refresh_tokens
        SET revoked_at     = NOW(6),
            revoked_reason = ?
      WHERE user_id    = ?
        AND revoked_at IS NULL`,
    [reason, userId],
  );
}

module.exports = { persist, findValid, revoke, revokeAllForUser, REVOKE_REASONS };
