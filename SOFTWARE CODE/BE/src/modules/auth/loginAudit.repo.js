// ============================================================================
// src/modules/auth/loginAudit.repo.js  —  login_audit DAL
// ----------------------------------------------------------------------------
// PURPOSE
//   Append-only writer for the login_audit table. Every login attempt
//   (success or failure) and every token refresh / logout is recorded
//   here, satisfying BR-AUTH-06 (audit every authentication event).
//
//   The table intentionally has NO foreign key on employee_id — a
//   failed lookup for an unknown employee_id must still log, so we
//   want to record whatever the user typed even if it doesn't exist.
//   (See migration 001 comment for the same observation.)
//
// USAGE
//   await auditRepo.record({
//     employeeId, outcome: 'SUCCESS',
//     ipAddress, userAgent,
//     notes,        // optional context
//   });
//
// LEGAL OUTCOMES (matches the SQL ENUM)
//   SUCCESS, FAILED_BAD_PASSWORD, FAILED_USER_LOCKED,
//   FAILED_USER_INACTIVE, FAILED_NOT_FOUND, FAILED_INVALID_FORMAT,
//   LOGOUT, TOKEN_REFRESH
// ============================================================================

'use strict';

const pool = require('../../config/db');

const OUTCOMES = [
  'SUCCESS',
  'FAILED_BAD_PASSWORD',
  'FAILED_USER_LOCKED',
  'FAILED_USER_INACTIVE',
  'FAILED_NOT_FOUND',
  'FAILED_INVALID_FORMAT',
  'LOGOUT',
  'TOKEN_REFRESH',
];

/**
 * Append a single row to login_audit.
 *
 * @param {{
 *   employeeId: string,
 *   outcome:    'SUCCESS' | 'FAILED_BAD_PASSWORD' | 'FAILED_USER_LOCKED'
 *              | 'FAILED_USER_INACTIVE' | 'FAILED_NOT_FOUND'
 *              | 'FAILED_INVALID_FORMAT' | 'LOGOUT' | 'TOKEN_REFRESH',
 *   ipAddress?: string | null,
 *   userAgent?: string | null,
 *   notes?:     string | null,
 * }} args
 */
async function record({ employeeId, outcome, ipAddress, userAgent, notes }) {
  if (!OUTCOMES.includes(outcome)) {
    // Crash loudly during development — silently accepting an unknown
    // outcome would let bugs hide in the audit table for years.
    throw new Error(`loginAudit.record: invalid outcome "${outcome}"`);
  }
  await pool.query(
    `INSERT INTO login_audit
       (employee_id, outcome, ip_address, user_agent, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [employeeId, outcome, ipAddress || null, userAgent || null, notes || null],
  );
}

module.exports = { record, OUTCOMES };
