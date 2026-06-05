// ============================================================================
// src/modules/auth/ssoRefreshTokens.repo.js - SSO refresh token DAL
// ----------------------------------------------------------------------------
// Mirrors refreshTokens.repo.js but points at sso_refresh_tokens and
// employee_sso_directory so the legacy users table remains untouched.
// ============================================================================

'use strict';

const pool = require('../../config/db');
const { sha256 } = require('../../utils/crypto');

const REVOKE_REASONS = ['LOGOUT', 'ROTATED', 'ADMIN_REVOKE', 'EXPIRY_CLEANUP'];

async function persist({ ssoUserId, rawToken, expiresAt, userAgent, ipAddress }) {
  const tokenHash = sha256(rawToken);
  await pool.query(
    `INSERT INTO sso_refresh_tokens
       (sso_user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?)`,
    [ssoUserId, tokenHash, expiresAt, userAgent || null, ipAddress || null],
  );
  return tokenHash;
}

async function findValid(rawToken) {
  const tokenHash = sha256(rawToken);
  const [rows] = await pool.query(
    `SELECT token_id, sso_user_id, expires_at
       FROM sso_refresh_tokens
      WHERE token_hash = ?
        AND revoked_at IS NULL
        AND expires_at > NOW(6)
      LIMIT 1`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function revoke(rawToken, reason) {
  if (!REVOKE_REASONS.includes(reason)) {
    throw new Error(`ssoRefreshTokens.revoke: invalid reason "${reason}"`);
  }
  const tokenHash = sha256(rawToken);
  await pool.query(
    `UPDATE sso_refresh_tokens
        SET revoked_at     = NOW(6),
            revoked_reason = ?
      WHERE token_hash = ?
        AND revoked_at IS NULL`,
    [reason, tokenHash],
  );
}

async function revokeAllForUser(ssoUserId, reason) {
  if (!REVOKE_REASONS.includes(reason)) {
    throw new Error(`ssoRefreshTokens.revokeAllForUser: invalid reason "${reason}"`);
  }
  await pool.query(
    `UPDATE sso_refresh_tokens
        SET revoked_at     = NOW(6),
            revoked_reason = ?
      WHERE sso_user_id = ?
        AND revoked_at IS NULL`,
    [reason, ssoUserId],
  );
}

module.exports = { persist, findValid, revoke, revokeAllForUser, REVOKE_REASONS };
