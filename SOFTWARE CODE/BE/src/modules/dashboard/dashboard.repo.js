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
const { buildLaneWhere } = require('../../utils/lanes');

function laneClause(columnSql, laneScopes, prefix = 'AND') {
  if (!Array.isArray(laneScopes) || laneScopes.length === 0) {
    return { sql: '', args: [] };
  }
  const lane = buildLaneWhere(columnSql, laneScopes);
  return { sql: `${prefix} ${lane.sql}`, args: lane.args };
}

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
async function orgPendingJobs(laneScopes = []) {
  const lane = laneClause('JR_LANE_CODE', laneScopes);
  const [[totalRow], [todayRow]] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_jobrequest_mst
        WHERE JR_MVP_STATUS = 'SUBMITTED'
          ${lane.sql}`,
      lane.args
    ),
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_jobrequest_mst
        WHERE JR_MVP_STATUS = 'SUBMITTED'
          AND JR_CREATED_AT >= (NOW(6) - INTERVAL 1 DAY)
          ${lane.sql}`,
      lane.args
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
async function orgCompletedThisWeek(laneScopes = []) {
  const lane = laneClause('JM_LANE_CODE', laneScopes);
  // Two queries — same shape, different window. Run in parallel.
  const [[thisRow], [lastRow]] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_jobcard_mst
        WHERE JM_MVP_STATUS IN ('COMPLETED','VERIFIED_CLOSED')
          AND COALESCE(JM_VERIFIED_ON, JM_JobEndDate)
                >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
          ${lane.sql}`,
      lane.args
    ),
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_jobcard_mst
        WHERE JM_MVP_STATUS IN ('COMPLETED','VERIFIED_CLOSED')
          AND COALESCE(JM_VERIFIED_ON, JM_JobEndDate)
                >= DATE_SUB(CURDATE(), INTERVAL (WEEKDAY(CURDATE()) + 7) DAY)
          AND COALESCE(JM_VERIFIED_ON, JM_JobEndDate)
                <  DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
          ${lane.sql}`,
      lane.args
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

// ── ORG CARD 4 (replacement) — Total Active Equipment ─────────────────
/**
 * ORG Card 4 — Total active equipment in the org + count added this week.
 *
 * @returns {Promise<{ total: number, thisWeek: number }>}
 */
async function orgTotalActiveEquipment() {
  const [[totalRow], [weekRow]] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_eqip_mst
        WHERE EQM_MVP_STATUS = 'ACTIVE'`
    ),
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_eqip_mst
        WHERE EQM_MVP_STATUS = 'ACTIVE'
          AND EQM_CREATED_ON >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)`
    ),
  ]);
  return {
    total:    Number(totalRow[0].n),
    thisWeek: Number(weekRow[0].n),
  };
}

// ── ORG CARD 5 — In Progress Jobs ────────────────────────────────────
/**
 * ORG Card 5 — Job Requests currently IN_PROGRESS (assigned to an
 * engineer and work has started, not yet completed).
 *
 * @returns {Promise<{ total: number }>}
 */
async function orgInProgressJobs(laneScopes = []) {
  const lane = laneClause('JR_LANE_CODE', laneScopes);
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n
       FROM cmms_jobrequest_mst
      WHERE JR_MVP_STATUS = 'IN_PROGRESS'
        AND JR_CANCELLED_AT IS NULL
        ${lane.sql}`,
    lane.args
  );
  return { total: Number(rows[0].n) };
}

// ── ORG CARD 6 — Open Job Cards ──────────────────────────────────────
/**
 * ORG Card 6 — Job Cards not yet COMPLETED or VERIFIED_CLOSED.
 * Counts OPEN + IN_PROGRESS + REOPENED states — these all need action.
 *
 * @returns {Promise<{ total: number }>}
 */
async function orgOpenJobCards(laneScopes = []) {
  const lane = laneClause('JM_LANE_CODE', laneScopes);
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n
       FROM cmms_jobcard_mst
      WHERE JM_MVP_STATUS NOT IN ('COMPLETED', 'VERIFIED_CLOSED')
        ${lane.sql}`,
    lane.args
  );
  return { total: Number(rows[0].n) };
}

// ── ORG CARD 7 — Overdue Calibrations ────────────────────────────────
/**
 * ORG Card 7 — Active equipment whose calibration due date is in the past.
 * These are PAST-DUE (not upcoming) — more urgent than Card 2.
 *
 * @returns {Promise<{ total: number }>}
 */
async function orgOverdueCalibrations() {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n
       FROM cmms_eqip_mst
      WHERE EQM_MVP_STATUS = 'ACTIVE'
        AND EQM_CAL_DUE_DATE IS NOT NULL
        AND EQM_CAL_DUE_DATE < CURDATE()`
  );
  return { total: Number(rows[0].n) };
}

// ── ORG CARD 8 — New Equipment This Week ─────────────────────────────
/**
 * ORG Card 8 — Equipment registered since the start of the current ISO week.
 * Gives the team a "how busy are we registering?" pulse.
 *
 * @returns {Promise<{ total: number, lastWeek: number }>}
 */
async function orgNewEquipmentThisWeek() {
  const weekStart  = 'DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)';
  const lastWkStart = 'DATE_SUB(CURDATE(), INTERVAL (WEEKDAY(CURDATE()) + 7) DAY)';
  const [[thisRow], [lastRow]] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_eqip_mst
        WHERE EQM_CREATED_ON >= ${weekStart}`
    ),
    pool.query(
      `SELECT COUNT(*) AS n
         FROM cmms_eqip_mst
        WHERE EQM_CREATED_ON >= ${lastWkStart}
          AND EQM_CREATED_ON <  ${weekStart}`
    ),
  ]);
  return {
    total:    Number(thisRow[0].n),
    lastWeek: Number(lastRow[0].n),
  };
}

// ── MY CARD 5 — Draft Requests ────────────────────────────────────────
/**
 * MY Card 5 — How many of the user's job requests are still in DRAFT
 * (created but not yet submitted).
 *
 * @param {string} employeeId
 * @returns {Promise<{ total: number }>}
 */
async function myDraftRequests(employeeId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n
       FROM cmms_jobrequest_mst
      WHERE JR_SUBMITTEDBYID = ?
        AND JR_MVP_STATUS = 'DRAFT'
        AND JR_CANCELLED_AT IS NULL`,
    [employeeId]
  );
  return { total: Number(rows[0].n) };
}

// ── MY CARD 6 — My Equipment Count ───────────────────────────────────
/**
 * MY Card 6 — Total active equipment registered by this user.
 *
 * @param {string} employeeId
 * @returns {Promise<{ total: number }>}
 */
async function myEquipmentCount(employeeId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n
       FROM cmms_eqip_mst
      WHERE EQM_CREATED_BY = ?
        AND EQM_MVP_STATUS = 'ACTIVE'`,
    [employeeId]
  );
  return { total: Number(rows[0].n) };
}

// ── MY CARD 7 — Overdue Calibrations (mine) ───────────────────────────
/**
 * MY Card 7 — My registered equipment that is past its calibration due date.
 *
 * @param {string} employeeId
 * @returns {Promise<{ total: number }>}
 */
async function myOverdueCalibrations(employeeId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n
       FROM cmms_eqip_mst
      WHERE EQM_CREATED_BY = ?
        AND EQM_MVP_STATUS = 'ACTIVE'
        AND EQM_CAL_DUE_DATE IS NOT NULL
        AND EQM_CAL_DUE_DATE < CURDATE()`,
    [employeeId]
  );
  return { total: Number(rows[0].n) };
}

// ── MY CARD 8 — Approved & Queued ────────────────────────────────────
/**
 * MY Card 8 — My job requests that have been approved (ASSIGNED) but
 * for which work has not yet started. These are queued at the engineer.
 *
 * @param {string} employeeId
 * @returns {Promise<{ total: number }>}
 */
async function myApprovedQueued(employeeId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n
       FROM cmms_jobrequest_mst
      WHERE JR_SUBMITTEDBYID = ?
        AND JR_MVP_STATUS = 'ASSIGNED'
        AND JR_CANCELLED_AT IS NULL`,
    [employeeId]
  );
  return { total: Number(rows[0].n) };
}

// ── RECENT ACTIVITY (org-wide or personal) ────────────────────────────
/**
 * Fetch recent activity logs for the Quick Recap panel.
 * Each category returns up to 7 rows ordered newest-first.
 *
 * @param {'org' | 'my'} variant
 * @param {string}       [employeeId]  Required when variant === 'my'.
 * @returns {Promise<{
 *   job_requests: Array<Object>,
 *   job_cards:    Array<Object>,
 *   equipment:    Array<Object>
 * }>}
 */
async function recentActivity(variant, employeeId, laneScopes = []) {
  // ── predicates ──────────────────────────────────────────────────────
  const jrScope  = variant === 'my' ? 'AND jr.JR_SUBMITTEDBYID = ?' : '';
  const jcScope  = variant === 'my' ? 'AND submitter.JR_SUBMITTEDBYID = ?' : '';
  const eqScope  = variant === 'my' ? 'AND e.EQM_CREATED_BY = ?' : '';
  const scopeArg = variant === 'my' ? [employeeId] : [];
  const jrLane   = variant === 'org' ? laneClause('jr.JR_LANE_CODE', laneScopes) : { sql: '', args: [] };
  const jcLane   = variant === 'org' ? laneClause('jc.JM_LANE_CODE', laneScopes) : { sql: '', args: [] };

  // Run all three in parallel — independent reads.
  const [[jrRows], [jcRows], [eqRows]] = await Promise.all([
    // Recent Job Requests
    pool.query(
      `SELECT
          jr.JR_JOBREQUESTNO    AS jr_no,
          jr.JR_EQM_NAME        AS equipment_name,
          jr.JR_MVP_STATUS      AS status,
          jr.JR_LANE_CODE       AS lane_code,
          jr.JR_SUBMITTEDBYNAME AS actor_name,
          jr.JR_SUBMITTEDBYID   AS actor_id,
          COALESCE(jr.JR_MVP_STATUS_AT, jr.JR_UPDATED_AT, jr.JR_CREATED_AT) AS time_at
         FROM cmms_jobrequest_mst jr
        WHERE jr.JR_CANCELLED_AT IS NULL
          ${jrScope}
          ${jrLane.sql}
        ORDER BY COALESCE(jr.JR_MVP_STATUS_AT, jr.JR_UPDATED_AT, jr.JR_CREATED_AT) DESC
        LIMIT 7`,
      [...scopeArg, ...jrLane.args]
    ),

    // Recent Job Card updates (join to JR for submitter scope + engineer name)
    pool.query(
      `SELECT
          jc.JM_SectionJobNo    AS jc_id,
          jc.JM_JobCardNO       AS jc_no,
          e.EQM_NAME            AS equipment_name,
          jc.JM_MVP_STATUS      AS status,
          jc.JM_LANE_CODE       AS lane_code,
          eng.EMM_NAME          AS engineer_name,
          jc.JM_UPDATED_ON      AS time_at
         FROM cmms_jobcard_mst jc
         LEFT JOIN cmms_eqip_mst       e       ON e.EQM_TYPE  = jc.JM_EQM_TYPE
                                               AND e.EQM_ID    = jc.JM_EQM_ID
         LEFT JOIN cmms_jobrequest_mst submitter ON submitter.JR_SECTIONJOB_NO = jc.JM_SectionJobNo
         LEFT JOIN cmms_emp_mst        eng       ON eng.EMM_ID  = submitter.JR_ASSIGNED_ENGINEER
        WHERE 1=1
          ${jcScope}
          ${jcLane.sql}
        ORDER BY jc.JM_UPDATED_ON DESC
        LIMIT 7`,
      [...scopeArg, ...jcLane.args]
    ),

    // Recent Equipment registrations
    pool.query(
      `SELECT
          e.EQM_TYPE            AS eqm_type,
          e.EQM_ID              AS eqm_id,
          e.EQM_NAME            AS name,
          p.PROD_NAME           AS type_name,
          e.EQM_MVP_STATUS      AS status,
          e.EQM_CREATED_BY      AS created_by,
          e.EQM_CREATED_ON      AS time_at
         FROM cmms_eqip_mst e
         LEFT JOIN cmms_product_mst p ON p.PROD_ID = e.EQM_INST_TYPE
        WHERE 1=1
          ${eqScope}
        ORDER BY e.EQM_CREATED_ON DESC
        LIMIT 7`,
      scopeArg
    ),
  ]);

  return {
    job_requests: jrRows,
    job_cards:    jcRows,
    equipment:    eqRows,
  };
}

module.exports = {
  // ORG
  orgPendingJobs,
  orgCalibrationDue7d,
  orgCompletedThisWeek,
  orgEquipmentUtilization,
  orgTotalActiveEquipment,
  orgInProgressJobs,
  orgOpenJobCards,
  orgOverdueCalibrations,
  orgNewEquipmentThisWeek,
  // MY
  myActiveRequests,
  myInProgress,
  myCompletedThisMonth,
  myCalibrationDue30d,
  myDraftRequests,
  myEquipmentCount,
  myOverdueCalibrations,
  myApprovedQueued,
  // Shared
  recentActivity,
};
