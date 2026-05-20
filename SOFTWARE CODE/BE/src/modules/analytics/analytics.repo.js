// ============================================================================
// src/modules/analytics/analytics.repo.js  —  SQL aggregations for charts
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// CHART INVENTORY
//   G1  monthlyActivityTrends     LINE     calibrations vs repairs by month
//   G2  equipmentStatusDonut      DONUT    EQM_MVP_STATUS distribution
//   G3  monthlyJobTrends          BAR      completed vs pending JR by month
//   G4  divisionWiseJobs          PIE      JR counts by cmms_section_mst
//   G5  calibrationCompletion     LINE     on-time vs delayed by month
//   G6  jobTypeDistribution       BAR      JR_JOB_TYPE counts
//   G7  engineerWorkload          HBAR     per-engineer assigned-vs-done
//   G8  calibrationStatusBreakdown PIE     VALID/DUE_SOON/OVERDUE band
//
// COMMON CONSTRAINTS
//   • All aggregation happens in SQL — never over a fetched array.
//   • Month bucketing uses DATE_FORMAT(<col>, '%Y-%m') for ordering.
//   • Every value bound via `?` placeholder.
// ============================================================================

'use strict';

const pool = require('../../config/db');

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Resolve filter params into a `dateFrom, dateTo` pair (inclusive whole-day).
 * Explicit dateFrom/dateTo win; otherwise we derive a rolling window from
 * `months` (default 6).
 */
function resolveWindow(params) {
  if (params.dateFrom && params.dateTo) {
    return {
      dateFrom: `${params.dateFrom} 00:00:00.000000`,
      dateTo:   `${params.dateTo}   23:59:59.999999`,
    };
  }
  // Rolling window: last N months including current month (start at month 1).
  const months = params.months ?? 6;
  // SQL handles the date math; we don't bind the boundary here since DATE_SUB
  // is cheaper than building strings in JS.
  return {
    months,
    rolling: true,
  };
}

// Apply a window to a WHERE-builder. Returns void; mutates the in/out arrays.
function applyWindow(where, args, win, colName) {
  if (win.rolling) {
    where.push(`${colName} >= DATE_SUB(LAST_DAY(CURDATE()) + INTERVAL 1 DAY, INTERVAL ? MONTH)`);
    args.push(win.months);
  } else {
    where.push(`${colName} >= ?`);
    args.push(win.dateFrom);
    where.push(`${colName} <= ?`);
    args.push(win.dateTo);
  }
}

// ── G1 · Monthly Activity Trends (Calibrations vs Repairs) ─────────────
async function monthlyActivityTrends(params) {
  const win = resolveWindow(params);
  // Two parallel queries grouped by month.
  // Calibrations = job cards whose workflow_type starts with CALIBRATION
  //                OR whose parent JR_JOB_TYPE = 'CALIBRATION'.
  // Repairs      = job cards whose workflow_type starts with INSPECTION
  //                OR parent JR_JOB_TYPE = 'REPAIR'.
  const whereCal = []; const argsCal = [];
  const whereRep = []; const argsRep = [];
  applyWindow(whereCal, argsCal, win, 'jc.JM_JCRecdDate');
  applyWindow(whereRep, argsRep, win, 'jc.JM_JCRecdDate');

  const divClause = params.divisionId
    ? ' AND e.EQM_DIVID = ?'
    : '';
  if (params.divisionId) { argsCal.push(params.divisionId); argsRep.push(params.divisionId); }

  const calSql = `
    SELECT DATE_FORMAT(jc.JM_JCRecdDate, '%Y-%m') AS month, COUNT(*) AS n
      FROM cmms_jobcard_mst jc
      LEFT JOIN cmms_eqip_mst e ON e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID
      LEFT JOIN cmms_jobrequest_mst jr ON jr.JR_JOBREQUESTNO = jc.JM_PARENT_JR_NO
     WHERE ${whereCal.join(' AND ')}
       ${divClause}
       AND (jc.JM_WORKFLOW_TYPE LIKE 'CALIBRATION%' OR jr.JR_JOB_TYPE = 'CALIBRATION')
     GROUP BY month ORDER BY month`;

  const repSql = `
    SELECT DATE_FORMAT(jc.JM_JCRecdDate, '%Y-%m') AS month, COUNT(*) AS n
      FROM cmms_jobcard_mst jc
      LEFT JOIN cmms_eqip_mst e ON e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID
      LEFT JOIN cmms_jobrequest_mst jr ON jr.JR_JOBREQUESTNO = jc.JM_PARENT_JR_NO
     WHERE ${whereRep.join(' AND ')}
       ${divClause}
       AND (jc.JM_WORKFLOW_TYPE LIKE 'INSPECTION%' OR jr.JR_JOB_TYPE = 'REPAIR')
     GROUP BY month ORDER BY month`;

  const [[cal], [rep]] = await Promise.all([
    pool.query(calSql, argsCal),
    pool.query(repSql, argsRep),
  ]);
  // Build a deduped, sorted month list; merge two series.
  const months = new Set();
  cal.forEach((r) => months.add(r.month));
  rep.forEach((r) => months.add(r.month));
  const calMap = Object.fromEntries(cal.map((r) => [r.month, Number(r.n)]));
  const repMap = Object.fromEntries(rep.map((r) => [r.month, Number(r.n)]));
  return [...months].sort().map((m) => ({
    month:        m,
    calibrations: calMap[m] || 0,
    repairs:      repMap[m] || 0,
  }));
}

// ── G2 · Equipment Status Donut ────────────────────────────────────────
async function equipmentStatusDistribution(params) {
  const where = []; const args = [];
  if (params.divisionId) { where.push('EQM_DIVID = ?'); args.push(params.divisionId); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `
    SELECT EQM_MVP_STATUS AS status, COUNT(*) AS n
      FROM cmms_eqip_mst
      ${whereSql}
     GROUP BY EQM_MVP_STATUS
     ORDER BY n DESC`;
  const [rows] = await pool.query(sql, args);
  return rows.map((r) => ({ status: r.status, count: Number(r.n) }));
}

// ── G3 · Monthly Job Trends (Completed vs Pending) ─────────────────────
async function monthlyJobTrends(params) {
  const win = resolveWindow(params);
  const where = []; const args = [];
  applyWindow(where, args, win, 'JR_CREATED_AT');
  if (params.divisionId) { where.push('JR_DIVISION = ?'); args.push(params.divisionId); }

  const sql = `
    SELECT DATE_FORMAT(JR_CREATED_AT, '%Y-%m') AS month,
           SUM(CASE WHEN JR_MVP_STATUS IN ('COMPLETED','VERIFIED_CLOSED') THEN 1 ELSE 0 END) AS completed,
           SUM(CASE WHEN JR_MVP_STATUS IN ('SUBMITTED','ASSIGNED','IN_PROGRESS','REOPENED') THEN 1 ELSE 0 END) AS pending
      FROM cmms_jobrequest_mst
     WHERE ${where.join(' AND ')}
     GROUP BY month ORDER BY month`;
  const [rows] = await pool.query(sql, args);
  return rows.map((r) => ({
    month:     r.month,
    completed: Number(r.completed) || 0,
    pending:   Number(r.pending)   || 0,
  }));
}

// ── G4 · Division-wise Jobs Pie ────────────────────────────────────────
async function divisionWiseJobs(params) {
  const win = resolveWindow(params);
  const where = []; const args = [];
  applyWindow(where, args, win, 'jr.JR_CREATED_AT');

  const sql = `
    SELECT COALESCE(s.SM_SHORTNAME, 'UNKNOWN') AS division,
           jr.JR_DIVISION                       AS division_id,
           COUNT(*)                              AS n
      FROM cmms_jobrequest_mst jr
      LEFT JOIN cmms_section_mst s ON s.SM_ID = jr.JR_DIVISION
     WHERE ${where.join(' AND ')}
     GROUP BY jr.JR_DIVISION, s.SM_SHORTNAME
     ORDER BY n DESC
     LIMIT 8`;
  const [rows] = await pool.query(sql, args);
  return rows.map((r) => ({
    division:    r.division,
    division_id: r.division_id,
    count:       Number(r.n),
  }));
}

// ── G5 · Calibration Completion Trend (On Time vs Delayed) ─────────────
async function calibrationCompletionTrend(params) {
  const win = resolveWindow(params);
  // We treat a calibration as "on time" when JM_VERIFIED_ON is set AND
  // <= JM_PlannedComletedDate (legacy typo, preserved). "Delayed" =
  // JM_VERIFIED_ON > JM_PlannedComletedDate. Bucket by month of verification.
  const where = ["JM_MVP_STATUS = 'VERIFIED_CLOSED'", 'JM_VERIFIED_ON IS NOT NULL'];
  const args = [];
  applyWindow(where, args, win, 'JM_VERIFIED_ON');
  // Calibrations only — workflow_type LIKE 'CALIBRATION%' OR fall back via JR.
  where.push("(JM_WORKFLOW_TYPE LIKE 'CALIBRATION%' OR JM_WORKFLOW_TYPE IS NULL)");

  const sql = `
    SELECT DATE_FORMAT(JM_VERIFIED_ON, '%Y-%m') AS month,
           SUM(CASE WHEN JM_PlannedComletedDate IS NULL OR JM_VERIFIED_ON <= JM_PlannedComletedDate THEN 1 ELSE 0 END) AS on_time,
           SUM(CASE WHEN JM_PlannedComletedDate IS NOT NULL AND JM_VERIFIED_ON >  JM_PlannedComletedDate THEN 1 ELSE 0 END) AS delayed_count
      FROM cmms_jobcard_mst
     WHERE ${where.join(' AND ')}
     GROUP BY month ORDER BY month`;
  // NOTE: `delayed` alone is a reserved word in MariaDB — alias as
  // `delayed_count` in SQL, then expose canonical `delayed` to the FE.
  const [rows] = await pool.query(sql, args);
  return rows.map((r) => ({
    month:   r.month,
    on_time: Number(r.on_time)       || 0,
    delayed: Number(r.delayed_count) || 0,
  }));
}

// ── G6 · Job Type Distribution ─────────────────────────────────────────
async function jobTypeDistribution(params) {
  const win = resolveWindow(params);
  const where = ['JR_JOB_TYPE IS NOT NULL']; const args = [];
  applyWindow(where, args, win, 'JR_CREATED_AT');
  if (params.divisionId) { where.push('JR_DIVISION = ?'); args.push(params.divisionId); }
  const sql = `
    SELECT JR_JOB_TYPE AS job_type, COUNT(*) AS n
      FROM cmms_jobrequest_mst
     WHERE ${where.join(' AND ')}
     GROUP BY JR_JOB_TYPE ORDER BY n DESC`;
  const [rows] = await pool.query(sql, args);
  return rows.map((r) => ({ job_type: r.job_type, count: Number(r.n) }));
}

// ── G7 · Engineer Workload (top 10) ────────────────────────────────────
async function engineerWorkload(params) {
  const win = resolveWindow(params);
  const where = ["JM_ASSIGNED_ENGINEER IS NOT NULL", "JM_ASSIGNED_ENGINEER <> ''"]; const args = [];
  applyWindow(where, args, win, 'JM_JCRecdDate');
  if (params.divisionId) {
    // Need JOIN to equipment for division filter.
    where.push('EXISTS (SELECT 1 FROM cmms_eqip_mst e WHERE e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID AND e.EQM_DIVID = ?)');
    args.push(params.divisionId);
  }
  const sql = `
    SELECT jc.JM_ASSIGNED_ENGINEER AS engineer_employee_id,
           COALESCE(emp.EMM_NAME, '') AS engineer_name,
           SUM(CASE WHEN jc.JM_MVP_STATUS IN ('ASSIGNED','IN_PROGRESS','REOPENED') THEN 1 ELSE 0 END) AS open_load,
           SUM(CASE WHEN jc.JM_MVP_STATUS IN ('COMPLETED','VERIFIED_CLOSED') THEN 1 ELSE 0 END) AS done
      FROM cmms_jobcard_mst jc
      LEFT JOIN cmms_emp_mst emp ON emp.EMM_ID = jc.JM_ASSIGNED_ENGINEER
     WHERE ${where.join(' AND ')}
     GROUP BY jc.JM_ASSIGNED_ENGINEER, emp.EMM_NAME
     ORDER BY (SUM(1)) DESC
     LIMIT 10`;
  const [rows] = await pool.query(sql, args);
  return rows.map((r) => ({
    engineer_employee_id: r.engineer_employee_id,
    engineer_name:        r.engineer_name,
    open_load:            Number(r.open_load) || 0,
    done:                 Number(r.done)      || 0,
  }));
}

// ── G8 · Calibration Status Breakdown (VALID/DUE_SOON/OVERDUE) ─────────
async function calibrationStatusBreakdown(params) {
  const where = ["EQM_MVP_STATUS = 'ACTIVE'"]; const args = [];
  if (params.divisionId) { where.push('EQM_DIVID = ?'); args.push(params.divisionId); }
  const sql = `
    SELECT
      SUM(CASE WHEN EQM_CAL_DUE_DATE IS NOT NULL AND EQM_CAL_DUE_DATE < CURDATE() THEN 1 ELSE 0 END) AS overdue,
      SUM(CASE WHEN EQM_CAL_DUE_DATE IS NOT NULL AND EQM_CAL_DUE_DATE >= CURDATE() AND EQM_CAL_DUE_DATE <= CURDATE() + INTERVAL 30 DAY THEN 1 ELSE 0 END) AS due_soon,
      SUM(CASE WHEN EQM_CAL_DUE_DATE IS NULL OR EQM_CAL_DUE_DATE > CURDATE() + INTERVAL 30 DAY THEN 1 ELSE 0 END) AS valid
      FROM cmms_eqip_mst
     WHERE ${where.join(' AND ')}`;
  const [rows] = await pool.query(sql, args);
  return [
    { band: 'VALID',    count: Number(rows[0].valid)    || 0 },
    { band: 'DUE_SOON', count: Number(rows[0].due_soon) || 0 },
    { band: 'OVERDUE',  count: Number(rows[0].overdue)  || 0 },
  ];
}

// ────────────────────────────────────────────────────────────────────
//  PHASE 11 SLICE 3 — additional analytics endpoints (G9..G12)
//  The new charts use the same `resolveWindow + applyWindow` helpers
//  so filter behaviour is consistent with G1..G8.
// ────────────────────────────────────────────────────────────────────

// ── G9 · Weekly Activity Trend (last 12 weeks) ─────────────────────────
// "Stock-market wavy" hero chart. Returns Calibrations vs Repairs counts
// bucketed by ISO week. Always a 12-row return for a continuous x-axis.
//
// We don't honour `months` here — the chart is fixed to 12 weeks for the
// wavy stock-market look that the UI demands. divisionId still applies.
async function weeklyActivityTrend(params) {
  const args = [];
  // Bucket key: '%x-W%v' = ISO-year + ISO-week so months that straddle a
  // year boundary don't collide.
  const divClause = params.divisionId ? ' AND e.EQM_DIVID = ?' : '';
  if (params.divisionId) args.push(params.divisionId);

  const sql = `
    SELECT DATE_FORMAT(jc.JM_JCRecdDate, '%x-W%v') AS week_label,
           MIN(jc.JM_JCRecdDate)                    AS week_start,
           SUM(CASE WHEN jc.JM_WORKFLOW_TYPE LIKE 'CALIBRATION%' OR jr.JR_JOB_TYPE = 'CALIBRATION' THEN 1 ELSE 0 END) AS calibrations,
           SUM(CASE WHEN jc.JM_WORKFLOW_TYPE LIKE 'INSPECTION%'  OR jr.JR_JOB_TYPE = 'REPAIR'      THEN 1 ELSE 0 END) AS repairs
      FROM cmms_jobcard_mst jc
      LEFT JOIN cmms_eqip_mst       e  ON e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID
      LEFT JOIN cmms_jobrequest_mst jr ON jr.JR_JOBREQUESTNO = jc.JM_PARENT_JR_NO
     WHERE jc.JM_JCRecdDate >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)
       ${divClause}
     GROUP BY week_label
     ORDER BY week_start ASC`;
  const [rows] = await pool.query(sql, args);
  return rows.map((r) => ({
    week:         r.week_label,
    calibrations: Number(r.calibrations) || 0,
    repairs:      Number(r.repairs)      || 0,
  }));
}


// ── G10 · Job Card Lifecycle Funnel ───────────────────────────────────
// Counts at each lifecycle stage in canonical order. The order is
// deterministic so the FE can render a funnel/staircase without sorting.
async function jcLifecycleFunnel(params) {
  const win = resolveWindow(params);
  const where = [];
  const args = [];
  applyWindow(where, args, win, 'JM_JCRecdDate');
  if (params.divisionId) {
    where.push('EXISTS (SELECT 1 FROM cmms_eqip_mst e WHERE e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID AND e.EQM_DIVID = ?)');
    args.push(params.divisionId);
  }
  const sql = `
    SELECT JM_MVP_STATUS AS stage, COUNT(*) AS n
      FROM cmms_jobcard_mst jc
     WHERE ${where.join(' AND ')}
     GROUP BY JM_MVP_STATUS`;
  const [rows] = await pool.query(sql, args);
  // Map onto the canonical funnel order so the FE doesn't have to sort.
  const map = Object.fromEntries(rows.map((r) => [r.stage, Number(r.n) || 0]));
  return [
    { stage: 'ASSIGNED',         count: map.ASSIGNED         || 0 },
    { stage: 'IN_PROGRESS',      count: map.IN_PROGRESS      || 0 },
    { stage: 'COMPLETED',        count: map.COMPLETED        || 0 },
    { stage: 'VERIFIED_CLOSED',  count: map.VERIFIED_CLOSED  || 0 },
    { stage: 'REOPENED',         count: map.REOPENED         || 0 },
  ];
}


// ── G11 · Equipment Registration Trend ────────────────────────────────
// Equipment added per month — useful for capacity-growth trending.
// Smooth wavy area chart on the FE.
async function equipmentRegistrationTrend(params) {
  const win = resolveWindow(params);
  const where = ['EQM_CREATED_ON IS NOT NULL'];
  const args = [];
  applyWindow(where, args, win, 'EQM_CREATED_ON');
  if (params.divisionId) { where.push('EQM_DIVID = ?'); args.push(params.divisionId); }
  const sql = `
    SELECT DATE_FORMAT(EQM_CREATED_ON, '%Y-%m') AS month,
           COUNT(*)                              AS registered
      FROM cmms_eqip_mst
     WHERE ${where.join(' AND ')}
     GROUP BY month
     ORDER BY month ASC`;
  const [rows] = await pool.query(sql, args);
  return rows.map((r) => ({
    month:      r.month,
    registered: Number(r.registered) || 0,
  }));
}


// ── G12 · Priority Mix Trend (stacked area) ───────────────────────────
// Bucket: month. Series: LOW / MEDIUM / HIGH (legacy NORMAL collapses
// into MEDIUM, URGENT collapses into HIGH per Phase-6 P6-D1 mapping).
async function priorityMixTrend(params) {
  const win = resolveWindow(params);
  const where = [];
  const args = [];
  applyWindow(where, args, win, 'JR_CREATED_AT');
  if (params.divisionId) { where.push('JR_DIVISION = ?'); args.push(params.divisionId); }
  const sql = `
    SELECT DATE_FORMAT(JR_CREATED_AT, '%Y-%m') AS month,
           SUM(CASE WHEN JR_PRIORITY = 'LOW'                       THEN 1 ELSE 0 END) AS low_count,
           SUM(CASE WHEN JR_PRIORITY IN ('NORMAL','MEDIUM')        THEN 1 ELSE 0 END) AS medium_count,
           SUM(CASE WHEN JR_PRIORITY IN ('HIGH','URGENT')          THEN 1 ELSE 0 END) AS high_count
      FROM cmms_jobrequest_mst
     WHERE ${where.join(' AND ')}
     GROUP BY month
     ORDER BY month ASC`;
  const [rows] = await pool.query(sql, args);
  return rows.map((r) => ({
    month:  r.month,
    low:    Number(r.low_count)    || 0,
    medium: Number(r.medium_count) || 0,
    high:   Number(r.high_count)   || 0,
  }));
}


module.exports = {
  // G1..G8 (Phase 10)
  monthlyActivityTrends,
  equipmentStatusDistribution,
  monthlyJobTrends,
  divisionWiseJobs,
  calibrationCompletionTrend,
  jobTypeDistribution,
  engineerWorkload,
  calibrationStatusBreakdown,
  // G9..G12 (Phase 11 Slice 3)
  weeklyActivityTrend,
  jcLifecycleFunnel,
  equipmentRegistrationTrend,
  priorityMixTrend,
};
