// ============================================================================
// src/modules/jobCards/jobCards.service.js  —  Business logic
// ----------------------------------------------------------------------------
// Phase 6 Slice 1 had `listJobCards` only. Phase 9 adds detail fetch +
// history + tab PATCH + 4 state transitions. Each transition path uses
// the state machine as the choke-point, opens its own transaction, and
// writes the audit + history rows in the same commit.
// ============================================================================

'use strict';

const dayjs = require('dayjs');
const pool = require('../../config/db');
const repo = require('./jobCards.repo');
const { formatJcCode, formatJrCode } = require('../../utils/jrCodeGenerator');
const { transition, LIC_SA_ROLES } = require('./jobCards.stateMachine');
const { errors } = require('../../middleware/errorHandler');
const kpiCache = require('../../utils/kpiCache');
const { KEYS: KPI_KEYS } = require('../../utils/kpiCache');

// Phase 7 Slice 2 priority canonicaliser (LOW/NORMAL/HIGH/URGENT → LOW/MEDIUM/HIGH).
const { toCanonicalPriority } = require('../jobRequests/jobRequests.repo');

// ── Helper: is the JC "legacy"? (D-9.14 read-only banner condition) ──
// Legacy = pre-Phase-9 row: no parent JR, no assigned engineer (Phase 7
// Slice 2 always sets this on MVP rows), and status=VERIFIED_CLOSED.
function isLegacyRow(jc) {
  return jc.parent_jr_no == null
      && jc.assigned_engineer_employee_id == null
      && jc.status === 'VERIFIED_CLOSED';
}

// ── Helper: is the actor the JC's own engineer? ──
function isOwnEngineer(jc, actor) {
  return !!jc.assigned_engineer_employee_id
      && jc.assigned_engineer_employee_id === actor.employeeId;
}

// ── Helper: full read-only view shape from a hydrated jc row ──
function shapeDetail(row) {
  // Helper to format ISO dates cleanly. Empty → null.
  const iso = (d) => (d ? dayjs(d).toISOString() : null);
  const ymd = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : null);
  return {
    id:              row.section_job_no,
    section_job_no:  row.section_job_no,
    card_code:       formatJcCode(row.jc_no, row.jc_recd_date || row.created_at),
    jc_no:           row.jc_no,
    status:          row.status,
    /* parent JR */
    parent_jr_no:    row.parent_jr_no,
    parent_jr_code:  row.parent_jr_no ? formatJrCode(row.parent_jr_no, row.jr_date) : null,
    /* equipment */
    equipment: {
      type:   row.equipment_type,
      id:     row.equipment_id,
      name:   row.equipment_name,
      model_no: row.equipment_model_no,
      serial_no: row.equipment_serial_no,
    },
    /* division */
    division: {
      id:    row.division_id,
      code:  row.division_code,
      name:  row.division_name,
    },
    /* priority (from parent JR) */
    priority: row.jr_priority_db ? toCanonicalPriority(row.jr_priority_db) : null,
    /* engineer */
    assigned_engineer: row.assigned_engineer_employee_id ? {
      employee_id: row.assigned_engineer_employee_id,
      name:        row.assigned_engineer_name,
    } : null,
    /* workflow + instructions (Phase 7 Slice 2 cols) */
    workflow_type:        row.workflow_type,
    required_resources:   row.required_resources,
    special_instructions: row.special_instructions,
    complaint_description: row.complaint_description,
    /* dates */
    jc_recd_date:           ymd(row.jc_recd_date),
    inst_recd_date:         ymd(row.inst_recd_date),
    planned_start_date:     ymd(row.planned_start_date),
    planned_completed_date: ymd(row.planned_completed_date),
    job_start_date:         iso(row.job_start_date),
    job_end_date:           iso(row.job_end_date),
    created_at:             iso(row.created_at),
    updated_at:             iso(row.updated_at),
    /* Phase 9 — all 53 columns as canonical snake_case */
    plug_in_accessories:           row.plug_in_accessories,
    equipment_submitted_date:      iso(row.equipment_submitted_date),
    submitted_by:                  row.submitted_by,
    equipment_received_date_actual: iso(row.equipment_received_date_actual),
    received_by:                   row.received_by,
    instrument_received_date:      ymd(row.instrument_received_date),
    job_complete_planned_date:     ymd(row.job_complete_planned_date),
    job_type:                      row.phase9_job_type,          // disambiguated alias
    repair_type:                   row.repair_type,
    job_request_remarks:           row.job_request_remarks,
    equipments_used:               row.equipments_used,
    awaiting_for:                  row.awaiting_for,
    awaiting_status:               row.awaiting_status,
    supplier_name:                 row.supplier_name,
    awaiting_from_date:            ymd(row.awaiting_from_date),
    awaiting_clear_date:           ymd(row.awaiting_clear_date),
    attended_by:                   row.attended_by,
    indent_no:                     row.indent_no,
    indent_date:                   ymd(row.indent_date),
    mirv_no:                       row.mirv_no,
    mirv_date:                     ymd(row.mirv_date),
    po_no:                         row.po_no,
    po_date:                       ymd(row.po_date),
    procurement_cost:              row.procurement_cost == null ? null : Number(row.procurement_cost),
    vendor_supplier_name:          row.vendor_supplier_name,
    intimation_sent_on:            ymd(row.intimation_sent_on),
    sent_to_vendor_date:           ymd(row.sent_to_vendor_date),
    received_from_vendor_date:     ymd(row.received_from_vendor_date),
    gate_pass_no:                  row.gate_pass_no,
    gate_pass_issued_date:         ymd(row.gate_pass_issued_date),
    cost_of_component:             row.cost_of_component == null ? null : Number(row.cost_of_component),
    labour_charges:                row.labour_charges == null ? null : Number(row.labour_charges),
    invoice_no:                    row.invoice_no,
    invoice_recd_on:               ymd(row.invoice_recd_on),
    observations_text:             row.observations_text,
    job_status_display:            row.job_status_display,
    /* completion */
    completion_summary:            row.completion_summary,
    actual_completion_date:        ymd(row.actual_completion_date),
    total_hours_spent:             row.total_hours_spent == null ? null : Number(row.total_hours_spent),
    marked_complete_by: row.marked_complete_by_employee_id ? {
      employee_id: row.marked_complete_by_employee_id,
      name:        row.marked_complete_by_name,
    } : null,
    marked_complete_at:            iso(row.marked_complete_at),
    /* closure */
    reviewed_by:                   row.reviewed_by,
    review_date:                   ymd(row.review_date),
    review_comments:               row.review_comments,
    equipment_received_by_customer: row.equipment_received_by_customer,
    customer_received_date:        ymd(row.customer_received_date),
    customer_acknowledged:         !!row.customer_acknowledged,
    final_closure_notes:           row.final_closure_notes,
    verified_closed_by: row.verified_closed_by_employee_id ? {
      employee_id: row.verified_closed_by_employee_id,
      name:        row.verified_closed_by_name,
    } : null,
    verified_closed_at:            iso(row.verified_closed_at),
    /* reopen */
    last_reopened_at:              iso(row.last_reopened_at),
    last_reopened_by: row.last_reopened_by_employee_id ? {
      employee_id: row.last_reopened_by_employee_id,
      name:        row.last_reopened_by_name,
    } : null,
    reopen_count:                  Number(row.reopen_count || 0),
    /* flags for the FE — derived */
    _flags: {
      is_legacy:       isLegacyRow(row),
    },
  };
}

// ────────────────────────────────────────────────────────────────────
//  LIST  (Phase 6 — unchanged behaviour)
// ────────────────────────────────────────────────────────────────────
async function listJobCards(params /* scope ignored: Phase 6 had no row-level filter */) {
  const { rows, total } = await repo.listJobCards(params);

  const items = rows.map((r) => ({
    id:                     r.jc_no,
    section_job_no:         r.section_job_no || null,
    card_code:              formatJcCode(r.jc_no, r.recd_date || r.created_at),
    job_request_id:         r.jr_no || null,
    job_request_code:       r.jr_no ? formatJrCode(r.jr_no, r.jr_date) : null,
    equipment_id:           r.equipment_id ? `${r.equipment_type}-${r.equipment_id}` : null,
    equipment_name:         r.equipment_name || null,
    assigned_engineer_id:   r.engineer_employee_id || null,
    assigned_engineer_name: r.engineer_name || null,
    status:                 r.status,
    start_date:             r.start_date  ? dayjs(r.start_date).format('YYYY-MM-DD') : null,
    due_date:               r.due_date    ? dayjs(r.due_date).format('YYYY-MM-DD')   : null,
    completed_at:           r.completed_at? dayjs(r.completed_at).format('YYYY-MM-DD'): null,
  }));

  const totalPages = Math.max(1, Math.ceil(total / params.page_size));

  return {
    items,
    pagination: {
      page: params.page,
      page_size: params.page_size,
      total_items: total,
      total_pages: totalPages,
    },
    applied_filters: {
      q: params.q || null,
      status: params.status || null,
      assigned_engineer_id: params.assigned_engineer_id || null,
      date_from: params.date_from || null,
      date_to: params.date_to || null,
      sort: params.sort,
    },
  };
}

// ============================================================================
//                          PHASE 9  ·  DETAIL + HISTORY
// ============================================================================

/**
 * GET /api/v1/job-cards/:id  (sectionJobNo, e.g. "J00024215")
 *
 * Gate: caller has job_card:read-detail. No ownership check for read —
 * View-Only / off-assignment engineers can READ any JC, just can't write.
 *
 * @returns full shaped detail payload (~100 fields)
 */
async function getJobCardDetail({ sectionJobNo }) {
  if (!sectionJobNo) {
    throw errors.badRequest('Invalid job card id', { field: 'id' });
  }
  const row = await repo.findByIdWithDetails(sectionJobNo);
  if (!row) throw errors.notFound(`Job card ${sectionJobNo} not found`);
  return shapeDetail(row);
}

/**
 * GET /api/v1/job-cards/:id/history
 * Chronological state-machine log for the Timeline component.
 */
async function getJobCardHistory({ sectionJobNo }) {
  if (!sectionJobNo) {
    throw errors.badRequest('Invalid job card id', { field: 'id' });
  }
  const rows = await repo.findStatusHistory(sectionJobNo);
  return rows.map((r) => ({
    from_status:     r.from_status,
    to_status:       r.to_status,
    transitioned_at: r.transitioned_at ? dayjs(r.transitioned_at).toISOString() : null,
    transitioned_by: {
      employee_id: r.transitioned_by_employee_id,
      name:        r.transitioned_by_name,
    },
    reason: r.reason,
  }));
}

// ============================================================================
//                          PHASE 9  ·  TAB PATCH (save data, no transition)
// ============================================================================

/**
 * PATCH /api/v1/job-cards/:id
 *
 * Save the dirty fields from one tab. State stays IN_PROGRESS — the
 * state machine 'save' transition validates the perm + ownership but
 * doesn't change state. NO audit row (audit pairing rule has carve-out:
 * pure saves are too noisy; only true state transitions get audit).
 *
 * Returns the count of columns updated so the FE can render
 * "Saved (n fields)" toast.
 */
async function patchJobCardTab({ sectionJobNo, body, actor }) {
  if (!sectionJobNo) throw errors.badRequest('Invalid job card id', { field: 'id' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const jc = await repo.findForMutation(conn, sectionJobNo);
    if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);

    // D-9.14: legacy JCs are read-only.
    if (isLegacyRow(jc)) {
      throw errors.conflict('Legacy job cards are read-only and cannot be edited.');
    }

    // State machine — 'save' requires IN_PROGRESS (or ASSIGNED if engineer
    // is filling forms before start-work; we allow that too).
    // Note the table only declares save for IN_PROGRESS. If the engineer
    // tries to save while ASSIGNED, they'll get 409 — they should call
    // start-work first. We surface a clearer message here.
    if (jc.status === 'ASSIGNED') {
      throw errors.conflict('Cannot save tab data — call start-work first to move the card to IN_PROGRESS.');
    }
    if (jc.status !== 'IN_PROGRESS') {
      // COMPLETED / VERIFIED_CLOSED are read-only without a reopen first.
      throw errors.conflict(`Cannot save: job card is in ${jc.status} state. Reopen it first.`);
    }

    transition(jc.status, 'save', actor, {
      isOwnEngineer: isOwnEngineer(jc, actor),
    });

    const updated = await repo.patchTab(conn, sectionJobNo, {
      ...body,
      _updated_by_employee_id: actor.employeeId,
    });

    await conn.commit();
    return { id: sectionJobNo, updated_columns: updated };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

// ============================================================================
//                          PHASE 9  ·  START WORK
// ============================================================================

async function startWorkJobCard({ sectionJobNo, actor, ipAddress, userAgent }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const jc = await repo.findForMutation(conn, sectionJobNo);
    if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);
    if (isLegacyRow(jc)) throw errors.conflict('Legacy job cards are read-only.');

    const { newState } = transition(jc.status, 'start-work', actor, {
      isOwnEngineer: isOwnEngineer(jc, actor),
    });

    await repo.setStatusStartWork(conn, sectionJobNo, { actorEmployeeId: actor.employeeId });
    await repo.appendStatusHistory(conn, sectionJobNo, jc.status, newState, actor.employeeId);
    await repo.writePhase9AuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          'JC_START_WORK',
      sectionJobNo,
      ipAddress,
      userAgent,
      details: { from: jc.status, to: newState },
    });

    await conn.commit();

    kpiCache.invalidate(KPI_KEYS.ORG);
    // Engineer's "Assigned to me" count drops; "In progress" count rises.

    return { id: sectionJobNo, status: newState };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

// ============================================================================
//                          PHASE 9  ·  MARK COMPLETE  (with 4 pre-completion gates)
// ============================================================================

async function markCompleteJobCard({ sectionJobNo, body, actor, ipAddress, userAgent }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const jc = await repo.findForMutation(conn, sectionJobNo);
    if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);
    if (isLegacyRow(jc)) throw errors.conflict('Legacy job cards are read-only.');

    // State machine — also enforces 'complete' permission + own/LIC/SA.
    const { newState } = transition(jc.status, 'mark-complete', actor, {
      isOwnEngineer: isOwnEngineer(jc, actor),
    });

    // 4 pre-completion gates (D-9.4). Compute from DB inside the txn so a
    // concurrent task-completion / doc-upload doesn't open a TOCTOU race.
    const g = await repo.gatherCompletionGates(conn, sectionJobNo);
    const failed = [];
    // Gate 1: all tasks completed (or no tasks at all).
    if (g.tasks_total > 0 && g.tasks_pending > 0) {
      failed.push({ gate: 'tasks', message: `${g.tasks_pending} of ${g.tasks_total} tasks still pending` });
    }
    // Gate 2: observations recorded (≥1 row OR text ≥20 chars).
    if (g.observations_count === 0 && g.observations_text_length < 20) {
      failed.push({ gate: 'observations', message: 'Record at least one observation row OR write ≥20 chars in the observations textarea' });
    }
    // Gate 3: cal-cert generated (only for calibration workflows).
    const isCalibration = (jc.workflow_type === 'CALIBRATION_STANDARD'
                       || jc.workflow_type === 'CALIBRATION_PRECISION');
    if (isCalibration && g.cal_cert_count === 0) {
      failed.push({ gate: 'cal_cert', message: 'Calibration certificate must be uploaded with doc_type=CALIBRATION_CERT' });
    }
    // Gate 4: at least one required-tier doc.
    if (g.required_doc_count === 0) {
      failed.push({ gate: 'required_doc', message: 'At least one required document must be uploaded' });
    }

    if (failed.length > 0) {
      const e = errors.badRequest('Cannot mark complete — pre-completion gates failed', { gates: failed });
      e.code = 'PRECOMPLETION_GATES_FAILED';
      throw e;
    }

    await repo.setStatusMarkComplete(conn, sectionJobNo, {
      actorEmployeeId: actor.employeeId,
      summary:         body.completion_summary,
      actualDate:      body.actual_completion_date,
      totalHours:      body.total_hours_spent,
    });
    await repo.appendStatusHistory(conn, sectionJobNo, jc.status, newState, actor.employeeId);
    await repo.writePhase9AuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          'JC_MARK_COMPLETE',
      sectionJobNo,
      ipAddress,
      userAgent,
      details: {
        from: jc.status, to: newState,
        actual_completion_date: body.actual_completion_date,
        total_hours_spent: body.total_hours_spent,
      },
    });

    await conn.commit();
    kpiCache.invalidate(KPI_KEYS.ORG);
    return { id: sectionJobNo, status: newState };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

// ============================================================================
//                          PHASE 9  ·  VERIFY-CLOSE  (LIC/SA only)
// ============================================================================

async function verifyCloseJobCard({ sectionJobNo, body, actor, ipAddress, userAgent }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const jc = await repo.findForMutation(conn, sectionJobNo);
    if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);
    if (isLegacyRow(jc)) throw errors.conflict('Legacy job cards are read-only.');

    const { newState } = transition(jc.status, 'verify-close', actor, {});

    await repo.setStatusVerifyClose(conn, sectionJobNo, {
      actorEmployeeId: actor.employeeId,
      closureFields:   body,
    });
    await repo.appendStatusHistory(conn, sectionJobNo, jc.status, newState, actor.employeeId);
    await repo.writePhase9AuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          'JC_VERIFY_CLOSE',
      sectionJobNo,
      ipAddress,
      userAgent,
      details: {
        from: jc.status, to: newState,
        reviewed_by: body.reviewed_by,
        customer_received_date: body.customer_received_date,
      },
    });

    // D-9.5: side-effect — stub the equipment.last_cal_date update.
    // The actual UPDATE on cmms_eqip_mst is a Phase 11 concern (the
    // equipment master is touched by the calibration certificate
    // generation flow), but for Phase 9 we log the intent so the future
    // hook has a clear handoff point. The hook itself goes here:
    //
    //   await equipmentRepo.bumpLastCalDate(conn, jc.equipment_type, jc.equipment_id, today);
    //
    // For now: log a Phase11-stub line.
    // eslint-disable-next-line no-console
    console.log(`[Phase11-stub] equipment.last_cal_date should be bumped for ${jc.equipment_type}-${jc.equipment_id} on verify-close of ${sectionJobNo}`);

    await conn.commit();
    kpiCache.invalidate(KPI_KEYS.ORG);
    return { id: sectionJobNo, status: newState };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

// ============================================================================
//                          PHASE 9  ·  REOPEN  (LIC/SA only)
// ============================================================================

async function reopenJobCard({ sectionJobNo, body, actor, ipAddress, userAgent }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const jc = await repo.findForMutation(conn, sectionJobNo);
    if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);
    if (isLegacyRow(jc)) throw errors.conflict('Legacy job cards are read-only.');

    const { newState } = transition(jc.status, 'reopen', actor, {
      reason: body.reason,
    });

    await repo.setStatusReopen(conn, sectionJobNo, {
      actorEmployeeId:      actor.employeeId,
      reason:               body.reason,
      fromVerifiedClosed:   jc.status === 'VERIFIED_CLOSED',
    });
    await repo.appendStatusHistory(conn, sectionJobNo, jc.status, newState, actor.employeeId, body.reason);
    await repo.writePhase9AuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          'JC_REOPEN',
      sectionJobNo,
      ipAddress,
      userAgent,
      details: {
        from: jc.status, to: newState,
        from_verified_closed: jc.status === 'VERIFIED_CLOSED',
        reopen_count_before: jc.reopen_count,
        reason: String(body.reason).slice(0, 200),
      },
    });

    await conn.commit();
    kpiCache.invalidate(KPI_KEYS.ORG);
    return { id: sectionJobNo, status: newState, reopen_count: Number(jc.reopen_count || 0) + 1 };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  listJobCards,
  // Phase 9:
  getJobCardDetail,
  getJobCardHistory,
  patchJobCardTab,
  startWorkJobCard,
  markCompleteJobCard,
  verifyCloseJobCard,
  reopenJobCard,
  // Helpers exported for sub-modules (taskChecklist + documents):
  isLegacyRow,
  isOwnEngineer,
  LIC_SA_ROLES,
};
