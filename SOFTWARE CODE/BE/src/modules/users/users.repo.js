// ============================================================================
// src/modules/users/users.repo.js  —  DAL for /me profile enrichment
// ----------------------------------------------------------------------------
// /me originally only returned what was in the JWT (employee_id, role,
// permissions). Phase 5 needs three more fields for the Equipment Form's
// Section 5 auto-fill: display_name, designation, email.
//
// These live on the legacy employee master `cmms_emp_mst` keyed by
// EMM_ID = users.employee_id (both varchar(7)).
// ============================================================================

'use strict';

const pool = require('../../config/db');

/**
 * Read the employee-side profile fields for a given employee_id.
 * Returns null if no row exists (the JWT user has no matching employee
 * record — unusual but possible for bootstrap accounts).
 *
 * @param {string} employeeId  cmms_emp_mst.EMM_ID
 * @returns {Promise<null | { display_name: string, designation: string, email: string }>}
 */
async function findEmployeeProfile(employeeId) {
  const [rows] = await pool.query(
    `SELECT EMM_NAME       AS display_name,
            EMM_DESIGNATION AS designation,
            EMM_EMAIL      AS email,
            EMM_PH1        AS lab_phone,
            EMM_PH2        AS room_phone,
            EMM_DEPT       AS division_id
       FROM cmms_emp_mst
      WHERE EMM_ID = ?
      LIMIT 1`,
    [employeeId],
  );
  if (!rows[0]) return null;
  // Resolve the division SHORTNAME so the FE doesn't need a second hop.
  const profile = rows[0];
  if (profile.division_id) {
    const [divRows] = await pool.query(
      `SELECT SM_SHORTNAME AS division_code, SM_NAME AS division_name
         FROM cmms_section_mst WHERE SM_ID = ? LIMIT 1`,
      [profile.division_id],
    );
    if (divRows[0]) {
      profile.division_code = divRows[0].division_code;
      profile.division_name = divRows[0].division_name;
    }
  }
  return profile;
}

async function findSsoEmployeeProfile(employeeId) {
  const [rows] = await pool.query(
    `SELECT full_name     AS display_name,
            designation   AS designation,
            email         AS email,
            telephone     AS room_phone,
            lab_telephone AS lab_phone,
            egd_name      AS division_code,
            egd_name      AS division_name,
            is_active,
            last_sso_login_at
       FROM employee_sso_directory
      WHERE employee_id = ?
      LIMIT 1`,
    [employeeId],
  );
  return rows[0] || null;
}

/**
 * Read the users table account metadata for a user.
 */
async function findUserAccountDetails(userId) {
  const [rows] = await pool.query(
    `SELECT is_active, is_locked, last_login_at, created_at, token_version
       FROM users
      WHERE user_id = ?
      LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

/**
 * Read the last 5 authentication audit logs for this employee.
 */
async function findUserLoginHistory(employeeId) {
  const [rows] = await pool.query(
    `SELECT outcome, ip_address, attempt_at, notes
       FROM login_audit
      WHERE employee_id = ?
      ORDER BY audit_id DESC
      LIMIT 5`,
    [employeeId],
  );
  return rows;
}

module.exports = {
  findEmployeeProfile,
  findSsoEmployeeProfile,
  findUserAccountDetails,
  findUserLoginHistory,
};
