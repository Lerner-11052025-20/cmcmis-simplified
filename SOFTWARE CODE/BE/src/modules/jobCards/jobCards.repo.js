// ============================================================================
// src/modules/jobCards/jobCards.repo.js  —  DAL for cmms_jobcard_mst (read-only)
// ----------------------------------------------------------------------------
// ONLY file in the jobCards module that contains SQL. Slice 1 is read-only
// list. Joins to:
//   cmms_jobrequest_mst — for JR_JOBREQUESTNO + JR_JOBREQUESTDATE + JR_ASSIGNED_ENGINEER
//   cmms_eqip_mst       — for equipment_name
//   cmms_emp_mst        — for assigned_engineer_name (LEFT JOIN keyed on JR_ASSIGNED_ENGINEER)
//
// All canonical aliases applied here. Service / controller never see
// JM_* / JR_* names.
// ============================================================================

'use strict';

const pool = require('../../config/db');

const SORT_MAP = {
  '-created_at': 'jc.JM_CREATED_ON DESC, jc.JM_JobCardNO DESC',
  'created_at':  'jc.JM_CREATED_ON ASC, jc.JM_JobCardNO ASC',
  '-due_date':   'jc.JM_PlannedComletedDate DESC, jc.JM_JobCardNO DESC',
  'due_date':    'jc.JM_PlannedComletedDate ASC, jc.JM_JobCardNO ASC',
  'card_code':   'jc.JM_JCRecdDate ASC, jc.JM_JobCardNO ASC',
  '-card_code':  'jc.JM_JCRecdDate DESC, jc.JM_JobCardNO DESC',
};

async function listJobCards(params) {
  const where = [];
  const args = [];

  if (params.q) {
    where.push(`(
      jc.JM_JobCardNO   LIKE ?
      OR jc.JM_SectionJobNo LIKE ?
      OR e.EQM_NAME     LIKE ?
      OR emp.EMM_NAME   LIKE ?
    )`);
    const like = `%${params.q}%`;
    args.push(like, like, like, like);
  }

  if (params.status) {
    where.push('jc.JM_MVP_STATUS = ?');
    args.push(params.status);
  }

  if (params.assigned_engineer_id) {
    where.push('jr.JR_ASSIGNED_ENGINEER = ?');
    args.push(params.assigned_engineer_id);
  }

  if (params.date_from) {
    where.push('jc.JM_CREATED_ON >= ?');
    args.push(params.date_from + ' 00:00:00');
  }
  if (params.date_to) {
    where.push('jc.JM_CREATED_ON <= ?');
    args.push(params.date_to + ' 23:59:59');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderBy = SORT_MAP[params.sort] || SORT_MAP['-created_at'];
  const offset = (params.page - 1) * params.page_size;

  const dataSql = `
    SELECT
      jc.JM_JobCardNO                AS jc_no,
      jc.JM_SectionJobNo             AS section_job_no,
      jc.JM_JCRecdDate               AS recd_date,
      jc.JM_JobStartDate             AS start_date,
      jc.JM_PlannedComletedDate      AS due_date,
      jc.JM_JobEndDate               AS completed_at,
      jc.JM_CREATED_ON               AS created_at,
      jc.JM_UPDATED_ON               AS updated_at,
      jc.JM_MVP_STATUS               AS status,
      jc.JM_EQM_ID                   AS equipment_id,
      jc.JM_EQM_TYPE                 AS equipment_type,
      e.EQM_NAME                     AS equipment_name,
      jr.JR_JOBREQUESTNO             AS jr_no,
      jr.JR_JOBREQUESTDATE           AS jr_date,
      jr.JR_ASSIGNED_ENGINEER        AS engineer_employee_id,
      emp.EMM_NAME                   AS engineer_name
    FROM cmms_jobcard_mst jc
    LEFT JOIN cmms_eqip_mst    e   ON e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID
    LEFT JOIN cmms_jobrequest_mst jr ON jr.JR_SECTIONJOB_NO = jc.JM_SectionJobNo
    LEFT JOIN cmms_emp_mst     emp ON emp.EMM_ID = jr.JR_ASSIGNED_ENGINEER
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?`;

  // IMPORTANT: countSql must mirror dataSql's JOIN tree exactly. The WHERE
  // clause can reference e.EQM_NAME (equipment search) and emp.EMM_NAME
  // (engineer search), so both LEFT JOINs are required here too — otherwise
  // a search hits "Unknown column 'e.EQM_NAME' in 'where clause'".
  const countSql = `
    SELECT COUNT(*) AS n
    FROM cmms_jobcard_mst jc
    LEFT JOIN cmms_eqip_mst       e   ON e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID
    LEFT JOIN cmms_jobrequest_mst jr  ON jr.JR_SECTIONJOB_NO = jc.JM_SectionJobNo
    LEFT JOIN cmms_emp_mst        emp ON emp.EMM_ID = jr.JR_ASSIGNED_ENGINEER
    ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql, [...args, params.page_size, offset]),
    pool.query(countSql, args),
  ]);

  return { rows, total: countRows[0].n };
}

// ============================================================================
//                          PHASE 7 SLICE 2  ·  WRITE PATH
// ============================================================================
//  Convert turns a JR into a JC. The JC sequence + INSERT both run inside
//  the caller's (jobRequests.service.convertToJobCard) transaction so that
//  a rollback rewinds them together with the JR's status flip.
// ============================================================================

// ───────────────────────────────────────────────────────────────────────
//  NEXT JM_JobCardNO  ·  pessimistic-locked MAX+1 (same pattern as nextJrNo)
// ───────────────────────────────────────────────────────────────────────
/**
 * cmms_jobcard_mst.JM_JobCardNO is INT NOT NULL but NOT AUTO_INCREMENT
 * (legacy contract — Phase 3 sealed). Two concurrent Convert calls could
 * race to compute MAX+1 and collide on a derived JM_SectionJobNo. The
 * SELECT FOR UPDATE row-lock serialises the read-then-write.
 *
 * @param {import('mysql2/promise').PoolConnection} conn  Inside a transaction
 * @returns {Promise<number>}
 */
async function nextJobCardNo(conn) {
  const [rows] = await conn.query(
    `SELECT COALESCE(MAX(JM_JobCardNO), 0) + 1 AS next_id
       FROM cmms_jobcard_mst
       FOR UPDATE`,
  );
  return rows[0].next_id;
}

/**
 * Build the canonical JM_SectionJobNo from a JM_JobCardNO. Slice 2 format
 * (D-7.2.5): `"J" + zeroPad(jcNo, 8)` — e.g. "J00024214". Always 9 chars
 * (= varchar(9) PK max). Legacy values like "62026043" remain valid; the
 * "J" prefix guarantees zero collision with legacy data.
 *
 * @param {number} jcNo
 * @returns {string}
 */
function formatSectionJobNo(jcNo) {
  if (!Number.isFinite(jcNo) || jcNo <= 0) {
    throw new Error('formatSectionJobNo: jcNo must be a positive integer');
  }
  return 'J' + String(jcNo).padStart(8, '0');
}

// ───────────────────────────────────────────────────────────────────────
//  INSERT a new Job Card  (txn-scoped — caller owns the transaction)
// ───────────────────────────────────────────────────────────────────────
/**
 * Insert a brand-new JC with status=ASSIGNED, populating every NOT NULL
 * legacy column with sensible defaults so the existing schema's NOT NULL
 * contract is satisfied.
 *
 * The "legacy default" values:
 *   JM_JobStatus           'A'   — legacy "Accepted" code seen in 19,432 existing rows.
 *   JM_WarrantyRepairs     0     — no warranty work by default (LIC can adjust later).
 *   JM_ContractRepairs     0     — same.
 *   JM_JOBTYPE             0     — legacy tinyint default per CREATE TABLE.
 *   JM_FNPETYPE            null  — derived from JR.job_category if needed (Phase 9).
 *
 * Field mapping (canonical → JM_*):
 *   equipment_type           → JM_EQM_TYPE
 *   equipment_id             → JM_EQM_ID
 *   section_job_no           → JM_SectionJobNo   (PK)
 *   job_card_no              → JM_JobCardNO
 *   equipment_received_date  → JM_JCRecdDate + JM_InstRecdDate (one device)
 *   planned_start_date       → JM_PlannedStartDate
 *   target_end_date          → JM_PlannedComletedDate
 *   complaint_description    → JM_COMPLAINTANDSYMPTOMS  (copied from JR)
 *   assigned_engineer_id     → JM_ASSIGNED_ENGINEER   (NEW Slice 2 column)
 *   workflow_type            → JM_WORKFLOW_TYPE       (NEW)
 *   required_resources       → JM_REQUIRED_RESOURCES  (NEW)
 *   special_instructions     → JM_SPECIAL_INSTRUCTIONS(NEW)
 *   parent_jr_no             → JM_PARENT_JR_NO        (NEW)
 *   created_by_employee_id   → JM_CREATED_BY  (also stuffed into JM_UPDATED_BY)
 *
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {Object} payload  Canonical insert data (validated upstream)
 */
async function insertFromJobRequest(conn, payload) {
  // Defensive width-truncation helper. The repo is the boundary that
  // fits the wider canonical strings into narrower legacy column widths
  // — identical pattern to jobRequests.repo.tr().
  const tr = (s, n) => (s == null ? null : String(s).slice(0, n));

  await conn.query(
    `INSERT INTO cmms_jobcard_mst (
       JM_JobCardNO,
       JM_EQM_TYPE, JM_EQM_ID,
       JM_FNPETYPE,
       JM_SectionJobNo,
       JM_JCRecdDate,
       JM_InstRecdDate,
       JM_JobStatus,
       JM_Job,
       JM_PlannedStartDate,
       JM_PlannedComletedDate,
       JM_WarrantyRepairs, JM_ContractRepairs,
       JM_JOBTYPE,
       JM_Remarks,
       JM_COMPLAINTANDSYMPTOMS,
       JM_CREATED_BY, JM_CREATED_ON,
       JM_UPDATED_BY, JM_UPDATED_ON,
       JM_MVP_STATUS,
       JM_ASSIGNED_ENGINEER,
       JM_WORKFLOW_TYPE,
       JM_REQUIRED_RESOURCES,
       JM_SPECIAL_INSTRUCTIONS,
       JM_PARENT_JR_NO
     ) VALUES (
       ?,
       ?, ?,
       ?,
       ?,
       ?,
       ?,
       ?,
       ?,
       ?,
       ?,
       ?, ?,
       ?,
       ?,
       ?,
       ?, NOW(6),
       ?, NOW(6),
       'ASSIGNED',
       ?,
       ?,
       ?,
       ?,
       ?
     )`,
    [
      payload.job_card_no,
      tr(payload.equipment_type, 15),
      payload.equipment_id,
      // FNPE type — legacy single-char column. Derive from job_category
      // if available, else NULL. ('T' for TME, 'F' for FPE — both fit in CHAR(1).)
      payload.job_category === 'TME' ? 'T'
        : payload.job_category === 'FPE' ? 'F'
        : null,
      tr(payload.section_job_no, 9),     // PK — generated by nextJobCardNo + formatSectionJobNo
      payload.equipment_received_date,    // JM_JCRecdDate (NOT NULL)
      payload.equipment_received_date,    // JM_InstRecdDate — same device, same date
      'A',                                // JM_JobStatus legacy 'Accepted' code
      'Accepted',                         // JM_Job — human label
      payload.planned_start_date,         // JM_PlannedStartDate (NOT NULL)
      payload.target_end_date,            // JM_PlannedComletedDate (NOT NULL)
      0,                                  // JM_WarrantyRepairs
      0,                                  // JM_ContractRepairs
      0,                                  // JM_JOBTYPE — legacy tinyint default
      // JM_Remarks — keep null on Slice 2; Phase 9 engineers fill this.
      null,
      tr(payload.complaint_description, 400),
      tr(payload.created_by_employee_id, 7),
      tr(payload.created_by_employee_id, 50),   // JM_UPDATED_BY is varchar(50), be generous
      tr(payload.assigned_engineer_employee_id, 7),
      tr(payload.workflow_type, 50),
      tr(payload.required_resources, 2000),
      tr(payload.special_instructions, 2000),
      payload.parent_jr_no,
    ],
  );
}

// ───────────────────────────────────────────────────────────────────────
//  AUDIT LOG  (txn-scoped — shared shape with jobRequests.repo)
// ───────────────────────────────────────────────────────────────────────
/**
 * Write a JC-related audit row. Same envelope as jobRequests.repo.writeAuditLog
 * but the entity_type is hard-coded to 'job_card' and entity_id is the
 * JM_SectionJobNo (varchar 9) rather than the JR's int.
 */
async function writeAuditLog(conn, { actorEmployeeId, actorRoleCode, action, sectionJobNo, ipAddress, userAgent, details }) {
  const notes = (() => {
    let s = JSON.stringify(details || {});
    return s.length > 500 ? s.slice(0, 497) + '...' : s;
  })();
  await conn.query(
    `INSERT INTO audit_log
       (action, actor_employee_id, actor_role_code, entity_type, entity_id, ip_address, user_agent, notes, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
    [
      action,
      actorEmployeeId,
      actorRoleCode || null,
      'job_card',
      String(sectionJobNo),
      ipAddress || null,
      userAgent || null,
      notes,
    ],
  );
}

module.exports = {
  listJobCards,
  // Phase 7 Slice 2 additions:
  nextJobCardNo,
  formatSectionJobNo,
  insertFromJobRequest,
  writeAuditLog,
};
