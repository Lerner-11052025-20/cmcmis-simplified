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
    `SELECT EMM_NAME AS display_name,
            EMM_DESIGNATION AS designation,
            EMM_EMAIL AS email
       FROM cmms_emp_mst
      WHERE EMM_ID = ?
      LIMIT 1`,
    [employeeId],
  );
  return rows[0] || null;
}

module.exports = { findEmployeeProfile };
