// ============================================================================
// src/modules/notifications/notifications.recipients.js  —  Recipient resolver
// ----------------------------------------------------------------------------
// PHASE 12 — Notifications
//
// PURPOSE
//   Centralise "who should be notified" logic so JR / JC service files
//   don't grow ad-hoc SQL for fan-out targets. Per BR-RBAC-03, we
//   resolve recipients by PERMISSION (not role-name) so future role
//   reshuffles cascade automatically.
//
// CACHING
//   `getActiveEmployeesWithPermission()` hits a small permission-graph
//   read on every workflow event. The result is cached in-process with
//   a 60 s TTL — long enough to absorb a burst of events, short enough
//   that an admin's role-change is visible within a minute. The cache
//   is per-permission-code; invalidation is purely time-based (no
//   manual flush — admin role mutations are infrequent enough).
//
// VIEW-ONLY EXCLUSION
//   View-Only users hold neither `notifications:read-own` nor any of the
//   managerial permissions, so they NEVER appear in recipient lists.
//   No explicit role filter is needed — the permission grants are the
//   exclusion.
// ============================================================================

'use strict';

const pool = require('../../config/db');

// ── In-process micro-cache ────────────────────────────────────────────
//   Map<permissionCode|permissionCode::lane, { employees: string[], at: number }>
const TTL_MS = 60 * 1000;
const cache  = new Map();


/**
 * List employee_ids of every ACTIVE user who holds the given permission.
 * Used by emit callers to fan out managerial notifications (e.g. "all
 * LIC + SA" by querying for the `job_request:approve` permission).
 *
 * @param {string} permissionCode  e.g. 'job_request:approve'
 * @returns {Promise<string[]>}    Array of VARCHAR(7) employee_ids
 */
async function getActiveEmployeesWithPermission(permissionCode, laneCode = null) {
  const cacheKey = laneCode ? `${permissionCode}::${laneCode}` : permissionCode;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return cached.employees;
  }

  const [rows] = await pool.query(
    `SELECT DISTINCT u.employee_id
       FROM users u
       JOIN user_roles ur     ON ur.user_id       = u.user_id
       JOIN roles r           ON r.role_id        = ur.role_id
       JOIN role_permissions rp ON rp.role_id     = ur.role_id
       JOIN permissions p     ON p.permission_id = rp.permission_id
       LEFT JOIN user_lane_scopes uls ON uls.user_id = u.user_id
      WHERE p.permission_code = ?
        AND u.is_active       = 1
        AND u.employee_id     IS NOT NULL
        AND (
          ? IS NULL
          OR r.role_code IN ('SUPER_ADMIN', 'LAB_IN_CHARGE', 'LAB_ENGINEER')
          OR uls.lane_code = ?
        )`,
    [permissionCode, laneCode, laneCode],
  );
  const employees = rows.map((r) => r.employee_id);
  cache.set(cacheKey, { employees, at: Date.now() });
  return employees;
}


/**
 * Convenience: managerial-tier recipients (LIC + SA) — i.e. users
 * holding `job_request:approve`. We chose this permission rather than
 * `job_card:verify-close` because:
 *   • Both currently resolve to the same set in Phase 3 seeds.
 *   • approve is semantically "this person manages the work queue",
 *     which is the better fit for nearly every managerial event.
 * If the two grants ever diverge, override per call-site.
 *
 * @returns {Promise<string[]>}
 */
async function getManagerialRecipients(laneCode = null) {
  return getActiveEmployeesWithPermission('job_request:approve', laneCode);
}


/** Invalidate cache — exported for unit tests + future admin tooling. */
function invalidateCache(permissionCode) {
  if (permissionCode) cache.delete(permissionCode);
  else                cache.clear();
}


module.exports = {
  getActiveEmployeesWithPermission,
  getManagerialRecipients,
  invalidateCache,
};
