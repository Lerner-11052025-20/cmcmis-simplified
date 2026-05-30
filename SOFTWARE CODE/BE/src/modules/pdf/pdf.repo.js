// ============================================================================
// src/modules/pdf/pdf.repo.js  —  Read-only full-payload loaders for PDFs
// ----------------------------------------------------------------------------
// PHASE 11 — PDF Generation
//
// DOCTRINE
//   • ONLY this file mentions real legacy column names (JM_*, JR_*, EQM_*).
//   • Every SELECT aliases to canonical snake_case so the renderers never
//     see legacy column names.
//   • READ-ONLY. Zero INSERT/UPDATE/DELETE in this module. No audit rows,
//     no download logs (Phase 11 §1.F + §5).
//   • Every value bound via `?` placeholder. Column names are NEVER
//     interpolated from user input.
//
// FUNCTIONS
//   loadJobCardFull(sectionJobNo)
//     → master row + all 5 Phase-9 child tables + state history + parent JR
//       summary + equipment + division + employee-name resolutions.
//       Used by BOTH PDF #1 (Certificate) and PDF #2 (Details).
//
//   loadJobRequestFull(jrNo)
//     → JR detail row + division + employee names + linked JC summary +
//       accessories + state history. Used by PDF #3.
//
// CHILD TABLES (Phase 9, all keyed by `jc_section_no = JM_SectionJobNo`):
//   jc_maintenance_details
//   jc_spares_used
//   jc_task_checklist
//   jc_documents              (filter: deleted_at IS NULL)
//   jc_observations_readings
//   job_card_status_history
//
// JR child:
//   job_request_accessories   (keyed by jr_no = JR_JOBREQUESTNO)
//   job_request_status_history
// ============================================================================

'use strict';

const pool = require('../../config/db');

// ──────────────────────────────────────────────────────────────────────────
//  JOB CARD — full payload (master + children + joins)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Load EVERYTHING needed to render a Job Card PDF (either certificate or
 * details). Returns null when the section_job_no does not exist; the
 * service treats null as a 404.
 *
 * The shape mirrors `jobCards.repo.findByIdWithDetails` (Phase 9) but
 * pulls additional fields the certificate template needs (request-side
 * snapshots — submitter snapshot, division, project, lab/room phones)
 * and bundles ALL child rows in parallel.
 *
 * @param {string} sectionJobNo  Phase-9 `JM_SectionJobNo` (e.g. "J00024219")
 * @returns {Promise<object|null>}
 */
async function loadJobCardFull(sectionJobNo) {
  // ── 1. Master row + lookups ─────────────────────────────────────────
  // Single wide SELECT — every join LEFT so a half-populated JC still
  // returns its data. parent_jr_no may be NULL for legacy rows that
  // pre-date the Phase 7 Slice 2 linking column.
  const [rows] = await pool.query(
    `SELECT
       /* identity */
       jc.JM_SectionJobNo                AS section_job_no,
       jc.JM_JobCardNO                   AS jc_no,
       jc.JM_EQM_TYPE                    AS equipment_type,
       jc.JM_EQM_ID                      AS equipment_id,
       jc.JM_FNPETYPE                    AS fnpe_type,
       /* timestamps */
       jc.JM_JCRecdDate                  AS jc_recd_date,
       jc.JM_InstRecdDate                AS inst_recd_date,
       jc.JM_PlannedStartDate            AS planned_start_date,
       jc.JM_PlannedComletedDate         AS planned_completed_date,
       jc.JM_JobStartDate                AS job_start_date,
       jc.JM_JobEndDate                  AS job_end_date,
       jc.JM_CREATED_ON                  AS created_at,
       jc.JM_UPDATED_ON                  AS updated_at,
       jc.JM_VERIFIED_ON                 AS verified_at,
       /* lifecycle / actor identity */
       jc.JM_MVP_STATUS                  AS status,
       jc.JM_CREATED_BY                  AS created_by_employee_id,
       jc.JM_VERIFIED_BY                 AS verified_by_employee_id,
       jc.JM_ASSIGNED_ENGINEER           AS assigned_engineer_employee_id,
       jc.JM_REOPENED_REASON             AS reopened_reason,
       jc.JM_PARENT_JR_NO                AS parent_jr_no,
       /* workflow */
       jc.JM_WORKFLOW_TYPE               AS workflow_type,
       jc.JM_REQUIRED_RESOURCES          AS required_resources,
       jc.JM_SPECIAL_INSTRUCTIONS        AS special_instructions,
       jc.JM_COMPLAINTANDSYMPTOMS        AS complaint_description,
       jc.JM_Remarks                     AS legacy_remarks,
       /* Phase-9 tab fields (snake_case columns ADDed by mig 300) */
       jc.plug_in_accessories,
       jc.equipment_submitted_date,    jc.submitted_by,
       jc.equipment_received_date_actual, jc.received_by,
       jc.instrument_received_date,    jc.job_complete_planned_date,
       jc.job_type                      AS phase9_job_type,
       jc.repair_type, jc.job_request_remarks,
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
       jc.completion_summary, jc.actual_completion_date, jc.total_hours_spent,
       jc.marked_complete_by_employee_id, jc.marked_complete_at,
       jc.reviewed_by, jc.review_date, jc.review_comments,
       jc.equipment_received_by_customer, jc.customer_received_date,
       jc.customer_acknowledged, jc.final_closure_notes,
       jc.verified_closed_by_employee_id, jc.verified_closed_at,
       jc.last_reopened_at, jc.last_reopened_by_employee_id, jc.reopen_count,
       /* equipment (joined from cmms_eqip_mst) */
       e.EQM_NAME                        AS equipment_name,
       e.EQM_MODELNO                     AS equipment_model_no,
       e.EQM_SRNO                        AS equipment_serial_no,
       e.EQM_MFG_MODEL_NAME              AS equipment_mfg_model_name,
       e.EQM_OPTIONNDESC                 AS equipment_option_desc,
       /* manufacturer (Make) */
       m.CMM_CONT_NAME                   AS equipment_make,
       /* assigned engineer name */
       emp_eng.EMM_NAME                  AS assigned_engineer_name,
       /* parent JR — pull every field the Certificate Section 3
          (User Submission & Forwarding) needs */
       jr.JR_JOBREQUESTNO                AS jr_no,
       jr.JR_JOBREQUESTDATE              AS jr_request_date,
       jr.JR_PRIORITY                    AS jr_priority_db,
       jr.JR_JOB_TYPE                    AS jr_job_type,
       jr.JR_JOB_CATEGORY                AS jr_job_category,
       jr.JR_AFTERREPAIRS                AS jr_after_repairs,
       jr.JR_REMARKS                     AS jr_remarks,
       jr.JR_COMPLAINTANDSYMPTOMS        AS jr_complaint_description,
       jr.JR_SUBMITTEDBYID               AS jr_submitter_employee_id,
       jr.JR_SUBMITTEDBYNAME             AS jr_submitter_name,
       jr.JR_DESIGNATION                 AS jr_submitter_designation,
       jr.Email                          AS jr_submitter_email,
       jr.JR_PHOENLAB                    AS jr_lab_phone,
       jr.JR_PHONEROOM                   AS jr_room_phone,
       jr.JR_SUBSYSTEM                   AS jr_subsystem,
       jr.JR_PROJECTID                   AS jr_project_name,
       jr.JR_APPROVED_BY                 AS jr_approved_by_employee_id,
       jr.JR_APPROVED_ON                 AS jr_approved_at,
       jr.JR_DIVISION                    AS division_id,
       sm.SM_SHORTNAME                   AS division_code,
       sm.SM_NAME                        AS division_name,
       sm.SM_HEAD_NAME                   AS division_head_name,
       /* actor names by FK chain */
       emp_mc.EMM_NAME                   AS marked_complete_by_name,
       emp_vc.EMM_NAME                   AS verified_closed_by_name,
       emp_ro.EMM_NAME                   AS last_reopened_by_name,
       emp_appr.EMM_NAME                 AS jr_approved_by_name
     FROM cmms_jobcard_mst jc
     LEFT JOIN cmms_eqip_mst       e        ON e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID
     LEFT JOIN cmms_cont_mst       m        ON m.CMM_CONT_ID = e.EQM_MFRID
     LEFT JOIN cmms_emp_mst        emp_eng  ON emp_eng.EMM_ID = jc.JM_ASSIGNED_ENGINEER
     LEFT JOIN cmms_jobrequest_mst jr       ON jr.JR_JOBREQUESTNO = jc.JM_PARENT_JR_NO
     LEFT JOIN cmms_section_mst    sm       ON sm.SM_ID = jr.JR_DIVISION
     LEFT JOIN cmms_emp_mst        emp_mc   ON emp_mc.EMM_ID = jc.marked_complete_by_employee_id
     LEFT JOIN cmms_emp_mst        emp_vc   ON emp_vc.EMM_ID = jc.verified_closed_by_employee_id
     LEFT JOIN cmms_emp_mst        emp_ro   ON emp_ro.EMM_ID = jc.last_reopened_by_employee_id
     LEFT JOIN cmms_emp_mst        emp_appr ON emp_appr.EMM_ID = jr.JR_APPROVED_BY
     WHERE jc.JM_SectionJobNo = ?
     LIMIT 1`,
    [sectionJobNo],
  );

  const main = rows[0];
  if (!main) return null;

  const isCalibration = main.work_type === 'CALIBRATION'
    || main.workflow_type === 'CALIBRATION_STANDARD'
    || main.workflow_type === 'CALIBRATION_PRECISION';

  const taskTable = isCalibration ? 'jc_calibration_task_checklist' : 'jc_task_checklist';
  const taskFields = isCalibration
    ? 'task_text, is_custom, is_completed, completed_at, completed_by_employee_id, order_index, task_type, task_result'
    : 'task_text, is_custom, is_completed, completed_at, completed_by_employee_id, order_index';

  // ── 2. Fire all child-table queries in PARALLEL ─────────────────────
  // 6 narrow indexed queries — all cheap. Even on a fully populated card
  // (multi-row maintenance + spares + readings) total wall-clock is one
  // round trip, not six.
  const [
    [maintenance],
    [spares],
    [tasks],
    [documents],
    [observations],
    [history],
    [parentAccessories],
  ] = await Promise.all([
    pool.query(
      `SELECT sr_no, defect_description, observation, action_taken, remarks,
              created_at, updated_at
         FROM jc_maintenance_details
        WHERE jc_section_no = ?
        ORDER BY sr_no ASC, id ASC`,
      [sectionJobNo],
    ),
    pool.query(
      `SELECT sr_no, spare_type, source, part_no, part_description,
              quantity, cost, created_at, updated_at
         FROM jc_spares_used
        WHERE jc_section_no = ?
        ORDER BY sr_no ASC, id ASC`,
      [sectionJobNo],
    ),
    pool.query(
      `SELECT ${taskFields}
         FROM \`${taskTable}\`
        WHERE jc_section_no = ?
        ORDER BY order_index ASC, id ASC`,
      [sectionJobNo],
    ),
    pool.query(
      `SELECT filename, mimetype, size_bytes, doc_type,
              uploaded_at, uploaded_by_employee_id
         FROM jc_documents
        WHERE jc_section_no = ? AND deleted_at IS NULL
        ORDER BY uploaded_at DESC, id DESC`,
      [sectionJobNo],
    ),
    pool.query(
      `SELECT parameter, value, unit, reading_type, notes,
              recorded_at, recorded_by_employee_id
         FROM jc_observations_readings
        WHERE jc_section_no = ?
        ORDER BY recorded_at ASC, id ASC`,
      [sectionJobNo],
    ),
    pool.query(
      `SELECT from_status, to_status, transitioned_at,
              transitioned_by, reason
         FROM job_card_status_history
        WHERE jc_section_no = ?
        ORDER BY transitioned_at ASC, history_id ASC`,
      [sectionJobNo],
    ),
    // Parent JR's accessories (used by the Certificate's accessory table).
    // Returns [] when JR_PARENT_JR_NO is NULL or no rows exist.
    main.parent_jr_no
      ? pool.query(
          `SELECT accessory_type AS type, accessory_name AS name,
                  serial_no, position
             FROM job_request_accessories
            WHERE jr_no = ?
            ORDER BY position ASC, acc_id ASC`,
          [main.parent_jr_no],
        )
      : Promise.resolve([[]]),
  ]);

  return {
    ...main,
    children: {
      maintenance,
      spares,
      tasks,
      documents,
      observations,
      history,
      parent_accessories: parentAccessories,
    },
  };
}


// ──────────────────────────────────────────────────────────────────────────
//  JOB REQUEST — full payload (master + children + joins)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Load EVERYTHING needed to render a Job Request PDF (#3). Mirrors the
 * shape returned by `jobRequests.repo.findByIdWithDetails` but adds
 * status history and explicit linked-JC summary so the renderer can show
 * the lifecycle timeline in one document.
 *
 * @param {number} jrNo  `JR_JOBREQUESTNO` (positive INT)
 * @returns {Promise<object|null>}
 */
async function loadJobRequestFull(jrNo) {
  // ── 1. Master row + joined lookups ──────────────────────────────────
  const [rows] = await pool.query(
    `SELECT
       /* identity */
       jr.JR_JOBREQUESTNO            AS jr_no,
       jr.JR_JOBREQUESTDATE          AS submitted_at_legacy,
       jr.JR_CREATED_AT              AS created_at,
       jr.JR_UPDATED_AT              AS updated_at,
       jr.JR_MVP_STATUS              AS status,
       jr.JR_MVP_STATUS_AT           AS status_at,
       /* classification */
       jr.JR_JOB_CATEGORY            AS job_category,
       jr.JR_JOB_TYPE                AS job_type,
       jr.JR_PRIORITY                AS priority_db,
       /* equipment snapshot */
       jr.JR_EQM_ID                  AS equipment_id,
       jr.JR_EQM_TYPE                AS equipment_type,
       jr.JR_EQM_NAME                AS equipment_name,
       jr.JR_EQM_MFR_NAME            AS make,
       jr.JR_EQM_MODELNO             AS model_no,
       jr.JR_EQM_SRNO                AS serial_no,
       jr.JR_EQM_OPTNDESC            AS options_description,
       jr.JR_AFTERREPAIRS            AS equipment_sent_after_repair,
       /* content */
       jr.JR_COMPLAINTANDSYMPTOMS    AS complaint_description,
       jr.JR_REMARKS                 AS remarks,
       jr.JR_PROJECTID               AS project_name,
       jr.JR_SUBSYSTEM               AS subsystem,
       jr.JR_PHOENLAB                AS lab_phone,
       jr.JR_PHONEROOM               AS room_phone,
       /* submitter snapshot */
       jr.JR_SUBMITTEDBYID           AS submitted_by_employee_id,
       jr.JR_SUBMITTEDBYNAME         AS submitted_by_name,
       jr.JR_DESIGNATION             AS submitted_by_designation,
       jr.Email                      AS submitted_by_email,
       /* T&C */
       jr.JR_TNC_ACCEPTED_AT         AS tnc_accepted_at,
       jr.JR_TNC_VERSION             AS tnc_version,
       /* division */
       jr.JR_DIVISION                AS division_id,
       sm.SM_SHORTNAME               AS division_code,
       sm.SM_NAME                    AS division_name,
       /* approval / rejection */
       jr.JR_APPROVED_BY             AS approved_by_employee_id,
       jr.JR_APPROVED_ON             AS approved_at,
       emp_app.EMM_NAME              AS approved_by_name,
       jr.JR_REJECTED_BY             AS rejected_by_employee_id,
       jr.JR_REJECTED_ON             AS rejected_at,
       emp_rej.EMM_NAME              AS rejected_by_name,
       jr.JR_REJECTION_REASON        AS rejection_reason,
       /* engineer */
       jr.JR_ASSIGNED_ENGINEER       AS assigned_engineer_employee_id,
       emp_eng.EMM_NAME              AS assigned_engineer_name,
       /* linked JC */
       jr.JR_SECTIONJOB_NO           AS linked_job_card_section_no,
       jc.JM_JobCardNO               AS linked_job_card_no,
       jc.JM_MVP_STATUS              AS linked_job_card_status,
       jc.JM_WORKFLOW_TYPE           AS linked_job_card_workflow_type,
       jc.JM_PlannedComletedDate     AS linked_job_card_target_end_date,
       jc.JM_CREATED_ON              AS linked_job_card_created_at
     FROM cmms_jobrequest_mst jr
     LEFT JOIN cmms_section_mst sm     ON sm.SM_ID  = jr.JR_DIVISION
     LEFT JOIN cmms_emp_mst   emp_app  ON emp_app.EMM_ID = jr.JR_APPROVED_BY
     LEFT JOIN cmms_emp_mst   emp_rej  ON emp_rej.EMM_ID = jr.JR_REJECTED_BY
     LEFT JOIN cmms_emp_mst   emp_eng  ON emp_eng.EMM_ID = jr.JR_ASSIGNED_ENGINEER
     LEFT JOIN cmms_jobcard_mst jc     ON jc.JM_SectionJobNo = jr.JR_SECTIONJOB_NO
     WHERE jr.JR_JOBREQUESTNO = ?
     LIMIT 1`,
    [jrNo],
  );

  const main = rows[0];
  if (!main) return null;

  // ── 2. Accessories + status history (parallel) ──────────────────────
  const [
    [accessories],
    [history],
  ] = await Promise.all([
    pool.query(
      `SELECT accessory_type AS type, accessory_name AS name,
              serial_no, position
         FROM job_request_accessories
        WHERE jr_no = ?
        ORDER BY position ASC, acc_id ASC`,
      [jrNo],
    ),
    pool.query(
      `SELECT from_status, to_status, transitioned_at,
              transitioned_by, reason
         FROM job_request_status_history
        WHERE jr_no = ?
        ORDER BY transitioned_at ASC, history_id ASC`,
      [jrNo],
    ),
  ]);

  return {
    ...main,
    children: {
      accessories,
      history,
    },
  };
}


module.exports = {
  loadJobCardFull,
  loadJobRequestFull,
};
