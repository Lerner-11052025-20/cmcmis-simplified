// ============================================================================
// src/modules/dashboard/dashboard.repo.js  —  KPI aggregation queries
// ----------------------------------------------------------------------------
// ONLY file in the dashboard module that contains SQL. Service composes
// the answers; controller never queries directly.
//
// EVERY query here is COUNT-only and read-only. No JOIN-ed wildcard
// SELECTs, no `SELECT *`. Each KPI is its own narrow query so the optimiser
// can pick the smallest index.
//
// TABLES TOUCHED (read-only):
//   cmms_jobrequest_mst    — Phase 6 sealed; canonical via repo aliasing
//   cmms_jobcard_mst       — Phase 6 sealed
//   cmms_eqip_mst          — Phase 5 sealed
//
// COVERING INDEXES (migration 120):
//   idx_eqip_status_caldue
//   idx_eqip_creator_caldue
//   idx_jc_status_verified
//   idx_jc_status_ended
//   (+ existing idx_jr_status, idx_jr_list_default, idx_jr_owner_created)
//
// PERSONAL SCOPE
//   Personal KPIs key off req.user.employeeId — a varchar(7) e.g.
//   'SA79900'. NEVER off user_id (the integer in `users`). This is
//   consistent with Phase 6's row-level-scope middleware which already
//   compares JR_SUBMITTEDBYID to req.user.employeeId.
// ============================================================================

'use strict';

const pool = require('../../config/db');

// ── ORG-variant KPIs ──────────────────────────────────────────────────

/**
 * ORG Card 1 — Pending Jobs:
 *   total  = COUNT(*) WHERE JR_MVP_STATUS='SUBMITTED'
 *   today  = COUNT(*) WHERE JR_MVP_STATUS='SUBMITTED' AND JR_CREATED_AT >= now()-1d
 *
 * Two parallel queries — both cheap (single index range scan).
 *
 * @returns {Promise<{ total: number, today: number }>}
 */
async function orgPendingJobs() {
  const [[totalRow], [todayRow]] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_jobrequest_mst
        WHERE JR_MVP_STATUS = 'SUBMITTED'`
    ),
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_jobrequest_mst
        WHERE JR_MVP_STATUS = 'SUBMITTED'
          AND JR_CREATED_AT >= (NOW(6) - INTERVAL 1 DAY)`
    ),
  ]);
  return {
    total: Number(totalRow[0].n),
    today: Number(todayRow[0].n),
  };
}

/**
 * ORG Card 2 — Calibration Due (within 7 days):
 *   COUNT(*) WHERE EQM_MVP_STATUS='ACTIVE'
 *               AND EQM_CAL_DUE_DATE <= today+7d
 *               AND EQM_CAL_DUE_DATE IS NOT NULL
 *
 * Covered by idx_eqip_status_caldue (mig 120.1).
 *
 * @returns {Promise<{ total: number }>}
 */
async function orgCalibrationDue7d() {
  const [[row]] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_eqip_mst
        WHERE EQM_MVP_STATUS = 'ACTIVE'
          AND EQM_CAL_DUE_DATE IS NOT NULL
          AND EQM_CAL_DUE_DATE <= (CURDATE() + INTERVAL 7 DAY)`
    ),
  ]);
  return { total: Number(row[0].n) };
}

/**
 * ORG Card 3 — Completed This Week:
 *   thisWeek = COUNT(*) WHERE JM_MVP_STATUS IN ('COMPLETED','VERIFIED_CLOSED')
 *                          AND COALESCE(JM_VERIFIED_ON, JM_JobEndDate) >= start_of_iso_week
 *   lastWeek = same window shifted back by 7 days
 *
 * deltaPct = (thisWeek - lastWeek) / max(lastWeek, 1) * 100  (rounded)
 *
 * Week boundary = ISO week (Mon 00:00 local).
 *   start_of_iso_week = DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
 *
 * @returns {Promise<{ thisWeek: number, lastWeek: number }>}
 */
async function orgCompletedThisWeek() {
  // Two queries — same shape, different window. Run in parallel.
  const [[thisRow], [lastRow]] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_jobcard_mst
        WHERE JM_MVP_STATUS IN ('COMPLETED','VERIFIED_CLOSED')
          AND COALESCE(JM_VERIFIED_ON, JM_JobEndDate)
                >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)`
    ),
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_jobcard_mst
        WHERE JM_MVP_STATUS IN ('COMPLETED','VERIFIED_CLOSED')
          AND COALESCE(JM_VERIFIED_ON, JM_JobEndDate)
                >= DATE_SUB(CURDATE(), INTERVAL (WEEKDAY(CURDATE()) + 7) DAY)
          AND COALESCE(JM_VERIFIED_ON, JM_JobEndDate)
                <  DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)`
    ),
  ]);
  return {
    thisWeek: Number(thisRow[0].n),
    lastWeek: Number(lastRow[0].n),
  };
}

/**
 * ORG Card 4 — Equipment Utilization (%):
 *   numerator   = COUNT(DISTINCT (EQM_TYPE, EQM_ID))
 *                   FROM cmms_eqip_mst e
 *                   JOIN cmms_jobcard_mst j
 *                     ON j.JM_EQM_TYPE = e.EQM_TYPE
 *                    AND j.JM_EQM_ID   = e.EQM_ID
 *                   WHERE e.EQM_MVP_STATUS = 'ACTIVE'
 *                     AND j.JM_MVP_STATUS NOT IN ('VERIFIED_CLOSED','REOPENED')
 *   denominator = COUNT(*) WHERE EQM_MVP_STATUS = 'ACTIVE'
 *
 * The numerator uses a correlated subquery via EXISTS for clarity + index
 * use. (Indexed lookup on cmms_jobcard_mst by JM_MVP_STATUS exists in
 * legacy DB; cmms_eqip_mst.PK is (EQM_TYPE, EQM_ID) — the EXISTS lookup
 * hits the PK every time.)
 *
 * @returns {Promise<{ active: number, withOpenWork: number }>}
 */
async function orgEquipmentUtilization() {
  const [[row]] = await Promise.all([
    pool.query(
      `SELECT
          SUM(CASE WHEN EXISTS (
                SELECT 1 FROM cmms_jobcard_mst j
                 WHERE j.JM_EQM_TYPE = e.EQM_TYPE
                   AND j.JM_EQM_ID   = e.EQM_ID
                   AND j.JM_MVP_STATUS NOT IN ('VERIFIED_CLOSED','REOPENED')
              ) THEN 1 ELSE 0 END)                 AS with_open_work,
          COUNT(*)                                  AS active_total
         FROM cmms_eqip_mst e
        WHERE e.EQM_MVP_STATUS = 'ACTIVE'`
    ),
  ]);
  return {
    active: Number(row[0].active_total),
    withOpenWork: Number(row[0].with_open_work) || 0,
  };
}

// ── PERSONAL-variant KPIs ─────────────────────────────────────────────

/**
 * MY Card 1 — Active Requests + pending approval sub-count.
 *
 * @param {string} employeeId
 * @returns {Promise<{ active: number, pendingApproval: number }>}
 */
async function myActiveRequests(employeeId) {
  const [[activeRow], [pendingRow]] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_jobrequest_mst
        WHERE JR_SUBMITTEDBYID = ?
          AND JR_MVP_STATUS IN ('DRAFT','SUBMITTED','ASSIGNED','IN_PROGRESS')`,
      [employeeId]
    ),
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_jobrequest_mst
        WHERE JR_SUBMITTEDBYID = ?
          AND JR_MVP_STATUS = 'SUBMITTED'`,
      [employeeId]
    ),
  ]);
  return {
    active: Number(activeRow[0].n),
    pendingApproval: Number(pendingRow[0].n),
  };
}

/**
 * MY Card 2 — In Progress (mine).
 *
 * @param {string} employeeId
 * @returns {Promise<{ total: number }>}
 */
async function myInProgress(employeeId) {
  const [[row]] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_jobrequest_mst
        WHERE JR_SUBMITTEDBYID = ?
          AND JR_MVP_STATUS = 'IN_PROGRESS'`,
      [employeeId]
    ),
  ]);
  return { total: Number(row[0].n) };
}

/**
 * MY Card 3 — Completed This Month + delta vs last month.
 *
 * @param {string} employeeId
 * @returns {Promise<{ thisMonth: number, lastMonth: number }>}
 */
async function myCompletedThisMonth(employeeId) {
  const [[thisRow], [lastRow]] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_jobrequest_mst
        WHERE JR_SUBMITTEDBYID = ?
          AND JR_MVP_STATUS = 'VERIFIED_CLOSED'
          AND JR_MVP_STATUS_AT >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
      [employeeId]
    ),
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_jobrequest_mst
        WHERE JR_SUBMITTEDBYID = ?
          AND JR_MVP_STATUS = 'VERIFIED_CLOSED'
          AND JR_MVP_STATUS_AT >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
          AND JR_MVP_STATUS_AT <  DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
      [employeeId]
    ),
  ]);
  return {
    thisMonth: Number(thisRow[0].n),
    lastMonth: Number(lastRow[0].n),
  };
}

/**
 * MY Card 4 — Due for Calibration (mine, next 30 days).
 *   `mine` = equipment I personally registered (EQM_CREATED_BY = ?).
 *
 * @param {string} employeeId
 * @returns {Promise<{ total: number }>}
 */
async function myCalibrationDue30d(employeeId) {
  const [[row]] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_eqip_mst
        WHERE EQM_CREATED_BY = ?
          AND EQM_MVP_STATUS = 'ACTIVE'
          AND EQM_CAL_DUE_DATE IS NOT NULL
          AND EQM_CAL_DUE_DATE <= (CURDATE() + INTERVAL 30 DAY)`,
      [employeeId]
    ),
  ]);
  return { total: Number(row[0].n) };
}

module.exports = {
  // ORG
  orgPendingJobs,
  orgCalibrationDue7d,
  orgCompletedThisWeek,
  orgEquipmentUtilization,
  // MY
  myActiveRequests,
  myInProgress,
  myCompletedThisMonth,
  myCalibrationDue30d,
};
