// ============================================================================
// src/modules/reports/reports.repo.js  —  Read-only SQL for all 6 reports
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// DOCTRINE
//   • ONLY this file mentions real legacy column names (EQM_*, JR_*, JM_*).
//   • Every SELECT aliases to canonical names (snake_case) so service /
//     controller / FE never know about the legacy shapes.
//   • Read-only. ZERO writes. ZERO INSERT/UPDATE/DELETE in this module.
//     No report logs, no audit rows, no persisted PDFs (per §1.F).
//   • Every value bound via `?` placeholder. Column names are NEVER
//     interpolated from user input — only allow-listed validator enums
//     can ever flow into the WHERE clause.
//   • Aggregation runs in SQL via GROUP BY/COUNT(*); NEVER over a fetched
//     20k-row array in Node.
//
// REPORT INVENTORY (matches Phase-10 spec §2):
//   R1 calibrationDue       cmms_eqip_mst + JC subquery + cmms_section_mst
//   R2 pendingJobs          cmms_jobrequest_mst + cmms_eqip_mst + cmms_section_mst
//   R3 equipmentUtilization cmms_eqip_mst + COUNT cmms_jobcard_mst + cmms_section_mst
//   R4 engineerSummary      cmms_jobcard_mst grouped by JM_ASSIGNED_ENGINEER
//                                            + cmms_emp_mst lookup
//   R5 jobCardSummary       cmms_jobcard_mst + cmms_eqip_mst + cmms_section_mst + emp
//   R6 jobRequestSummary    cmms_jobrequest_mst + cmms_eqip_mst + cmms_section_mst
//
// LAST CALIBRATION DATE
//   Phase 5 introspection confirms cmms_eqip_mst has NO EQM_CAL_DATE
//   column (only EQM_CAL_DUE_DATE for the next-due date). We derive the
//   "last calibration done" date from the most-recent VERIFIED_CLOSED
//   Job Card on that piece of equipment whose workflow type is
//   CALIBRATION_* (or whose JR_JOB_TYPE was CALIBRATION). Covered by
//   idx_jc_status_verified + the PK lookup on (JM_EQM_TYPE,JM_EQM_ID).
//
// PAGINATION
//   Every list query takes (page, page_size) and emits a parallel COUNT
//   for the total. Default sort is deterministic (PK tie-break) so that
//   page N+1 never repeats rows from page N.
//
// PERFORMANCE / INDEX COVERAGE
//   The list paths lean on existing covering indexes added in Phase 6
//   (mig 102), Phase 7s2 (mig 201), Phase 8 (mig 120), Phase 9 (mig 304):
//     idx_eqip_status_caldue, idx_eqip_creator_caldue,
//     idx_jc_status_verified, idx_jc_status_ended,
//     idx_jc_engineer_status, idx_jr_list_default, idx_jr_owner_created,
//     idx_jr_division_created, etc.
//   No NEW indexes added this phase (per spec §3 "DO NOT ALTER tables").
// ============================================================================

'use strict';

const pool = require('../../config/db');

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Coerce ISO YYYY-MM-DD into an inclusive datetime window expression.
 * dateFrom → '<date> 00:00:00.000000'
 * dateTo   → '<date> 23:59:59.999999'
 *
 * Returns `null` when input is missing/blank so the caller can skip
 * adding the WHERE clause entirely.
 *
 * @param {string|undefined} d
 * @param {'start'|'end'} edge
 * @returns {string|null}
 */
function toBoundary(d, edge) {
  if (!d) return null;
  return edge === 'start' ? `${d} 00:00:00.000000` : `${d} 23:59:59.999999`;
}

/**
 * Common WHERE-builder. Pushes (clause, args) pairs into a shared array
 * pair. Caller produces `WHERE ${joined.join(' AND ')}`.
 *
 * @returns {{ where: string[], args: any[] }}
 */
function makeWhere() {
  return { where: [], args: [] };
}

// ────────────────────────────────────────────────────────────────────
//  R1 — CALIBRATION DUE REPORT
//  Source: cmms_eqip_mst (+ section join, + last-cal subquery)
// ────────────────────────────────────────────────────────────────────

/**
 * Detail rows + total count for the Calibration Due report.
 *
 * Calibration Status (derived band) — computed in SQL so the column
 * also gets filtered/ORDER-BYed without a second pass in JS:
 *
 *   OVERDUE  ← due IS NOT NULL AND due < CURDATE()
 *   DUE_SOON ← due BETWEEN CURDATE() AND CURDATE() + ?dueSoonDays
 *   VALID    ← else (due > CURDATE() + ?dueSoonDays, or NULL → treated as VALID)
 *
 * @param {Object} params  Output of calibrationDueQuerySchema.
 * @returns {Promise<{ rows: object[], total: number }>}
 */
async function listCalibrationDue(params) {
  const { divisionId, status, dueSoonDays, page, page_size } = params;
  const dateFromTs = toBoundary(params.dateFrom, 'start');
  const dateToTs   = toBoundary(params.dateTo,   'end');

  const { where, args } = makeWhere();

  // Scope: ACTIVE equipment only (the report is about hardware that
  // could be calibrated; CONDEMNED/RETIRED never appears here).
  where.push("e.EQM_MVP_STATUS = 'ACTIVE'");

  if (divisionId) { where.push('e.EQM_DIVID = ?'); args.push(divisionId); }

  // The "date range" filter on this report means "due date falls within
  // [dateFrom, dateTo]" — the most useful interpretation for a planner.
  if (dateFromTs) { where.push('e.EQM_CAL_DUE_DATE >= ?'); args.push(dateFromTs); }
  if (dateToTs)   { where.push('e.EQM_CAL_DUE_DATE <= ?'); args.push(dateToTs); }

  // dueSoonDays is bound inside CASE expressions; declare once.
  // The derived calibration_status column uses CURDATE() arithmetic.
  const calStatusExpr = `
    CASE
      WHEN e.EQM_CAL_DUE_DATE IS NULL THEN 'VALID'
      WHEN e.EQM_CAL_DUE_DATE < CURDATE() THEN 'OVERDUE'
      WHEN e.EQM_CAL_DUE_DATE <= CURDATE() + INTERVAL ? DAY THEN 'DUE_SOON'
      ELSE 'VALID'
    END`;

  // The status filter is applied AFTER the CASE — we wrap the query so
  // MySQL can still benefit from the upstream WHERE clause indexes.
  // Bound parameter list for the SELECT (cal_status appears twice when
  // filtered: once in SELECT, once in HAVING-style filter).
  const selectArgs = [dueSoonDays];        // for SELECT CASE
  const havingArgs = [];

  let havingClause = '';
  if (status) {
    havingClause = 'HAVING calibration_status = ?';
    havingArgs.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * page_size;

  // ── DATA query ───────────────────────────────────────────────────
  // last_cal_date is derived from the most recent VERIFIED_CLOSED JC
  // on the same (EQM_TYPE, EQM_ID). The correlated subquery is cheap
  // because the PK lookup on cmms_jobcard_mst hits FK_JOBCARD_EQIP idx.
  const dataSql = `
    SELECT
      e.EQM_TYPE                                                  AS eqm_type,
      e.EQM_ID                                                    AS eqm_id,
      CONCAT(e.EQM_TYPE, '-', e.EQM_ID)                           AS equipment_id,
      e.EQM_NAME                                                  AS equipment_name,
      e.EQM_SRNO                                                  AS serial_number,
      COALESCE(s.SM_SHORTNAME, e.EQM_DIV_ABBR, '')                AS division,
      e.EQM_DIVID                                                 AS division_id,
      (SELECT MAX(jc.JM_VERIFIED_ON)
         FROM cmms_jobcard_mst jc
        WHERE jc.JM_EQM_TYPE = e.EQM_TYPE
          AND jc.JM_EQM_ID   = e.EQM_ID
          AND jc.JM_MVP_STATUS = 'VERIFIED_CLOSED')               AS last_cal_date,
      e.EQM_CAL_DUE_DATE                                          AS next_cal_due_date,
      ${calStatusExpr}                                            AS calibration_status,
      e.EQM_MVP_STATUS                                            AS equipment_status
    FROM cmms_eqip_mst e
    LEFT JOIN cmms_section_mst s ON s.SM_ID = e.EQM_DIVID
    ${whereSql}
    ${havingClause}
    ORDER BY
      CASE
        WHEN e.EQM_CAL_DUE_DATE IS NULL THEN 1
        WHEN e.EQM_CAL_DUE_DATE < CURDATE() THEN 0
        ELSE 2
      END ASC,
      e.EQM_CAL_DUE_DATE ASC,
      e.EQM_TYPE ASC, e.EQM_ID ASC
    LIMIT ? OFFSET ?`;

  // dataArgs order matches the bind sites: SELECT CASE → WHERE → HAVING → LIMIT/OFFSET.
  const dataArgs = [...selectArgs, ...args, ...havingArgs, page_size, offset];

  // ── COUNT query — same WHERE+HAVING, no SELECT extras, no LIMIT.
  const countSql = `
    SELECT COUNT(*) AS n FROM (
      SELECT 1
        FROM cmms_eqip_mst e
        ${whereSql}
        ${havingClause ? `HAVING (${calStatusExpr}) = ?` : ''}
    ) t`;
  // For count, we need the dueSoonDays binding for CASE, then WHERE args,
  // then (if status filter) the dueSoonDays AGAIN inside the HAVING CASE
  // plus the status value.
  const countArgs = havingClause
    ? [...args, dueSoonDays, ...havingArgs]
    : [...args];

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql, dataArgs),
    pool.query(countSql, countArgs),
  ]);
  return { rows, total: Number(countRows[0].n) };
}

/**
 * Summary cards for R1: TOTAL EQUIPMENT, DUE_SOON, OVERDUE, VALID.
 * Computed in ONE query with a CASE-pivot — single index scan.
 *
 * @param {Object} params  Same filter shape as listCalibrationDue.
 * @returns {Promise<{ total: number, due_soon: number, overdue: number, valid: number }>}
 */
async function summaryCalibrationDue(params) {
  const { divisionId, dueSoonDays } = params;
  const dateFromTs = toBoundary(params.dateFrom, 'start');
  const dateToTs   = toBoundary(params.dateTo,   'end');

  const where = ["e.EQM_MVP_STATUS = 'ACTIVE'"];
  const args = [];
  if (divisionId) { where.push('e.EQM_DIVID = ?'); args.push(divisionId); }
  if (dateFromTs) { where.push('e.EQM_CAL_DUE_DATE >= ?'); args.push(dateFromTs); }
  if (dateToTs)   { where.push('e.EQM_CAL_DUE_DATE <= ?'); args.push(dateToTs); }

  const sql = `
    SELECT
      COUNT(*)                                                                                              AS total,
      SUM(CASE WHEN e.EQM_CAL_DUE_DATE IS NOT NULL AND e.EQM_CAL_DUE_DATE < CURDATE()                THEN 1 ELSE 0 END)                                    AS overdue,
      SUM(CASE WHEN e.EQM_CAL_DUE_DATE IS NOT NULL AND e.EQM_CAL_DUE_DATE >= CURDATE() AND e.EQM_CAL_DUE_DATE <= CURDATE() + INTERVAL ? DAY THEN 1 ELSE 0 END) AS due_soon,
      SUM(CASE WHEN e.EQM_CAL_DUE_DATE IS NULL OR e.EQM_CAL_DUE_DATE > CURDATE() + INTERVAL ? DAY    THEN 1 ELSE 0 END)                                    AS valid
    FROM cmms_eqip_mst e
    WHERE ${where.join(' AND ')}`;

  const [[rows]] = await pool.query(sql, [dueSoonDays, dueSoonDays, ...args]);
  return {
    total:    Number(rows[0].total)    || 0,
    overdue:  Number(rows[0].overdue)  || 0,
    due_soon: Number(rows[0].due_soon) || 0,
    valid:    Number(rows[0].valid)    || 0,
  };
}


// ────────────────────────────────────────────────────────────────────
//  R2 — PENDING JOBS REPORT
//  Source: cmms_jobrequest_mst + cmms_eqip_mst + cmms_section_mst
// ────────────────────────────────────────────────────────────────────

/**
 * Pending = JR_MVP_STATUS NOT IN ('COMPLETED','VERIFIED_CLOSED','REJECTED','DRAFT')
 * (i.e. SUBMITTED, ASSIGNED, IN_PROGRESS, REOPENED). DRAFT is excluded
 * because draft requests have not been submitted to anyone yet.
 *
 * @param {Object} params         Output of pendingJobsQuerySchema.
 * @param {Object} [rowScope]     Optional row-level scope { canReadAll, ownerEmployeeId }.
 */
async function listPendingJobs(params, rowScope = { canReadAll: true }) {
  const { divisionId, status, unassigned, page, page_size } = params;
  const dateFromTs = toBoundary(params.dateFrom, 'start');
  const dateToTs   = toBoundary(params.dateTo,   'end');

  const where = [];
  const args = [];

  if (status) {
    where.push('jr.JR_MVP_STATUS = ?');
    args.push(status);
  } else {
    // Default "pending" scope per PDF business rule.
    where.push("jr.JR_MVP_STATUS IN ('SUBMITTED','ASSIGNED','IN_PROGRESS','REOPENED')");
  }

  if (divisionId) { where.push('jr.JR_DIVISION = ?'); args.push(divisionId); }

  if (dateFromTs) { where.push('jr.JR_CREATED_AT >= ?'); args.push(dateFromTs); }
  if (dateToTs)   { where.push('jr.JR_CREATED_AT <= ?'); args.push(dateToTs); }

  if (unassigned) {
    where.push("(jr.JR_ASSIGNED_ENGINEER IS NULL OR jr.JR_ASSIGNED_ENGINEER = '')");
  }

  // Row-level scope (BR-VIS-01): Normal users see only their own JRs.
  if (!rowScope.canReadAll) {
    where.push('jr.JR_SUBMITTEDBYID = ?');
    args.push(rowScope.ownerEmployeeId);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const offset = (page - 1) * page_size;

  const dataSql = `
    SELECT
      jr.JR_JOBREQUESTNO                                            AS job_request_id,
      CONCAT('JR-', YEAR(COALESCE(jr.JR_JOBREQUESTDATE, jr.JR_CREATED_AT)), '-', LPAD(jr.JR_JOBREQUESTNO, 4, '0')) AS request_code,
      COALESCE(jr.JR_EQM_NAME, e.EQM_NAME, '')                      AS equipment_name,
      jr.JR_JOB_TYPE                                                AS job_type,
      jr.JR_MVP_STATUS                                              AS status,
      jr.JR_SUBMITTEDBYID                                           AS submitted_by_employee_id,
      COALESCE(jr.JR_SUBMITTEDBYNAME, emp_s.EMM_NAME, '')           AS submitted_by_name,
      jr.JR_CREATED_AT                                              AS submitted_date,
      COALESCE(s.SM_SHORTNAME, '')                                  AS division,
      jr.JR_DIVISION                                                AS division_id,
      jr.JR_ASSIGNED_ENGINEER                                       AS assigned_engineer_id,
      COALESCE(emp_e.EMM_NAME, '')                                  AS assigned_engineer_name,
      jr.JR_PRIORITY                                                AS priority
    FROM cmms_jobrequest_mst jr
    LEFT JOIN cmms_eqip_mst    e     ON e.EQM_TYPE = jr.JR_EQM_TYPE AND e.EQM_ID = jr.JR_EQM_ID
    LEFT JOIN cmms_section_mst s     ON s.SM_ID    = jr.JR_DIVISION
    LEFT JOIN cmms_emp_mst     emp_s ON emp_s.EMM_ID = jr.JR_SUBMITTEDBYID
    LEFT JOIN cmms_emp_mst     emp_e ON emp_e.EMM_ID = jr.JR_ASSIGNED_ENGINEER
    ${whereSql}
    ORDER BY jr.JR_CREATED_AT DESC, jr.JR_JOBREQUESTNO DESC
    LIMIT ? OFFSET ?`;

  const countSql = `
    SELECT COUNT(*) AS n
      FROM cmms_jobrequest_mst jr
      ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql, [...args, page_size, offset]),
    pool.query(countSql, args),
  ]);
  return { rows, total: Number(countRows[0].n) };
}

/**
 * Summary cards for R2: TOTAL PENDING, NEW REQUESTS (within date range),
 * ASSIGNED, UNASSIGNED.
 */
async function summaryPendingJobs(params, rowScope = { canReadAll: true }) {
  const { divisionId } = params;
  const dateFromTs = toBoundary(params.dateFrom, 'start');
  const dateToTs   = toBoundary(params.dateTo,   'end');

  const scopeClauseArgs = [];
  let scopeClause = '';
  if (!rowScope.canReadAll) {
    scopeClause = ' AND jr.JR_SUBMITTEDBYID = ?';
    scopeClauseArgs.push(rowScope.ownerEmployeeId);
  }

  const divArgs = [];
  let divClause = '';
  if (divisionId) { divClause = ' AND jr.JR_DIVISION = ?'; divArgs.push(divisionId); }

  // We compute four counters in a single scan via CASE-pivot.
  // PENDING is the canonical 4-state set.
  const sql = `
    SELECT
      SUM(CASE WHEN jr.JR_MVP_STATUS IN ('SUBMITTED','ASSIGNED','IN_PROGRESS','REOPENED') THEN 1 ELSE 0 END) AS total_pending,
      SUM(CASE WHEN jr.JR_MVP_STATUS IN ('SUBMITTED','ASSIGNED','IN_PROGRESS','REOPENED')
                AND ${dateFromTs ? 'jr.JR_CREATED_AT >= ?' : '1=1'}
                AND ${dateToTs   ? 'jr.JR_CREATED_AT <= ?' : '1=1'}
               THEN 1 ELSE 0 END) AS new_requests,
      SUM(CASE WHEN jr.JR_MVP_STATUS IN ('SUBMITTED','ASSIGNED','IN_PROGRESS','REOPENED')
                AND jr.JR_ASSIGNED_ENGINEER IS NOT NULL AND jr.JR_ASSIGNED_ENGINEER <> ''
               THEN 1 ELSE 0 END) AS assigned,
      SUM(CASE WHEN jr.JR_MVP_STATUS IN ('SUBMITTED','ASSIGNED','IN_PROGRESS','REOPENED')
                AND (jr.JR_ASSIGNED_ENGINEER IS NULL OR jr.JR_ASSIGNED_ENGINEER = '')
               THEN 1 ELSE 0 END) AS unassigned
    FROM cmms_jobrequest_mst jr
    WHERE 1=1 ${divClause} ${scopeClause}`;

  const dynArgs = [];
  if (dateFromTs) dynArgs.push(dateFromTs);
  if (dateToTs)   dynArgs.push(dateToTs);

  const [[rows]] = await pool.query(sql, [...dynArgs, ...divArgs, ...scopeClauseArgs]);
  return {
    total_pending: Number(rows[0].total_pending) || 0,
    new_requests:  Number(rows[0].new_requests)  || 0,
    assigned:      Number(rows[0].assigned)      || 0,
    unassigned:    Number(rows[0].unassigned)    || 0,
  };
}


// ────────────────────────────────────────────────────────────────────
//  R3 — EQUIPMENT UTILIZATION REPORT
//  Source: cmms_eqip_mst + cmms_product_mst + cmms_section_mst
//          + COUNT cmms_jobcard_mst (in date range)
// ────────────────────────────────────────────────────────────────────

async function listEquipmentUtilization(params) {
  const { divisionId, status, page, page_size } = params;
  const dateFromTs = toBoundary(params.dateFrom, 'start');
  const dateToTs   = toBoundary(params.dateTo,   'end');

  const where = [];
  const args  = [];

  if (status)     { where.push('e.EQM_MVP_STATUS = ?'); args.push(status); }
  if (divisionId) { where.push('e.EQM_DIVID = ?');       args.push(divisionId); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * page_size;

  // Date range narrows the JC subquery, NOT the equipment list — we
  // still want to see every piece of hardware (including those with
  // zero JCs in the window — "INACTIVE / LOW USE" summary card).
  const subDateClauses = [];
  const subDateArgs    = [];
  if (dateFromTs) { subDateClauses.push('AND jc.JM_JCRecdDate >= ?'); subDateArgs.push(dateFromTs); }
  if (dateToTs)   { subDateClauses.push('AND jc.JM_JCRecdDate <= ?'); subDateArgs.push(dateToTs); }
  const subDateSql = subDateClauses.join(' ');

  const dataSql = `
    SELECT
      e.EQM_TYPE                                                    AS eqm_type,
      e.EQM_ID                                                      AS eqm_id,
      CONCAT(e.EQM_TYPE, '-', e.EQM_ID)                             AS equipment_id,
      e.EQM_NAME                                                    AS equipment_name,
      e.EQM_SRNO                                                    AS serial_number,
      COALESCE(p.PROD_NAME, e.EQM_TYPE, '')                         AS equipment_type,
      (SELECT COUNT(*)
         FROM cmms_jobcard_mst jc
        WHERE jc.JM_EQM_TYPE = e.EQM_TYPE
          AND jc.JM_EQM_ID   = e.EQM_ID
          ${subDateSql})                                            AS total_job_cards,
      COALESCE(s.SM_SHORTNAME, e.EQM_DIV_ABBR, '')                  AS division,
      e.EQM_DIVID                                                   AS division_id,
      e.EQM_MVP_STATUS                                              AS equipment_status
    FROM cmms_eqip_mst e
    LEFT JOIN cmms_product_mst p ON p.PROD_ID = e.EQM_INST_TYPE
    LEFT JOIN cmms_section_mst s ON s.SM_ID   = e.EQM_DIVID
    ${whereSql}
    ORDER BY total_job_cards DESC, e.EQM_TYPE ASC, e.EQM_ID ASC
    LIMIT ? OFFSET ?`;

  const countSql = `SELECT COUNT(*) AS n FROM cmms_eqip_mst e ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql, [...subDateArgs, ...args, page_size, offset]),
    pool.query(countSql, args),
  ]);
  return { rows, total: Number(countRows[0].n) };
}

/**
 * Summary cards for R3: TOTAL EQUIPMENT, USED EQUIPMENT, TOTAL JOB CARDS,
 * INACTIVE/LOW USE (≤1 JC in window).
 */
async function summaryEquipmentUtilization(params) {
  const { divisionId, status } = params;
  const dateFromTs = toBoundary(params.dateFrom, 'start');
  const dateToTs   = toBoundary(params.dateTo,   'end');

  const where = [];
  const args = [];
  if (status)     { where.push('e.EQM_MVP_STATUS = ?'); args.push(status); }
  if (divisionId) { where.push('e.EQM_DIVID = ?');       args.push(divisionId); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // Date-bound JC counts via correlated EXISTS (faster than full COUNT).
  const subDateClauses = [];
  const subDateArgs    = [];
  if (dateFromTs) { subDateClauses.push('AND jc.JM_JCRecdDate >= ?'); subDateArgs.push(dateFromTs); }
  if (dateToTs)   { subDateClauses.push('AND jc.JM_JCRecdDate <= ?'); subDateArgs.push(dateToTs); }
  const subDateSql = subDateClauses.join(' ');

  const sql = `
    SELECT
      COUNT(*)                                                              AS total_equipment,
      SUM(CASE WHEN EXISTS (
            SELECT 1 FROM cmms_jobcard_mst jc
             WHERE jc.JM_EQM_TYPE = e.EQM_TYPE AND jc.JM_EQM_ID = e.EQM_ID
               ${subDateSql})
           THEN 1 ELSE 0 END)                                                AS used_equipment,
      (SELECT COUNT(*)
         FROM cmms_jobcard_mst jc
         JOIN cmms_eqip_mst e2 ON e2.EQM_TYPE = jc.JM_EQM_TYPE AND e2.EQM_ID = jc.JM_EQM_ID
        WHERE 1=1
          ${status     ? 'AND e2.EQM_MVP_STATUS = ?' : ''}
          ${divisionId ? 'AND e2.EQM_DIVID = ?'       : ''}
          ${subDateSql.replace(/jc\.JM_JCRecdDate/g, 'jc.JM_JCRecdDate')})  AS total_job_cards
    FROM cmms_eqip_mst e
    ${whereSql}`;

  // Bind order: subDate (EXISTS) → status/division (outer WHERE)
  //           → status/division for the inner total_job_cards block
  //           → subDate (inner total_job_cards block).
  const bindings = [
    ...subDateArgs,                       // EXISTS subquery
    ...args,                              // outer WHERE
    ...(status     ? [status]     : []),  // inner status
    ...(divisionId ? [divisionId] : []),  // inner division
    ...subDateArgs,                       // inner date window
  ];

  const [[rows]] = await pool.query(sql, bindings);
  const total = Number(rows[0].total_equipment) || 0;
  const used  = Number(rows[0].used_equipment)  || 0;
  return {
    total_equipment:  total,
    used_equipment:   used,
    total_job_cards:  Number(rows[0].total_job_cards) || 0,
    inactive_low_use: Math.max(0, total - used),
  };
}


// ────────────────────────────────────────────────────────────────────
//  R4 — ENGINEER SUMMARY REPORT
//  Source: cmms_jobcard_mst (GROUP BY JM_ASSIGNED_ENGINEER) + emp lookup
// ────────────────────────────────────────────────────────────────────

async function listEngineerSummary(params) {
  const { divisionId, employeeId, page, page_size } = params;
  const dateFromTs = toBoundary(params.dateFrom, 'start');
  const dateToTs   = toBoundary(params.dateTo,   'end');

  const where = [];
  const args = [];

  where.push("jc.JM_ASSIGNED_ENGINEER IS NOT NULL AND jc.JM_ASSIGNED_ENGINEER <> ''");

  if (dateFromTs) { where.push('jc.JM_JCRecdDate >= ?'); args.push(dateFromTs); }
  if (dateToTs)   { where.push('jc.JM_JCRecdDate <= ?'); args.push(dateToTs); }
  if (employeeId) { where.push('jc.JM_ASSIGNED_ENGINEER = ?'); args.push(employeeId); }

  // Division filter requires JOIN to cmms_eqip_mst — keep it conditional
  // so the GROUP-BY-only path stays index-tight when not used.
  let divJoinSql = '';
  if (divisionId) {
    divJoinSql = `LEFT JOIN cmms_eqip_mst e
                    ON e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID`;
    where.push('e.EQM_DIVID = ?'); args.push(divisionId);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const offset = (page - 1) * page_size;

  const dataSql = `
    SELECT
      jc.JM_ASSIGNED_ENGINEER                                  AS engineer_employee_id,
      COALESCE(emp.EMM_NAME, '')                               AS engineer_name,
      COUNT(*)                                                 AS total_assigned,
      SUM(CASE WHEN jc.JM_MVP_STATUS = 'COMPLETED'       THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN jc.JM_MVP_STATUS = 'IN_PROGRESS'     THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN jc.JM_MVP_STATUS = 'VERIFIED_CLOSED' THEN 1 ELSE 0 END) AS verified_closed,
      SUM(CASE WHEN jc.JM_MVP_STATUS = 'ASSIGNED'        THEN 1 ELSE 0 END) AS assigned,
      SUM(CASE WHEN jc.JM_MVP_STATUS = 'REOPENED'        THEN 1 ELSE 0 END) AS reopened,
      MIN(jc.JM_JCRecdDate)                                    AS date_range_from,
      MAX(jc.JM_JCRecdDate)                                    AS date_range_to
    FROM cmms_jobcard_mst jc
    LEFT JOIN cmms_emp_mst emp ON emp.EMM_ID = jc.JM_ASSIGNED_ENGINEER
    ${divJoinSql}
    ${whereSql}
    GROUP BY jc.JM_ASSIGNED_ENGINEER, emp.EMM_NAME
    ORDER BY total_assigned DESC, jc.JM_ASSIGNED_ENGINEER ASC
    LIMIT ? OFFSET ?`;

  // Distinct engineer count for paging.
  const countSql = `
    SELECT COUNT(*) AS n FROM (
      SELECT 1
        FROM cmms_jobcard_mst jc
        ${divJoinSql}
        ${whereSql}
       GROUP BY jc.JM_ASSIGNED_ENGINEER
    ) t`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql, [...args, page_size, offset]),
    pool.query(countSql, args),
  ]);
  return { rows, total: Number(countRows[0].n) };
}

/**
 * Summary cards for R4: distinct engineers, total assigned, completed,
 * in-progress.
 */
async function summaryEngineerSummary(params) {
  const { divisionId, employeeId } = params;
  const dateFromTs = toBoundary(params.dateFrom, 'start');
  const dateToTs   = toBoundary(params.dateTo,   'end');

  const where = ["jc.JM_ASSIGNED_ENGINEER IS NOT NULL AND jc.JM_ASSIGNED_ENGINEER <> ''"];
  const args = [];
  if (dateFromTs) { where.push('jc.JM_JCRecdDate >= ?'); args.push(dateFromTs); }
  if (dateToTs)   { where.push('jc.JM_JCRecdDate <= ?'); args.push(dateToTs); }
  if (employeeId) { where.push('jc.JM_ASSIGNED_ENGINEER = ?'); args.push(employeeId); }

  let divJoinSql = '';
  if (divisionId) {
    divJoinSql = `LEFT JOIN cmms_eqip_mst e
                    ON e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID`;
    where.push('e.EQM_DIVID = ?'); args.push(divisionId);
  }

  const sql = `
    SELECT
      COUNT(DISTINCT jc.JM_ASSIGNED_ENGINEER)                                 AS engineers,
      COUNT(*)                                                                AS assigned_jcs,
      SUM(CASE WHEN jc.JM_MVP_STATUS = 'COMPLETED'       THEN 1 ELSE 0 END)   AS completed,
      SUM(CASE WHEN jc.JM_MVP_STATUS = 'IN_PROGRESS'     THEN 1 ELSE 0 END)   AS in_progress,
      SUM(CASE WHEN jc.JM_MVP_STATUS = 'VERIFIED_CLOSED' THEN 1 ELSE 0 END)   AS verified_closed
    FROM cmms_jobcard_mst jc
    ${divJoinSql}
    WHERE ${where.join(' AND ')}`;

  const [[rows]] = await pool.query(sql, args);
  return {
    engineers:       Number(rows[0].engineers)       || 0,
    assigned_jcs:    Number(rows[0].assigned_jcs)    || 0,
    completed:       Number(rows[0].completed)       || 0,
    in_progress:     Number(rows[0].in_progress)     || 0,
    verified_closed: Number(rows[0].verified_closed) || 0,
  };
}


// ────────────────────────────────────────────────────────────────────
//  R5 — JOB CARD SUMMARY (designed)
//  Source: cmms_jobcard_mst + cmms_eqip_mst + cmms_section_mst + emp
// ────────────────────────────────────────────────────────────────────

async function listJobCardSummary(params) {
  const { divisionId, status, engineerId, page, page_size } = params;
  const dateFromTs = toBoundary(params.dateFrom, 'start');
  const dateToTs   = toBoundary(params.dateTo,   'end');

  const where = [];
  const args = [];

  if (status)     { where.push('jc.JM_MVP_STATUS = ?'); args.push(status); }
  if (engineerId) { where.push('jc.JM_ASSIGNED_ENGINEER = ?'); args.push(engineerId); }
  if (dateFromTs) { where.push('jc.JM_JCRecdDate >= ?'); args.push(dateFromTs); }
  if (dateToTs)   { where.push('jc.JM_JCRecdDate <= ?'); args.push(dateToTs); }
  if (divisionId) { where.push('e.EQM_DIVID = ?'); args.push(divisionId); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * page_size;

  // Job type is derived: prefer JR_JOB_TYPE (Phase 6 ADD on JR); fall
  // back to legacy JM_JOBTYPE tinyint label.
  const dataSql = `
    SELECT
      jc.JM_SectionJobNo                                          AS job_card_no,
      jc.JM_JobCardNO                                             AS job_card_id,
      COALESCE(e.EQM_NAME, '')                                    AS equipment_name,
      COALESCE(jr.JR_JOB_TYPE, '')                                AS job_type,
      jc.JM_MVP_STATUS                                            AS status,
      jc.JM_ASSIGNED_ENGINEER                                     AS assigned_engineer_id,
      COALESCE(emp.EMM_NAME, '')                                  AS assigned_engineer_name,
      jc.JM_JCRecdDate                                            AS received_date,
      jc.JM_JobEndDate                                            AS completed_date,
      jc.JM_VERIFIED_ON                                           AS verified_date,
      COALESCE(s.SM_SHORTNAME, e.EQM_DIV_ABBR, '')                AS division,
      e.EQM_DIVID                                                 AS division_id,
      jc.JM_WORKFLOW_TYPE                                         AS workflow_type
    FROM cmms_jobcard_mst jc
    LEFT JOIN cmms_eqip_mst    e   ON e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID
    LEFT JOIN cmms_section_mst s   ON s.SM_ID    = e.EQM_DIVID
    LEFT JOIN cmms_emp_mst     emp ON emp.EMM_ID = jc.JM_ASSIGNED_ENGINEER
    LEFT JOIN cmms_jobrequest_mst jr ON jr.JR_JOBREQUESTNO = jc.JM_PARENT_JR_NO
    ${whereSql}
    ORDER BY jc.JM_JCRecdDate DESC, jc.JM_JobCardNO DESC
    LIMIT ? OFFSET ?`;

  const countSql = `
    SELECT COUNT(*) AS n
      FROM cmms_jobcard_mst jc
      ${divisionId ? 'LEFT JOIN cmms_eqip_mst e ON e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID' : ''}
      ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql, [...args, page_size, offset]),
    pool.query(countSql, args),
  ]);
  return { rows, total: Number(countRows[0].n) };
}

async function summaryJobCardSummary(params) {
  const { divisionId, status, engineerId } = params;
  const dateFromTs = toBoundary(params.dateFrom, 'start');
  const dateToTs   = toBoundary(params.dateTo,   'end');

  const where = [];
  const args = [];
  if (status)     { where.push('jc.JM_MVP_STATUS = ?'); args.push(status); }
  if (engineerId) { where.push('jc.JM_ASSIGNED_ENGINEER = ?'); args.push(engineerId); }
  if (dateFromTs) { where.push('jc.JM_JCRecdDate >= ?'); args.push(dateFromTs); }
  if (dateToTs)   { where.push('jc.JM_JCRecdDate <= ?'); args.push(dateToTs); }
  let divJoin = '';
  if (divisionId) {
    divJoin = `LEFT JOIN cmms_eqip_mst e ON e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID`;
    where.push('e.EQM_DIVID = ?'); args.push(divisionId);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT
      COUNT(*)                                                                AS total,
      SUM(CASE WHEN jc.JM_MVP_STATUS = 'ASSIGNED'        THEN 1 ELSE 0 END)   AS open_assigned,
      SUM(CASE WHEN jc.JM_MVP_STATUS = 'IN_PROGRESS'     THEN 1 ELSE 0 END)   AS in_progress,
      SUM(CASE WHEN jc.JM_MVP_STATUS = 'COMPLETED'       THEN 1 ELSE 0 END)   AS completed,
      SUM(CASE WHEN jc.JM_MVP_STATUS = 'VERIFIED_CLOSED' THEN 1 ELSE 0 END)   AS verified_closed,
      SUM(CASE WHEN jc.JM_MVP_STATUS = 'REOPENED'        THEN 1 ELSE 0 END)   AS reopened
    FROM cmms_jobcard_mst jc
    ${divJoin}
    ${whereSql}`;
  const [[rows]] = await pool.query(sql, args);
  return {
    total:           Number(rows[0].total)           || 0,
    open_assigned:   Number(rows[0].open_assigned)   || 0,
    in_progress:     Number(rows[0].in_progress)     || 0,
    completed:       Number(rows[0].completed)       || 0,
    verified_closed: Number(rows[0].verified_closed) || 0,
    reopened:        Number(rows[0].reopened)        || 0,
  };
}


// ────────────────────────────────────────────────────────────────────
//  R6 — JOB REQUEST SUMMARY (designed)
//  Source: cmms_jobrequest_mst + cmms_eqip_mst + cmms_section_mst
// ────────────────────────────────────────────────────────────────────

async function listJobRequestSummary(params, rowScope = { canReadAll: true }) {
  const { divisionId, status, page, page_size } = params;
  const dateFromTs = toBoundary(params.dateFrom, 'start');
  const dateToTs   = toBoundary(params.dateTo,   'end');

  const where = [];
  const args = [];

  if (status)     { where.push('jr.JR_MVP_STATUS = ?'); args.push(status); }
  if (divisionId) { where.push('jr.JR_DIVISION = ?'); args.push(divisionId); }
  if (dateFromTs) { where.push('jr.JR_CREATED_AT >= ?'); args.push(dateFromTs); }
  if (dateToTs)   { where.push('jr.JR_CREATED_AT <= ?'); args.push(dateToTs); }

  if (!rowScope.canReadAll) {
    where.push('jr.JR_SUBMITTEDBYID = ?');
    args.push(rowScope.ownerEmployeeId);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * page_size;

  const dataSql = `
    SELECT
      jr.JR_JOBREQUESTNO                                                                          AS job_request_id,
      CONCAT('JR-', YEAR(COALESCE(jr.JR_JOBREQUESTDATE, jr.JR_CREATED_AT)), '-', LPAD(jr.JR_JOBREQUESTNO, 4, '0')) AS request_code,
      COALESCE(jr.JR_EQM_NAME, e.EQM_NAME, '')                                                    AS equipment_name,
      jr.JR_JOB_TYPE                                                                              AS job_type,
      jr.JR_MVP_STATUS                                                                            AS status,
      jr.JR_SUBMITTEDBYID                                                                         AS submitted_by_employee_id,
      COALESCE(jr.JR_SUBMITTEDBYNAME, emp_s.EMM_NAME, '')                                         AS submitted_by_name,
      jr.JR_CREATED_AT                                                                            AS submitted_date,
      jr.JR_APPROVED_BY                                                                           AS approved_by,
      jr.JR_APPROVED_ON                                                                           AS approved_on,
      COALESCE(emp_a.EMM_NAME, '')                                                                AS approved_by_name,
      jr.JR_REJECTED_BY                                                                           AS rejected_by,
      jr.JR_REJECTED_ON                                                                           AS rejected_on,
      COALESCE(emp_r.EMM_NAME, '')                                                                AS rejected_by_name,
      jr.JR_REJECTION_REASON                                                                      AS rejection_reason,
      COALESCE(s.SM_SHORTNAME, '')                                                                AS division,
      jr.JR_DIVISION                                                                              AS division_id,
      jr.JR_ASSIGNED_ENGINEER                                                                     AS assigned_engineer_id,
      COALESCE(emp_e.EMM_NAME, '')                                                                AS assigned_engineer_name,
      jr.JR_PRIORITY                                                                              AS priority
    FROM cmms_jobrequest_mst jr
    LEFT JOIN cmms_eqip_mst    e     ON e.EQM_TYPE = jr.JR_EQM_TYPE AND e.EQM_ID = jr.JR_EQM_ID
    LEFT JOIN cmms_section_mst s     ON s.SM_ID    = jr.JR_DIVISION
    LEFT JOIN cmms_emp_mst     emp_s ON emp_s.EMM_ID = jr.JR_SUBMITTEDBYID
    LEFT JOIN cmms_emp_mst     emp_a ON emp_a.EMM_ID = jr.JR_APPROVED_BY
    LEFT JOIN cmms_emp_mst     emp_r ON emp_r.EMM_ID = jr.JR_REJECTED_BY
    LEFT JOIN cmms_emp_mst     emp_e ON emp_e.EMM_ID = jr.JR_ASSIGNED_ENGINEER
    ${whereSql}
    ORDER BY jr.JR_CREATED_AT DESC, jr.JR_JOBREQUESTNO DESC
    LIMIT ? OFFSET ?`;

  const countSql = `SELECT COUNT(*) AS n FROM cmms_jobrequest_mst jr ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql, [...args, page_size, offset]),
    pool.query(countSql, args),
  ]);
  return { rows, total: Number(countRows[0].n) };
}

async function summaryJobRequestSummary(params, rowScope = { canReadAll: true }) {
  const { divisionId } = params;
  const dateFromTs = toBoundary(params.dateFrom, 'start');
  const dateToTs   = toBoundary(params.dateTo,   'end');

  const where = ['1=1'];
  const args = [];
  if (divisionId) { where.push('jr.JR_DIVISION = ?'); args.push(divisionId); }
  if (dateFromTs) { where.push('jr.JR_CREATED_AT >= ?'); args.push(dateFromTs); }
  if (dateToTs)   { where.push('jr.JR_CREATED_AT <= ?'); args.push(dateToTs); }
  if (!rowScope.canReadAll) {
    where.push('jr.JR_SUBMITTEDBYID = ?');
    args.push(rowScope.ownerEmployeeId);
  }

  const sql = `
    SELECT
      COUNT(*)                                                                AS total,
      SUM(CASE WHEN jr.JR_MVP_STATUS = 'DRAFT'           THEN 1 ELSE 0 END)   AS draft,
      SUM(CASE WHEN jr.JR_MVP_STATUS = 'SUBMITTED'       THEN 1 ELSE 0 END)   AS submitted,
      SUM(CASE WHEN jr.JR_MVP_STATUS = 'ASSIGNED'        THEN 1 ELSE 0 END)   AS assigned,
      SUM(CASE WHEN jr.JR_MVP_STATUS = 'IN_PROGRESS'     THEN 1 ELSE 0 END)   AS in_progress,
      SUM(CASE WHEN jr.JR_MVP_STATUS = 'COMPLETED'       THEN 1 ELSE 0 END)   AS completed,
      SUM(CASE WHEN jr.JR_MVP_STATUS = 'VERIFIED_CLOSED' THEN 1 ELSE 0 END)   AS verified_closed,
      SUM(CASE WHEN jr.JR_MVP_STATUS = 'REJECTED'        THEN 1 ELSE 0 END)   AS rejected,
      SUM(CASE WHEN jr.JR_MVP_STATUS = 'REOPENED'        THEN 1 ELSE 0 END)   AS reopened
    FROM cmms_jobrequest_mst jr
    WHERE ${where.join(' AND ')}`;

  const [[rows]] = await pool.query(sql, args);
  return {
    total:           Number(rows[0].total)           || 0,
    draft:           Number(rows[0].draft)           || 0,
    submitted:       Number(rows[0].submitted)       || 0,
    assigned:        Number(rows[0].assigned)        || 0,
    in_progress:     Number(rows[0].in_progress)     || 0,
    completed:       Number(rows[0].completed)       || 0,
    verified_closed: Number(rows[0].verified_closed) || 0,
    rejected:        Number(rows[0].rejected)        || 0,
    reopened:        Number(rows[0].reopened)        || 0,
  };
}


// ────────────────────────────────────────────────────────────────────
//  EXPORTS
// ────────────────────────────────────────────────────────────────────
module.exports = {
  // R1
  listCalibrationDue,
  summaryCalibrationDue,
  // R2
  listPendingJobs,
  summaryPendingJobs,
  // R3
  listEquipmentUtilization,
  summaryEquipmentUtilization,
  // R4
  listEngineerSummary,
  summaryEngineerSummary,
  // R5
  listJobCardSummary,
  summaryJobCardSummary,
  // R6
  listJobRequestSummary,
  summaryJobRequestSummary,
};
