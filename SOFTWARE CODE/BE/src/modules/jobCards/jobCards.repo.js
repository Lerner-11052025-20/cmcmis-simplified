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
const { buildLaneWhere } = require('../../utils/lanes');

const SORT_MAP = {
  '-created_at': 'jc.JM_CREATED_ON DESC, jc.JM_JobCardNO DESC',
  'created_at':  'jc.JM_CREATED_ON ASC, jc.JM_JobCardNO ASC',
  '-due_date':   'jc.JM_PlannedComletedDate DESC, jc.JM_JobCardNO DESC',
  'due_date':    'jc.JM_PlannedComletedDate ASC, jc.JM_JobCardNO ASC',
  'card_code':   'jc.JM_JCRecdDate ASC, jc.JM_JobCardNO ASC',
  '-card_code':  'jc.JM_JCRecdDate DESC, jc.JM_JobCardNO DESC',
};

async function listJobCards(params, scope = null) {
  const where = [];
  const args = [];

  if (Array.isArray(scope?.laneScopes) && scope.laneScopes.length > 0) {
    const lane = buildLaneWhere('jc.JM_LANE_CODE', scope.laneScopes);
    where.push(lane.sql);
    args.push(...lane.args);
  }

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
      jc.JM_JOB_CATEGORY             AS job_category,
      jc.JM_JOB_TYPE                 AS work_type,
      jc.JM_LANE_CODE                AS lane_code,
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
       JM_JOB_CATEGORY,
       JM_JOB_TYPE,
       JM_LANE_CODE,
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
      payload.job_category || null,
      payload.job_type === 'CALIBRATION' || payload.job_type === 'REPAIR'
        ? payload.job_type
        : null,
      payload.lane_code || null,
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

// ============================================================================
//                          PHASE 9  ·  DETAIL + TRANSITIONS + TABS
// ============================================================================

// All 53 Phase 9 columns that the Detail page reads / the PATCH endpoint
// writes. Centralised here so the SELECT and the UPDATE-builder agree.
// Order matters for SELECT-AS aliases only — write-builder uses the map below.
const PHASE9_TAB_COLUMNS = [
  // Plug-in / Accessories
  'plug_in_accessories',
  // Submitted & Received
  'equipment_submitted_date', 'submitted_by',
  'equipment_received_date_actual', 'received_by',
  // Job Card Details (Phase 9 set, distinct from legacy JM_* dates)
  'instrument_received_date', 'job_complete_planned_date',
  'job_type', 'repair_type', 'job_request_remarks',
  // Equipments Used
  'equipments_used',
  // Awaiting Information
  'awaiting_for', 'awaiting_status', 'supplier_name',
  'awaiting_from_date', 'awaiting_clear_date', 'attended_by',
  // Procurement
  'indent_no', 'indent_date', 'mirv_no', 'mirv_date',
  'po_no', 'po_date', 'procurement_cost',
  // Contract / Warranty
  'vendor_supplier_name', 'intimation_sent_on',
  'sent_to_vendor_date', 'received_from_vendor_date',
  'gate_pass_no', 'gate_pass_issued_date',
  'cost_of_component', 'labour_charges',
  'invoice_no', 'invoice_recd_on',
  // Observations
  'observations_text', 'job_status_display',
  // Dedicated calibration workflow (TME/FPE calibration)
  'cal_job_started_date', 'cal_job_completed_date',
  'cal_calibration_status', 'cal_temperature_c',
  'cal_relative_humidity', 'cal_ref_no', 'cal_due_date',
  'calibrated_by_employee_id',
  'cal_equipment_received_status', 'cal_repair_carried_out_by',
  'cal_sent_to_lab_date', 'cal_received_from_lab_date',
  'cal_adjustment_status', 'cal_limited_reason',
  'cal_remarks', 'cal_incharge_employee_id', 'cal_incharge_date',
];

// ───────────────────────────────────────────────────────────────────────
//  DETAIL FETCH  (full hydrated JC row + linked JR + employee names)
// ───────────────────────────────────────────────────────────────────────
/**
 * Load one JC row with every column the detail page needs, joined to
 * cmms_emp_mst for assigned_engineer_name + completed_by_name +
 * verified_closed_by_name + last_reopened_by_name, joined to
 * cmms_eqip_mst for equipment_name + make + model, joined to
 * cmms_jobrequest_mst for the parent JR's code + complaint.
 *
 * @param {string} sectionJobNo  JM_SectionJobNo (PK)
 * @returns {Promise<Object | null>}
 */
async function findByIdWithDetails(sectionJobNo) {
  const [rows] = await pool.query(
    `SELECT
       jc.JM_SectionJobNo               AS section_job_no,
       jc.JM_JobCardNO                  AS jc_no,
       jc.JM_EQM_TYPE                   AS equipment_type,
       jc.JM_EQM_ID                     AS equipment_id,
       jc.JM_FNPETYPE                   AS fnpe_type,
       jc.JM_JOB_CATEGORY               AS job_category,
       jc.JM_JOB_TYPE                   AS work_type,
       jc.JM_LANE_CODE                  AS lane_code,
       jc.JM_JCRecdDate                 AS jc_recd_date,
       jc.JM_InstRecdDate               AS inst_recd_date,
       jc.JM_PlannedStartDate           AS planned_start_date,
       jc.JM_PlannedComletedDate        AS planned_completed_date,
       jc.JM_JobStartDate               AS job_start_date,
       jc.JM_JobEndDate                 AS job_end_date,
       jc.JM_COMPLAINTANDSYMPTOMS       AS complaint_description,
       jc.JM_MVP_STATUS                 AS status,
       jc.JM_CREATED_BY                 AS created_by_employee_id,
       jc.JM_CREATED_ON                 AS created_at,
       jc.JM_UPDATED_ON                 AS updated_at,
       jc.JM_PARENT_JR_NO               AS parent_jr_no,
       jc.JM_ASSIGNED_ENGINEER          AS assigned_engineer_employee_id,
       jc.JM_WORKFLOW_TYPE              AS workflow_type,
       jc.JM_REQUIRED_RESOURCES         AS required_resources,
       jc.JM_SPECIAL_INSTRUCTIONS       AS special_instructions,
       /* Phase 9 tab columns */
       jc.plug_in_accessories,
       jc.equipment_submitted_date,    jc.submitted_by,
       jc.equipment_received_date_actual, jc.received_by,
       jc.instrument_received_date, jc.job_complete_planned_date,
       jc.job_type AS phase9_job_type, jc.repair_type, jc.job_request_remarks,
       jc.equipments_used,
       jc.awaiting_for, jc.awaiting_status, jc.supplier_name,
       jc.awaiting_from_date, jc.awaiting_clear_date, jc.attended_by,
       jc.indent_no, jc.indent_date, jc.mirv_no, jc.mirv_date,
       jc.po_no, jc.po_date, jc.procurement_cost,
       jc.vendor_supplier_name, jc.intimation_sent_on,
       jc.sent_to_vendor_date, jc.received_from_vendor_date,
       jc.gate_pass_no, jc.gate_pass_issued_date,
       jc.cost_of_component, jc.labour_charges,
       jc.invoice_no, jc.invoice_recd_on,
       jc.observations_text, jc.job_status_display,
       jc.cal_job_started_date, jc.cal_job_completed_date,
       jc.cal_calibration_status, jc.cal_temperature_c,
       jc.cal_relative_humidity, jc.cal_ref_no, jc.cal_due_date,
       jc.calibrated_by_employee_id,
       jc.cal_equipment_received_status, jc.cal_repair_carried_out_by,
       jc.cal_sent_to_lab_date, jc.cal_received_from_lab_date,
       jc.cal_adjustment_status, jc.cal_limited_reason,
       jc.cal_remarks, jc.cal_incharge_employee_id, jc.cal_incharge_date,
       jc.completion_summary, jc.actual_completion_date, jc.total_hours_spent,
       jc.marked_complete_by_employee_id, jc.marked_complete_at,
       jc.reviewed_by, jc.review_date, jc.review_comments,
       jc.equipment_received_by_customer, jc.customer_received_date,
       jc.customer_acknowledged, jc.final_closure_notes,
       jc.verified_closed_by_employee_id, jc.verified_closed_at,
       jc.last_reopened_at, jc.last_reopened_by_employee_id, jc.reopen_count,
       /* equipment */
       e.EQM_NAME                       AS equipment_name,
       e.EQM_MODELNO                    AS equipment_model_no,
       e.EQM_SRNO                       AS equipment_serial_no,
       /* engineer */
       emp_eng.EMM_NAME                 AS assigned_engineer_name,
       /* parent JR */
       jr.JR_JOBREQUESTNO               AS jr_no,
       jr.JR_JOBREQUESTDATE             AS jr_date,
       jr.JR_PRIORITY                   AS jr_priority_db,
       jr.JR_DIVISION                   AS division_id,
       sm.SM_SHORTNAME                  AS division_code,
       sm.SM_NAME                       AS division_name,
       /* completion / closure / reopen actor names */
       emp_mc.EMM_NAME                  AS marked_complete_by_name,
       emp_vc.EMM_NAME                  AS verified_closed_by_name,
       emp_ro.EMM_NAME                  AS last_reopened_by_name,
       emp_cal.EMM_NAME                 AS calibrated_by_name,
       emp_ci.EMM_NAME                  AS cal_incharge_name
     FROM cmms_jobcard_mst jc
     LEFT JOIN cmms_eqip_mst       e        ON e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID
     LEFT JOIN cmms_emp_mst        emp_eng  ON emp_eng.EMM_ID = jc.JM_ASSIGNED_ENGINEER
     LEFT JOIN cmms_jobrequest_mst jr       ON jr.JR_JOBREQUESTNO = jc.JM_PARENT_JR_NO
     LEFT JOIN cmms_section_mst    sm       ON sm.SM_ID = jr.JR_DIVISION
    LEFT JOIN cmms_emp_mst        emp_mc   ON emp_mc.EMM_ID = jc.marked_complete_by_employee_id
    LEFT JOIN cmms_emp_mst        emp_vc   ON emp_vc.EMM_ID = jc.verified_closed_by_employee_id
    LEFT JOIN cmms_emp_mst        emp_ro   ON emp_ro.EMM_ID = jc.last_reopened_by_employee_id
    LEFT JOIN cmms_emp_mst        emp_cal  ON emp_cal.EMM_ID = jc.calibrated_by_employee_id
    LEFT JOIN cmms_emp_mst        emp_ci   ON emp_ci.EMM_ID = jc.cal_incharge_employee_id
     WHERE jc.JM_SectionJobNo = ?
     LIMIT 1`,
    [sectionJobNo],
  );
  return rows[0] || null;
}

// ───────────────────────────────────────────────────────────────────────
//  HISTORY  (chronological state-machine log)
// ───────────────────────────────────────────────────────────────────────
async function findStatusHistory(sectionJobNo) {
  const [rows] = await pool.query(
    `SELECT
       h.from_status,
       h.to_status,
       h.transitioned_at,
       h.transitioned_by              AS transitioned_by_employee_id,
       emp.EMM_NAME                   AS transitioned_by_name,
       h.reason
     FROM job_card_status_history h
     LEFT JOIN cmms_emp_mst emp ON emp.EMM_ID = h.transitioned_by
     WHERE h.jc_section_no = ?
     ORDER BY h.transitioned_at ASC, h.history_id ASC`,
    [sectionJobNo],
  );
  return rows;
}

// ───────────────────────────────────────────────────────────────────────
//  LOAD-FOR-MUTATION  (FOR UPDATE inside a service transaction)
// ───────────────────────────────────────────────────────────────────────
async function findForMutation(conn, sectionJobNo) {
  const [rows] = await conn.query(
    `SELECT
       JM_SectionJobNo                  AS section_job_no,
       JM_JobCardNO                     AS jc_no,
       JM_MVP_STATUS                    AS status,
       JM_ASSIGNED_ENGINEER             AS assigned_engineer_employee_id,
       JM_WORKFLOW_TYPE                 AS workflow_type,
       JM_JOB_TYPE                      AS work_type,
       JM_PARENT_JR_NO                  AS parent_jr_no,
       JM_LANE_CODE                     AS lane_code,
       JM_EQM_TYPE                      AS equipment_type,
       JM_EQM_ID                        AS equipment_id,
       observations_text,
       cal_calibration_status,
       cal_remarks,
       reopen_count
     FROM cmms_jobcard_mst
     WHERE JM_SectionJobNo = ?
     FOR UPDATE`,
    [sectionJobNo],
  );
  return rows[0] || null;
}

// ───────────────────────────────────────────────────────────────────────
//  PATCH TAB  (save tab data; no state change)
// ───────────────────────────────────────────────────────────────────────
/**
 * Build a dynamic SET clause from whichever Phase 9 columns the body
 * carries. Unknown keys are silently ignored. This lets the FE auto-save
 * "just the tab I'm on" without sending the whole record.
 *
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {string} sectionJobNo
 * @param {Object} body  (already validated by patchTabSchema)
 * @returns {Promise<number>}  Number of columns updated.
 */
async function patchTab(conn, sectionJobNo, body) {
  const sets = [];
  const vals = [];
  for (const col of PHASE9_TAB_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(body, col)) {
      let v = body[col];
      // Empty string from a date input means "no date" — convert to NULL
      // so MySQL doesn't try to parse '' as a date and throw.
      if (v === '') v = null;
      sets.push(`\`${col}\` = ?`);
      vals.push(v);
    }
  }
  // Always touch the legacy JM_UPDATED_ON timestamp so consumers can see
  // "this JC was edited" without joining audit_log. JM_UPDATED_BY is
  // varchar(50) on the legacy column; we put the employee_id there.
  // (Caller passes _updated_by in the body — never trust client.)
  if (body._updated_by_employee_id) {
    sets.push('`JM_UPDATED_ON` = NOW(6)');
    sets.push('`JM_UPDATED_BY` = ?');
    vals.push(String(body._updated_by_employee_id).slice(0, 50));
  }
  if (sets.length === 0) return 0;
  vals.push(sectionJobNo);
  await conn.query(
    `UPDATE cmms_jobcard_mst SET ${sets.join(', ')} WHERE JM_SectionJobNo = ?`,
    vals,
  );
  return sets.length;
}

// ───────────────────────────────────────────────────────────────────────
//  STATE TRANSITION UPDATES  (one helper per transition for clarity)
// ───────────────────────────────────────────────────────────────────────

async function setStatusStartWork(conn, sectionJobNo, { actorEmployeeId }) {
  // ASSIGNED → IN_PROGRESS. Also stamp JM_JobStartDate (legacy "actual
  // start" column) since the engineer is starting NOW.
  await conn.query(
    `UPDATE cmms_jobcard_mst
        SET JM_MVP_STATUS = 'IN_PROGRESS',
            JM_JobStartDate = NOW(6),
            JM_UPDATED_ON = NOW(6),
            JM_UPDATED_BY = ?
      WHERE JM_SectionJobNo = ?`,
    [String(actorEmployeeId).slice(0, 50), sectionJobNo],
  );
}

async function setStatusMarkComplete(conn, sectionJobNo, { actorEmployeeId, summary, actualDate, totalHours }) {
  await conn.query(
    `UPDATE cmms_jobcard_mst
        SET JM_MVP_STATUS = 'COMPLETED',
            JM_JobEndDate = NOW(6),
            completion_summary = ?,
            actual_completion_date = ?,
            total_hours_spent = ?,
            marked_complete_by_employee_id = ?,
            marked_complete_at = NOW(6),
            JM_UPDATED_ON = NOW(6),
            JM_UPDATED_BY = ?
      WHERE JM_SectionJobNo = ?`,
    [
      summary,
      actualDate,
      totalHours,
      actorEmployeeId,
      String(actorEmployeeId).slice(0, 50),
      sectionJobNo,
    ],
  );
}

async function setStatusVerifyClose(conn, sectionJobNo, { actorEmployeeId, closureFields }) {
  await conn.query(
    `UPDATE cmms_jobcard_mst
        SET JM_MVP_STATUS = 'VERIFIED_CLOSED',
            JM_VERIFIED_BY = ?,
            JM_VERIFIED_ON = NOW(6),
            verified_closed_by_employee_id = ?,
            verified_closed_at = NOW(6),
            reviewed_by = ?,
            review_date = ?,
            review_comments = ?,
            equipment_received_by_customer = ?,
            customer_received_date = ?,
            customer_acknowledged = ?,
            final_closure_notes = ?,
            JM_UPDATED_ON = NOW(6),
            JM_UPDATED_BY = ?
      WHERE JM_SectionJobNo = ?`,
    [
      actorEmployeeId,                                   // JM_VERIFIED_BY (legacy varchar 7)
      actorEmployeeId,                                   // verified_closed_by_employee_id
      closureFields.reviewed_by,
      closureFields.review_date,
      closureFields.review_comments,
      closureFields.equipment_received_by_customer,
      closureFields.customer_received_date,
      closureFields.customer_acknowledged ? 1 : 0,
      closureFields.final_closure_notes || null,
      String(actorEmployeeId).slice(0, 50),
      sectionJobNo,
    ],
  );
}

async function setStatusReopen(conn, sectionJobNo, { actorEmployeeId, reason, fromVerifiedClosed }) {
  // Reset completion fields always; reset closure fields only if reopening
  // from VERIFIED_CLOSED (D-9.6).
  let sql = `
    UPDATE cmms_jobcard_mst
       SET JM_MVP_STATUS = 'IN_PROGRESS',
           JM_JobEndDate = NULL,
           JM_REOPENED_REASON = ?,
           last_reopened_at = NOW(6),
           last_reopened_by_employee_id = ?,
           reopen_count = reopen_count + 1,
           /* Always reset completion */
           completion_summary = NULL,
           actual_completion_date = NULL,
           total_hours_spent = NULL,
           marked_complete_by_employee_id = NULL,
           marked_complete_at = NULL`;
  if (fromVerifiedClosed) {
    sql += `,
           /* Reopening from VERIFIED_CLOSED — also reset closure */
           JM_VERIFIED_BY = NULL,
           JM_VERIFIED_ON = NULL,
           verified_closed_by_employee_id = NULL,
           verified_closed_at = NULL,
           reviewed_by = NULL,
           review_date = NULL,
           review_comments = NULL,
           equipment_received_by_customer = NULL,
           customer_received_date = NULL,
           customer_acknowledged = 0,
           final_closure_notes = NULL`;
  }
  sql += `,
           JM_UPDATED_ON = NOW(6),
           JM_UPDATED_BY = ?
     WHERE JM_SectionJobNo = ?`;
  await conn.query(sql, [
    String(reason).slice(0, 500),
    actorEmployeeId,
    String(actorEmployeeId).slice(0, 50),
    sectionJobNo,
  ]);
}

// ───────────────────────────────────────────────────────────────────────
//  STATE-HISTORY (write one row per transition)
// ───────────────────────────────────────────────────────────────────────
async function appendStatusHistory(conn, sectionJobNo, fromStatus, toStatus, actorEmployeeId, reason = null) {
  await conn.query(
    `INSERT INTO job_card_status_history
       (jc_section_no, from_status, to_status, transitioned_at, transitioned_by, reason)
     VALUES (?, ?, ?, NOW(6), ?, ?)`,
    [sectionJobNo, fromStatus, toStatus, actorEmployeeId, reason ? String(reason).slice(0, 1000) : null],
  );
}

// ───────────────────────────────────────────────────────────────────────
//  PRE-COMPLETION GATES  (run as SQL, no in-process counters)
// ───────────────────────────────────────────────────────────────────────
/**
 * Returns the state of each of the 4 pre-completion gates from D-9.4.
 * Service layer reads this AFTER state-machine validates → before
 * setStatusMarkComplete UPDATE.
 *
 *   tasks_pending_count    must be 0 (or tasks_total=0)
 *   observations_count     must be ≥1 OR observations_text length ≥20
 *   active_doc_count       must be >=1
 *   calibration fields     can satisfy the work-observation gate for the
 *                          dedicated calibration workflow.
 *
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {string} sectionJobNo
 * @returns {Promise<Object>}
 */
async function gatherCompletionGates(conn, sectionJobNo) {
  const [[tasks]] = await conn.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN is_completed = 0 THEN 1 ELSE 0 END) AS pending
       FROM jc_task_checklist
      WHERE jc_section_no = ?`,
    [sectionJobNo],
  );
  const [[obs]] = await conn.query(
    `SELECT COUNT(*) AS n FROM jc_observations_readings WHERE jc_section_no = ?`,
    [sectionJobNo],
  );
  const [[obsText]] = await conn.query(
    `SELECT
            CHAR_LENGTH(COALESCE(observations_text, '')) AS len,
            CHAR_LENGTH(COALESCE(cal_remarks, '')) AS cal_remarks_len,
            CASE WHEN COALESCE(cal_calibration_status, '') <> '' THEN 1 ELSE 0 END AS has_cal_status
       FROM cmms_jobcard_mst WHERE JM_SectionJobNo = ?`,
    [sectionJobNo],
  );
  const [[calAdjustments]] = await conn.query(
    `SELECT COUNT(*) AS n
       FROM jc_calibration_adjustments
      WHERE jc_section_no = ?`,
    [sectionJobNo],
  );
  const [[docs]] = await conn.query(
    `SELECT COUNT(*) AS n
       FROM jc_documents
      WHERE jc_section_no = ?
        AND deleted_at IS NULL`,
    [sectionJobNo],
  );
  return {
    tasks_total: Number(tasks.total || 0),
    tasks_pending: Number(tasks.pending || 0),
    observations_count: Number(obs.n || 0),
    observations_text_length: Number(obsText.len || 0),
    cal_remarks_length: Number(obsText.cal_remarks_len || 0),
    has_calibration_status: Number(obsText.has_cal_status || 0) === 1,
    calibration_adjustment_count: Number(calAdjustments.n || 0),
    active_doc_count: Number(docs.n || 0),
    required_doc_count: Number(docs.n || 0),
  };
}

// ───────────────────────────────────────────────────────────────────────
//  AUDIT LOG  (Phase 9-specific actions: JC_START_WORK, JC_MARK_COMPLETE, …)
// ───────────────────────────────────────────────────────────────────────
async function writePhase9AuditLog(conn, { actorEmployeeId, actorRoleCode, action, sectionJobNo, ipAddress, userAgent, details }) {
  const notes = (() => {
    let s = JSON.stringify(details || {});
    return s.length > 500 ? s.slice(0, 497) + '...' : s;
  })();
  await conn.query(
    `INSERT INTO audit_log
       (action, actor_employee_id, actor_role_code, entity_type, entity_id, ip_address, user_agent, notes, occurred_at)
     VALUES (?, ?, ?, 'job_card', ?, ?, ?, ?, NOW(6))`,
    [
      action,
      actorEmployeeId,
      actorRoleCode || null,
      String(sectionJobNo),
      ipAddress || null,
      userAgent || null,
      notes,
    ],
  );
}

async function getJobCardsForExport(startId, endId) {
  const [rows] = await pool.query(
    `SELECT
       jc.JM_JobCardNO                AS jc_no,
       jc.JM_SectionJobNo             AS section_job_no,
       jc.JM_JCRecdDate               AS recd_date,
       jc.JM_JobStartDate             AS start_date,
       jc.JM_PlannedComletedDate      AS due_date,
       jc.JM_CREATED_ON               AS created_at,
       jc.JM_MVP_STATUS               AS status,
       jc.JM_JOB_CATEGORY             AS job_category,
       jc.JM_JOB_TYPE                 AS work_type,
       jc.JM_LANE_CODE                AS lane_code,
       e.EQM_NAME                     AS equipment_name,
       jr.JR_JOBREQUESTNO             AS jr_no,
       jr.JR_JOBREQUESTDATE           AS jr_date,
       emp.EMM_NAME                   AS engineer_name
     FROM cmms_jobcard_mst jc
     LEFT JOIN cmms_eqip_mst    e   ON e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID
     LEFT JOIN cmms_jobrequest_mst jr ON jr.JR_SECTIONJOB_NO = jc.JM_SectionJobNo
     LEFT JOIN cmms_emp_mst     emp ON emp.EMM_ID = jr.JR_ASSIGNED_ENGINEER
     WHERE jc.JM_JobCardNO >= ?
       AND jc.JM_JobCardNO <= ?
     ORDER BY jc.JM_JobCardNO ASC`,
    [Number(startId), Number(endId)]
  );
  return rows;
}

module.exports = {
  listJobCards,
  // Phase 7 Slice 2 additions:
  nextJobCardNo,
  formatSectionJobNo,
  insertFromJobRequest,
  writeAuditLog,
  // Phase 9 additions:
  PHASE9_TAB_COLUMNS,
  findByIdWithDetails,
  findStatusHistory,
  findForMutation,
  patchTab,
  setStatusStartWork,
  setStatusMarkComplete,
  setStatusVerifyClose,
  setStatusReopen,
  appendStatusHistory,
  gatherCompletionGates,
  writePhase9AuditLog,
  getJobCardsForExport,
};
