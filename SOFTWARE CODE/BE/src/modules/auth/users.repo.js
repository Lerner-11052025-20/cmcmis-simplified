// ============================================================================
// src/modules/auth/users.repo.js  —  Data-access layer for users + RBAC join
// ----------------------------------------------------------------------------
// PURPOSE
//   This file is the ONLY place in the auth module that contains SQL
//   touching `users`, `user_roles`, `roles`, `role_permissions`, or
//   `permissions`. Services / controllers compose these helpers; they
//   do NOT issue queries directly. That contract is what lets us audit
//   SQL injection risk in one place.
//
// SQL RULES (enforced by code review, not by the runtime)
//   1. Every query uses `?` parameter placeholders. NEVER string concat.
//   2. multipleStatements is FALSE on the pool — see config/db.js.
//   3. Return plain objects / arrays. No HTTP concerns leak in here.
//
// SCHEMA REFERENCE (Phase 3 sealed)
//   users:            user_id BIGINT, employee_id VARCHAR(7),
//                     password_hash VARCHAR(60), section_id INT,
//                     is_active TINYINT(1), is_locked TINYINT(1),
//                     failed_login_count SMALLINT, last_login_at DATETIME(6),
//                     last_login_ip VARCHAR(45)
//   user_roles:       user_id (PK alone — enforces single role per user)
//                     role_id
//   roles:            role_id TINYINT, role_code VARCHAR(30)
//   role_permissions: role_id, permission_id  (PK pair)
//   permissions:      permission_id SMALLINT, permission_code VARCHAR(80)
// ============================================================================

'use strict';

const pool = require('../../config/db');

/**
 * Fetch a user by employee_id.
 * Returns the row needed for the login flow's status checks + bcrypt
 * verify, or null if no such user exists.
 *
 * SELECT shape kept narrow — we never want to accidentally serialise a
 * password_hash beyond this layer, so we only pull the columns we need.
 *
 * @param {string} employeeId
 * @returns {Promise<null | {
 *   user_id: number,
 *   employee_id: string,
 *   password_hash: string,
 *   section_id: number | null,
 *   is_active: 0 | 1,
 *   is_locked: 0 | 1,
 *   failed_login_count: number,
 *   last_login_at: Date | null,
 * }>}
 */
async function findByEmployeeId(employeeId) {
  const [rows] = await pool.query(
    `SELECT user_id, employee_id, password_hash, section_id,
            is_active, is_locked, failed_login_count, last_login_at
       FROM users
      WHERE employee_id = ?
      LIMIT 1`,
    [employeeId],
  );
  return rows[0] || null;
}

/**
 * Single round trip to load the user's role_code and every permission_code
 * granted to that role. Returns an empty list (and null role) if no
 * user_roles row exists — that should never happen for a healthy user,
 * but the service layer treats it as "no permissions" rather than
 * crashing.
 *
 * WHY one query instead of three?
 *   The naïve approach is: (1) SELECT role_id FROM user_roles, (2) SELECT
 *   role_code FROM roles, (3) SELECT permission_codes FROM ... — three
 *   round trips. A single JOIN is one round trip and lets MySQL plan
 *   the access (the indexes uk_users_employee_id, idx_rp_perm, and the
 *   role PK make this very cheap).
 *
 * @param {number} userId
 * @returns {Promise<{ role_code: string | null, permissions: string[] }>}
 */
async function loadRoleAndPermissions(userId) {
  const [rows] = await pool.query(
    `SELECT r.role_code, p.permission_code
       FROM user_roles ur
       JOIN roles r            ON r.role_id       = ur.role_id
       JOIN role_permissions rp ON rp.role_id     = ur.role_id
       JOIN permissions p      ON p.permission_id = rp.permission_id
      WHERE ur.user_id = ?`,
    [userId],
  );

  if (rows.length === 0) {
    return { role_code: null, permissions: [] };
  }

  // All rows share the same role_code (single role per user per BR-RBAC-02),
  // so reading it from rows[0] is correct.
  return {
    role_code: rows[0].role_code,
    permissions: rows.map((r) => r.permission_code),
  };
}

/**
 * Increment the user's failed_login_count. Called from service after a
 * bcrypt.compare returns false. We do NOT auto-lock here — locking
 * policy (N strikes → is_locked=1) is owned by the service so the
 * threshold can be tuned in one place.
 *
 * @param {number} userId
 */
async function incrementFailedLogin(userId) {
  await pool.query(
    `UPDATE users
        SET failed_login_count = failed_login_count + 1,
            updated_at         = NOW(6)
      WHERE user_id = ?`,
    [userId],
  );
}

/**
 * Reset the failed-counter and stamp last_login fields after a successful
 * password match. Called from service immediately before issuing JWTs.
 *
 * @param {number} userId
 * @param {string} ipAddress
 */
async function recordSuccessfulLogin(userId, ipAddress) {
  await pool.query(
    `UPDATE users
        SET last_login_at      = NOW(6),
            last_login_ip      = ?,
            failed_login_count = 0,
            updated_at         = NOW(6)
      WHERE user_id = ?`,
    [ipAddress, userId],
  );
}

module.exports = {
  findByEmployeeId,
  loadRoleAndPermissions,
  incrementFailedLogin,
  recordSuccessfulLogin,
};
