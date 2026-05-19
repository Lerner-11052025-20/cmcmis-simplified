// ============================================================================
// src/modules/jobRequests/jobRequests.service.js  —  Business logic
// ----------------------------------------------------------------------------
// Service functions:
//   listJobRequests(params, scope)               — pagination + filter + sort
//   createJobRequest({ body, actor, ip, ua })    — transactional insert
//                                                  (with optional submit-now)
//   submitJobRequest({ jrNo, body, actor, ... }) — DRAFT → SUBMITTED txn
//
// SECURITY
//   • BR-JR-06: submitted_by_* fields are taken from req.user ONLY.
//   • BR-RBAC-03: all permission checks go through `transition()`.
//   • Every write happens inside a transaction with audit_log + state
//     history rows appended in the same commit (single choke-point).
// ============================================================================

'use strict';

const dayjs = require('dayjs');
const pool = require('../../config/db');
const repo = require('./jobRequests.repo');
const usersRepo = require('../users/users.repo');
const { transition } = require('./jobRequests.stateMachine');
const { errors } = require('../../middleware/errorHandler');
const { formatJrCode } = require('../../utils/jrCodeGenerator');
// Phase 8: bust the dashboard KPI cache after JR mutations.
const kpiCache = require('../../utils/kpiCache');
const { KEYS: KPI_KEYS } = require('../../utils/kpiCache');

// Phase 7 Slice 2 — cross-module dependencies for the Convert path.
const jcRepo = require('../jobCards/jobCards.repo');
const lookupsRepo = require('../lookups/lookups.repo');
const { WORKFLOW_BUCKET } = require('./jobRequests.validators');

// ────────────────────────────────────────────────────────────────────
//  LIST
// ────────────────────────────────────────────────────────────────────
async function listJobRequests(params, scope) {
  const { rows, total } = await repo.listJobRequests(params, scope);

  const items = rows.map((r) => ({
    id:                  r.jr_no,
    request_code:        formatJrCode(r.jr_no, r.submitted_at_legacy || r.created_at),
    // Phase 7 Slice 2: surface equipment_id so the FE can disable the
    // Convert action when the JR has no equipment selected (JM_EQM_ID
    // is NOT NULL on the legacy JC schema, so Convert would otherwise
    // throw EQUIPMENT_REQUIRED from the service).
    equipment_id:        r.equipment_id,
    equipment_type:      r.equipment_type,
    equipment_name:      r.equipment_name,
    job_type:            r.job_type,
    division_id:         r.division_id,
    division_code:       r.division_code,
    submitted_by_name:   r.submitted_by_name,
    submitted_by_employee_id: r.submitted_by_employee_id,
    submitted_at:        r.submitted_at
      ? dayjs(r.submitted_at).format('YYYY-MM-DD')
      : null,
    created_at:          r.created_at
      ? dayjs(r.created_at).format('YYYY-MM-DD')
      : null,
    priority:            r.priority,
    status:              r.status,
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
      type: params.type || null,
      status: params.status || null,
      priority: params.priority || null,
      division_id: params.division_id || null,
      date_from: params.date_from || null,
      date_to: params.date_to || null,
      sort: params.sort,
    },
  };
}

// ────────────────────────────────────────────────────────────────────
//  CREATE  (Save-as-Draft OR Submit-now)
// ────────────────────────────────────────────────────────────────────
/**
 * @param {Object} args
 * @param {Object} args.body   Validated createSchema output
 * @param {Object} args.actor  { employeeId, role, permissions[], userId }
 * @param {string} args.ipAddress
 * @param {string} args.userAgent
 * @returns { id, request_code, status }
 */
async function createJobRequest({ body, actor, ipAddress, userAgent }) {
  // ── BR-JR-06: server-side identity snapshot (NEVER trust the body) ──
  // We need the requester's name + designation + email for the
  // denormalised snapshot columns. Pull from cmms_emp_mst keyed on
  // employee_id. If the row is missing, fall back to JWT claims and a
  // blank designation — the request still saves.
  const profile = await usersRepo.findEmployeeProfile(actor.employeeId)
    .catch(() => null);
  const submittedBy = {
    submitted_by_employee_id: actor.employeeId,
    submitted_by_name:        profile?.display_name || actor.employeeId,
    submitted_by_designation: profile?.designation  || '',
    submitted_by_email:       profile?.email        || '',
  };

  const wantsSubmit = body.submit_now === true;

  // Cross-field guard (defence in depth — zod already enforces this).
  if (wantsSubmit && body.tnc_accepted !== true) {
    throw errors.badRequest('All terms and conditions must be accepted before submitting',
      { field: 'tnc_accepted' });
  }

  // ── Transaction ─────────────────────────────────────────────────
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // FOR UPDATE-locked sequence — see SCHEMA_PHASE6.md decision P6-D3.
    const jrNo = await repo.nextJrNo(conn);

    const insertPayload = {
      jr_no: jrNo,
      ...submittedBy,
      job_category:         body.job_category,
      job_type:             body.job_type,
      equipment_id:         body.equipment_id ?? null,
      equipment_name:       body.equipment_name,
      make:                 body.make || null,
      model_no:             body.model_no || null,
      serial_no:            body.serial_no || null,
      equipment_type:       body.equipment_type || null,
      options_description:  body.options_description || null,
      lab_phone:            body.lab_phone || null,
      room_phone:           body.room_phone || null,
      division_id:          body.division_id,
      subsystem:            body.subsystem || null,
      project_name:         body.project_name || null,
      complaint_description:body.complaint_description,
      remarks:              body.remarks || null,
      equipment_sent_after_repair: body.equipment_sent_after_repair === true,
      priority:             body.priority || 'MEDIUM',
      status:               wantsSubmit ? 'SUBMITTED' : 'DRAFT',
      tnc_accepted_at:      wantsSubmit ? new Date() : null,
      tnc_version:          wantsSubmit ? (body.tnc_version || 'v1') : null,
    };

    await repo.insertJobRequest(conn, insertPayload);

    // Accessory rows (always — empty array → no INSERT).
    if (body.accessories && body.accessories.length > 0) {
      await repo.replaceAccessories(conn, jrNo, body.accessories);
    }

    // Status-history row(s) + audit log
    if (wantsSubmit) {
      // Two transitions in one stroke: NULL → DRAFT, DRAFT → SUBMITTED.
      // History captures both for traceability.
      await repo.appendStatusHistory(conn, jrNo, null,    'DRAFT',     actor.employeeId, 'Created and submitted');
      await repo.appendStatusHistory(conn, jrNo, 'DRAFT', 'SUBMITTED', actor.employeeId, null);
    } else {
      await repo.appendStatusHistory(conn, jrNo, null, 'DRAFT', actor.employeeId, 'Saved as draft');
    }

    await repo.writeAuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          wantsSubmit ? 'JR_CREATE_SUBMIT' : 'JR_CREATE_DRAFT',
      jrNo,
      ipAddress,
      userAgent,
      details: {
        job_category: body.job_category,
        job_type:     body.job_type,
        equipment_name: body.equipment_name,
        priority:     body.priority || 'MEDIUM',
        accessories_count: (body.accessories || []).length,
        tnc_accepted: wantsSubmit && body.tnc_accepted === true,
      },
    });

    await conn.commit();

    // Phase 8: KPI cache invalidation (P8-D15). The org snapshot and
    // this submitter's personal snapshot are both affected by a new JR.
    // TTL is the safety net; this is the fast-path.
    kpiCache.invalidate(KPI_KEYS.ORG);
    kpiCache.invalidate(KPI_KEYS.personal(actor.employeeId));

    return {
      id:           jrNo,
      request_code: formatJrCode(jrNo, new Date()),
      status:       wantsSubmit ? 'SUBMITTED' : 'DRAFT',
    };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore secondary fault */ }
    throw err;
  } finally {
    conn.release();
  }
}

// ────────────────────────────────────────────────────────────────────
//  SUBMIT  (DRAFT → SUBMITTED on an existing row)
// ────────────────────────────────────────────────────────────────────
async function submitJobRequest({ jrNo, body, actor, ipAddress, userAgent }) {
  // 1) Load — fail-fast 404 if unknown.
  const jr = await repo.findJrById(jrNo);
  if (!jr) throw errors.notFound(`Job request ${jrNo} not found`);

  // 2) Ownership — only the submitter (or LIC/SA via approve, future
  //    slice) can transition DRAFT → SUBMITTED.
  const isOwner = jr.submitted_by_employee_id === actor.employeeId;

  // 3) State machine — single choke-point. Throws 409 on illegal,
  //    403 on missing permission or ownership.
  const { newState } = transition(jr.status, 'submit', actor, { isOwner });

  // 4) Re-validate that required fields are non-blank server-side.
  //    A user could have saved a draft with empty complaint and then
  //    poked /submit via curl. Defence in depth.
  if (!jr.complaint_description || jr.complaint_description.length < 10) {
    throw errors.badRequest('Cannot submit: complaint description is required',
      { field: 'complaint_description' });
  }

  // 5) Transaction: update status + write state history + write audit.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await repo.transitionStatus(conn, jrNo, newState, {
      tnc_accepted_at: new Date(),
      tnc_version: body.tnc_version || 'v1',
    });

    await repo.appendStatusHistory(conn, jrNo, jr.status, newState, actor.employeeId, null);

    await repo.writeAuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          'JR_SUBMIT',
      jrNo,
      ipAddress,
      userAgent,
      details: { from: jr.status, to: newState, tnc_version: body.tnc_version || 'v1' },
    });

    await conn.commit();

    // Phase 8: KPI cache invalidation — submit moves DRAFT→SUBMITTED, so
    // "Pending Jobs" + "Active Requests" + "Pending Approval" all shift.
    kpiCache.invalidate(KPI_KEYS.ORG);
    kpiCache.invalidate(KPI_KEYS.personal(jr.submitted_by_employee_id || actor.employeeId));

    return { id: jrNo, request_code: formatJrCode(jrNo, jr.created_at), status: newState };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

// ============================================================================
//                          PHASE 9  ·  EDIT DRAFT + CANCEL DRAFT
// ============================================================================
//  Closes the two Job Request loose ends listed in the Phase 9 prompt §0
//  audit. Both flows are owner-only (the submitter who created the DRAFT
//  can edit/cancel it). Once a JR is SUBMITTED it becomes immutable —
//  edits after that are forbidden, matching FINAL-DESC §8.1.
// ============================================================================

/**
 * PATCH /api/v1/job-requests/:id
 *
 * Owner-only edit of a DRAFT row. The body has the same shape as the
 * draft branch of createSchema (loose validation — partial saves OK).
 *
 * State-machine: invokes 'edit' which keeps the row in DRAFT. This is
 * the choke-point for the permission + ownership checks; the actual
 * column updates happen in repo.updateDraftFields.
 *
 * On commit:
 *   - audit_log row (action=JR_EDIT_DRAFT)
 *   - NO state-history row (no state change)
 *   - kpiCache untouched (counts unchanged)
 *
 * @param {Object} args
 * @param {number} args.jrNo
 * @param {Object} args.body
 * @param {Object} args.actor
 */
async function editDraftJobRequest({ jrNo, body, actor, ipAddress, userAgent }) {
  const jr = await repo.findJrById(jrNo);
  if (!jr) throw errors.notFound(`Job request ${jrNo} not found`);

  // Ownership: only the original submitter can edit their own DRAFT.
  // LIC/SA cannot edit someone else's DRAFT (they have approve/reject paths instead).
  const isOwner = jr.submitted_by_employee_id === actor.employeeId;

  // State-machine choke-point. For 'edit' we use actorMustBeOwner=true
  // so only the submitter passes. If the JR is not in DRAFT, the
  // transition table has no entry → 409 ILLEGAL_TRANSITION.
  transition(jr.status, 'edit', actor, { isOwner });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Forward the body to the repo updater which honours only the
    // editable fields (BR-JR-06: submitted_by_* never accepted via body).
    await repo.updateDraftFields(conn, jrNo, body);

    await repo.writeAuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          'JR_EDIT_DRAFT',
      jrNo,
      ipAddress,
      userAgent,
      details: {
        // Don't echo back the whole body — could be 4 KB. Just keep the
        // most-changed fields visible in audit notes.
        equipment_name:        body.equipment_name,
        job_type:              body.job_type,
        priority:              body.priority,
        complaint_description: body.complaint_description,
      },
    });

    await conn.commit();
    return { id: jrNo, request_code: formatJrCode(jrNo, jr.created_at), status: 'DRAFT' };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * POST /api/v1/job-requests/:id/cancel
 *
 * Owner-only cancel of a DRAFT (decision D-9.11 logical-CANCELLED).
 * Writes JR_CANCELLED_AT + JR_CANCELLED_BY + JR_CANCEL_REASON. The
 * JR_MVP_STATUS column stays 'DRAFT' on the wire (no enum modify), but
 * the list endpoint hides cancelled rows unless ?include_cancelled=true.
 *
 * Audit + status_history (with to_status='CANCELLED' as a varchar).
 *
 * @param {Object} args
 * @param {number} args.jrNo
 * @param {{ reason?: string }} args.body
 * @param {Object} args.actor
 */
async function cancelDraftJobRequest({ jrNo, body, actor, ipAddress, userAgent }) {
  const jr = await repo.findJrById(jrNo);
  if (!jr) throw errors.notFound(`Job request ${jrNo} not found`);

  const isOwner = jr.submitted_by_employee_id === actor.employeeId;

  // State-machine — accepts only DRAFT → CANCELLED. If the JR is already
  // SUBMITTED, the cancel transition is missing from the table → 409.
  // If a Normal user tries to cancel someone else's DRAFT, isOwner=false
  // → 403.
  transition(jr.status, 'cancel', actor, { isOwner });

  const reason = (body && typeof body.reason === 'string') ? body.reason.trim() : null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await repo.applyDraftCancel(conn, jrNo, {
      cancelledByEmployeeId: actor.employeeId,
      reason: reason && reason.length > 0 ? reason : null,
    });

    // Use 'CANCELLED' as the to_status string in the history row even
    // though the JR_MVP_STATUS column doesn't contain that value — the
    // varchar(30) column accepts it. This is how we preserve the full
    // logical lifecycle in the audit trail.
    await repo.appendStatusHistory(conn, jrNo, jr.status, 'CANCELLED', actor.employeeId, reason);

    await repo.writeAuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          'JR_CANCEL',
      jrNo,
      ipAddress,
      userAgent,
      details: {
        from:   jr.status,
        to:     'CANCELLED',
        reason: reason ? reason.slice(0, 200) : null,
      },
    });

    await conn.commit();

    // KPI cache: cancelling removes the JR from "Pending Jobs" etc. counts.
    kpiCache.invalidate(KPI_KEYS.ORG);
    kpiCache.invalidate(KPI_KEYS.personal(jr.submitted_by_employee_id || actor.employeeId));

    return {
      id:           jrNo,
      request_code: formatJrCode(jrNo, jr.created_at),
      status:       'CANCELLED',          // logical — the wire shape says CANCELLED even though DB enum is DRAFT
      cancelled_at: new Date().toISOString(),
    };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

// ============================================================================
//                          PHASE 7 SLICE 2  ·  DETAIL + HISTORY
// ============================================================================

/**
 * GET /api/v1/job-requests/:id
 *
 * Returns a fully-hydrated JR row + accessories + linked Job Card summary.
 * Row-level scope is enforced INSIDE the repo (which embeds the
 * submitter-id predicate into the WHERE clause) — that pattern means a
 * foreign-id probe by a Normal user returns null → controller maps to
 * 404 (no leak of "row exists but you cannot see it"). The service layer
 * adds a defence-in-depth re-check below so the security guarantee
 * survives even if a future refactor of the repo drops the predicate.
 *
 * @param {Object} args
 * @param {number} args.jrNo
 * @param {{ canReadAll: boolean, ownerEmployeeId: string }} args.scope
 * @param {Object} args.actor
 * @returns formatted JR detail
 */
async function getJobRequestDetail({ jrNo, scope, actor }) {
  if (!Number.isFinite(jrNo) || jrNo <= 0) {
    throw errors.badRequest('Invalid job request id', { field: 'id' });
  }
  const row = await repo.findByIdWithDetails(jrNo);
  if (!row) throw errors.notFound(`Job request ${jrNo} not found`);

  // PHASE 7 SLICE 2 RBAC scope (§4 of the locked spec):
  //   A Normal user querying a JR they did NOT submit must get
  //   **403 FORBIDDEN, not 404**. DS chose auditability over
  //   existence-hiding — see SCHEMA_PHASE7_SLICE2.md.
  if (!scope.canReadAll && row.submitted_by_employee_id !== scope.ownerEmployeeId) {
    throw errors.forbidden('Cannot view another user\'s job request');
  }

  // Shape the payload for the FE. Keep all canonical names; format dates
  // as ISO strings so the JSON wire format is timezone-agnostic.
  return {
    id:                      row.jr_no,
    request_code:            formatJrCode(row.jr_no, row.submitted_at_legacy || row.created_at),
    status:                  row.status,
    job_category:            row.job_category,
    job_type:                row.job_type,
    priority:                row.priority,
    /* dates */
    created_at:              row.created_at  ? dayjs(row.created_at).toISOString()  : null,
    updated_at:              row.updated_at  ? dayjs(row.updated_at).toISOString()  : null,
    submitted_at:            row.status_at && row.status !== 'DRAFT'
                              ? dayjs(row.status_at).toISOString() : null,
    status_at:               row.status_at   ? dayjs(row.status_at).toISOString()   : null,
    approved_at:             row.approved_at ? dayjs(row.approved_at).toISOString() : null,
    rejected_at:             row.rejected_at ? dayjs(row.rejected_at).toISOString() : null,
    /* equipment */
    equipment: {
      id:                   row.equipment_id,
      type:                 row.equipment_type,
      name:                 row.equipment_name,
      make:                 row.make,
      model_no:             row.model_no,
      serial_no:            row.serial_no,
      options_description:  row.options_description,
      sent_after_repair:    row.equipment_sent_after_repair === 1
                              || row.equipment_sent_after_repair === true,
    },
    /* division */
    division: {
      id:    row.division_id,
      code:  row.division_code,
      name:  row.division_name,
    },
    /* submitter */
    submitter: {
      employee_id: row.submitted_by_employee_id,
      name:        row.submitted_by_name,
      designation: row.submitted_by_designation,
      email:       row.submitted_by_email,
      lab_phone:   row.lab_phone,
      room_phone:  row.room_phone,
    },
    /* complaint + remarks */
    complaint_description: row.complaint_description,
    remarks:               row.remarks,
    project_name:          row.project_name,
    subsystem:             row.subsystem,
    /* approver */
    approver: row.approved_by_employee_id ? {
      employee_id: row.approved_by_employee_id,
      name:        row.approved_by_name,
    } : null,
    /* rejecter */
    rejecter: row.rejected_by_employee_id ? {
      employee_id: row.rejected_by_employee_id,
      name:        row.rejected_by_name,
    } : null,
    rejection_reason: row.rejection_reason,
    /* engineer */
    assigned_engineer: row.assigned_engineer_employee_id ? {
      employee_id: row.assigned_engineer_employee_id,
      name:        row.assigned_engineer_name,
    } : null,
    /* linked Job Card */
    linked_job_card: row.linked_job_card_section_no ? {
      section_job_no: row.linked_job_card_section_no,
      card_no:        row.linked_job_card_no,
      status:         row.linked_job_card_status,
      workflow_type:  row.linked_job_card_workflow_type,
      target_end_date: row.linked_job_card_target_end_date
                        ? dayjs(row.linked_job_card_target_end_date).format('YYYY-MM-DD') : null,
      created_at:     row.linked_job_card_created_at
                        ? dayjs(row.linked_job_card_created_at).toISOString() : null,
    } : null,
    /* T&C */
    tnc_accepted_at: row.tnc_accepted_at ? dayjs(row.tnc_accepted_at).toISOString() : null,
    tnc_version:     row.tnc_version,
    /* accessories */
    accessories: row.accessories || [],
  };
}

/**
 * GET /api/v1/job-requests/:id/history
 * Returns the full status_history chronologically. Used by the Detail
 * page's Timeline component.
 *
 * Caller is gated by the same row-level scope as detail — we re-check
 * ownership before exposing history (don't leak "Foo's JR moved through
 * X states" to a Normal user who doesn't own it).
 */
async function getJobRequestHistory({ jrNo, scope }) {
  if (!Number.isFinite(jrNo) || jrNo <= 0) {
    throw errors.badRequest('Invalid job request id', { field: 'id' });
  }
  // Reuse the same scope check by loading the JR row first.
  const jr = await repo.findJrById(jrNo);
  if (!jr) throw errors.notFound(`Job request ${jrNo} not found`);
  if (!scope.canReadAll && jr.submitted_by_employee_id !== scope.ownerEmployeeId) {
    throw errors.forbidden('Cannot view another user\'s job request');
  }

  const rows = await repo.findHistory(jrNo);
  return rows.map((r) => ({
    from_status:    r.from_status,
    to_status:      r.to_status,
    transitioned_at: r.transitioned_at ? dayjs(r.transitioned_at).toISOString() : null,
    transitioned_by: {
      employee_id: r.transitioned_by_employee_id,
      name:        r.transitioned_by_name,
    },
    reason: r.reason,
  }));
}

// ============================================================================
//                          PHASE 7 SLICE 2  ·  CONVERT
// ============================================================================

/**
 * POST /api/v1/job-requests/:id/convert
 *
 * Atomic operation per D-7.2.1:
 *   1) Lock-load JR (must be SUBMITTED, else 409 ILLEGAL_TRANSITION)
 *   2) State machine: SUBMITTED → APPROVED   (perm: job_request:approve)
 *   3) Status history row #1: SUBMITTED → APPROVED
 *   4) State machine: APPROVED → ASSIGNED    (perm: job_request:assign-engineer)
 *   5) Verify engineer is active LAB_ENGINEER
 *   6) Verify workflow_type matches JR.job_type bucket
 *   7) Generate JM_JobCardNO (locked MAX+1)
 *   8) Format JM_SectionJobNo = "J########"
 *   9) INSERT JC with status=ASSIGNED + all snapshot fields
 *   10) UPDATE JR: status=ASSIGNED + approved metadata + engineer + JC link
 *   11) Status history row #2: APPROVED → ASSIGNED
 *   12) Audit row #1: JR_CONVERT
 *   13) Audit row #2: JC_CREATE
 *   COMMIT
 *   ▸ kpiCache invalidations (org + personal of submitter)
 *
 * Any throw between BEGIN and COMMIT rolls back EVERY write — A12 is the
 * highest-value smoke for this orchestration.
 *
 * @param {Object} args
 * @param {number} args.jrNo
 * @param {Object} args.body          Validated by convertSchema
 * @param {Object} args.actor         { employeeId, role, permissions[] }
 * @param {string} args.ipAddress
 * @param {string} args.userAgent
 * @returns {{ job_request: {...}, job_card: {...} }}
 */
async function convertJobRequest({ jrNo, body, actor, ipAddress, userAgent }) {
  // ── Pre-txn validations that don't need a row lock ──────────────────
  // 1) Engineer must be a real active LAB_ENGINEER. Fail fast BEFORE we
  //    start a transaction so an obvious 400 doesn't waste a DB conn.
  const engineer = await lookupsRepo.findEngineerByEmployeeId(body.engineer_employee_id);
  if (!engineer) {
    throw errors.badRequest(
      'Selected engineer is not an active Lab Engineer',
      { field: 'engineer_employee_id' },
    );
  }

  // ── Transaction ─────────────────────────────────────────────────────
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 2) Lock-load the JR. FOR UPDATE serialises concurrent Converts.
    const jr = await repo.findForMutation(conn, jrNo);
    if (!jr) {
      throw errors.notFound(`Job request ${jrNo} not found`);
    }

    // 2a) PRE-FLIGHT: The legacy cmms_jobcard_mst.JM_EQM_ID is NOT NULL
    //     and forms half of a composite FK to cmms_eqip_mst. If the source
    //     JR was created without selecting an equipment from the typeahead
    //     (only the free-text equipment_name was filled), JR_EQM_ID stays
    //     NULL and we cannot legally produce a Job Card row.
    //
    //     Without this guard, MySQL would throw "Column 'JM_EQM_ID' cannot
    //     be null" which arrives at the client as a raw 500 — terrible UX
    //     and leaks DB internals. Throw a clear 422 instead so the FE can
    //     show "ask the submitter to pick an equipment for this JR".
    if (jr.equipment_id == null) {
      const err = errors.badRequest(
        'Cannot create job card: this Job Request has no equipment selected. '
        + 'Ask the submitter to update the JR with an equipment entry first.',
        { field: 'equipment_id' },
      );
      err.code = 'EQUIPMENT_REQUIRED';     // stable code FE can branch on
      err.statusCode = 422;                // not a generic 400; field-specific
      throw err;
    }

    // 3) State machine transition #1: SUBMITTED → APPROVED.
    //    This validates BOTH the source state AND that the actor holds
    //    `job_request:approve`. Throws 409 or 403 if not.
    const { newState: afterApprove } = transition(jr.status, 'approve', actor);
    // afterApprove === 'APPROVED' (logical). We never persist this.

    // 4) Write history row #1 BEFORE the second transition. If the
    //    second transition fails permission-wise, the whole txn rolls
    //    back including this row — but we want the row to exist on
    //    success, and committing it after the JR UPDATE would lose the
    //    ordering "Submitted → Approved" appears before "Approved →
    //    Assigned" in the timeline.
    await repo.appendStatusHistory(conn, jrNo, jr.status, afterApprove, actor.employeeId, null);

    // 5) State machine transition #2: APPROVED → ASSIGNED.
    //    Different permission (assign-engineer), enforced again.
    const { newState: afterAssign } = transition(afterApprove, 'assign', actor);
    // afterAssign === 'ASSIGNED'.

    // 6) Workflow type must match the JR's job_type bucket.
    const bucket = WORKFLOW_BUCKET[jr.job_type] || [];
    if (!bucket.includes(body.workflow_type)) {
      throw errors.badRequest(
        `Workflow type "${body.workflow_type}" is not valid for job_type "${jr.job_type}"`,
        { field: 'workflow_type' },
      );
    }

    // 7) Generate the new JC sequence (FOR UPDATE-locked).
    const jcNo = await jcRepo.nextJobCardNo(conn);
    const sectionJobNo = jcRepo.formatSectionJobNo(jcNo);

    // 8) INSERT the JC row. Status defaults to 'ASSIGNED' inside the repo.
    await jcRepo.insertFromJobRequest(conn, {
      job_card_no:             jcNo,
      section_job_no:          sectionJobNo,
      equipment_type:          jr.equipment_type,
      equipment_id:            jr.equipment_id,
      job_category:            jr.job_category,
      equipment_received_date: body.equipment_received_date,
      planned_start_date:      body.planned_start_date,
      target_end_date:         body.target_end_date,
      complaint_description:   jr.complaint_description,
      assigned_engineer_employee_id: engineer.employee_id,
      workflow_type:           body.workflow_type,
      required_resources:      body.required_resources || null,
      special_instructions:    body.special_instructions || null,
      parent_jr_no:            jr.jr_no,
      created_by_employee_id:  actor.employeeId,
    });

    // 9) UPDATE the JR — single statement, all fields together.
    await repo.updateOnConvert(conn, {
      jrNo,
      approverEmployeeId: actor.employeeId,
      engineerEmployeeId: engineer.employee_id,
      sectionJobNo,
    });

    // 10) Write history row #2 (APPROVED → ASSIGNED).
    await repo.appendStatusHistory(conn, jrNo, afterApprove, afterAssign, actor.employeeId, null);

    // 11) Audit row #1 — JR_CONVERT. Notes JSON includes the engineer's
    //     employee_id, workflow type, JC ref, and target end date so a
    //     forensic search later can reconstruct intent without joining
    //     to half the schema.
    await repo.writeAuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          'JR_CONVERT',
      jrNo,
      ipAddress,
      userAgent,
      details: {
        from: jr.status,
        to: 'ASSIGNED',
        engineer_employee_id: engineer.employee_id,
        engineer_name:        engineer.full_name,
        workflow_type:        body.workflow_type,
        section_job_no:       sectionJobNo,
        job_card_no:          jcNo,
        target_end_date:      body.target_end_date,
      },
    });

    // 12) Audit row #2 — JC_CREATE. Logged against the new JC entity.
    await jcRepo.writeAuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          'JC_CREATE',
      sectionJobNo,
      ipAddress,
      userAgent,
      details: {
        parent_jr_no: jr.jr_no,
        engineer_employee_id: engineer.employee_id,
        workflow_type: body.workflow_type,
        equipment_received_date: body.equipment_received_date,
        planned_start_date:      body.planned_start_date,
        target_end_date:         body.target_end_date,
      },
    });

    await conn.commit();

    // 13) After-commit side effects. The kpiCache invalidation MUST run
    //     after the txn so a racing dashboard request that misses the
    //     cache reads the now-committed new state.
    kpiCache.invalidate(KPI_KEYS.ORG);
    if (jr.submitted_by_employee_id) {
      kpiCache.invalidate(KPI_KEYS.personal(jr.submitted_by_employee_id));
    }

    // 14) Return the new state to the controller. Both `job_request` and
    //     `job_card` payloads — the FE can use the JR shape to update
    //     the /conversion tab list in place without a re-fetch round
    //     trip (it WILL re-fetch anyway via the React-Query invalidator,
    //     but the optimistic path is faster).
    return {
      job_request: {
        id:                  jr.jr_no,
        request_code:        formatJrCode(jr.jr_no, jr.created_at),
        status:              'ASSIGNED',
        approved_by_employee_id: actor.employeeId,
        assigned_engineer: {
          employee_id: engineer.employee_id,
          name:        engineer.full_name,
        },
        linked_job_card_section_no: sectionJobNo,
      },
      job_card: {
        section_job_no: sectionJobNo,
        job_card_no:    jcNo,
        status:         'ASSIGNED',
        workflow_type:  body.workflow_type,
        equipment_received_date: body.equipment_received_date,
        planned_start_date:      body.planned_start_date,
        target_end_date:         body.target_end_date,
        assigned_engineer: {
          employee_id: engineer.employee_id,
          name:        engineer.full_name,
        },
        parent_jr_no: jr.jr_no,
      },
    };
  } catch (err) {
    // Rollback. Catch errors from rollback itself so the original error
    // remains the one that surfaces to the caller (mirrors createJobRequest).
    try { await conn.rollback(); } catch { /* ignore secondary fault */ }
    throw err;
  } finally {
    conn.release();
  }
}

// ============================================================================
//                          PHASE 7 SLICE 2  ·  REJECT
// ============================================================================

/**
 * POST /api/v1/job-requests/:id/reject
 *
 * Atomic operation per D-7.2.2:
 *   1) Lock-load JR (must be SUBMITTED, else 409 ILLEGAL_TRANSITION)
 *   2) State machine: SUBMITTED → REJECTED  (perm: job_request:reject)
 *   3) UPDATE JR: status=REJECTED + rejection metadata + reason
 *   4) Status history: SUBMITTED → REJECTED (reason in row)
 *   5) Audit row: JR_REJECT
 *   COMMIT
 *   ▸ kpiCache invalidations
 *
 * REJECTED is terminal for Slice 2. Touches NO JC table.
 *
 * @param {Object} args
 * @param {number} args.jrNo
 * @param {{ reason: string }} args.body  Already zod-validated
 * @param {Object} args.actor
 * @param {string} args.ipAddress
 * @param {string} args.userAgent
 */
async function rejectJobRequest({ jrNo, body, actor, ipAddress, userAgent }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const jr = await repo.findForMutation(conn, jrNo);
    if (!jr) throw errors.notFound(`Job request ${jrNo} not found`);

    // State machine: validates source state + permission.
    const { newState } = transition(jr.status, 'reject', actor);
    // newState === 'REJECTED'.

    await repo.updateOnReject(conn, {
      jrNo,
      rejecterEmployeeId: actor.employeeId,
      reason: body.reason,
    });

    await repo.appendStatusHistory(conn, jrNo, jr.status, newState, actor.employeeId, body.reason);

    await repo.writeAuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          'JR_REJECT',
      jrNo,
      ipAddress,
      userAgent,
      details: {
        from: jr.status,
        to:   newState,
        // Truncate the reason inside the audit JSON so a long reason
        // doesn't crowd out the other fields when notes is truncated
        // to 500 chars by buildAuditNotes().
        reason: String(body.reason).slice(0, 200),
      },
    });

    await conn.commit();

    kpiCache.invalidate(KPI_KEYS.ORG);
    if (jr.submitted_by_employee_id) {
      kpiCache.invalidate(KPI_KEYS.personal(jr.submitted_by_employee_id));
    }

    return {
      id:               jr.jr_no,
      request_code:     formatJrCode(jr.jr_no, jr.created_at),
      status:           newState,
      rejected_at:      new Date().toISOString(),
      rejection_reason: body.reason,
      rejected_by_employee_id: actor.employeeId,
    };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  listJobRequests,
  createJobRequest,
  submitJobRequest,
  // Phase 7 Slice 2 additions:
  getJobRequestDetail,
  getJobRequestHistory,
  convertJobRequest,
  rejectJobRequest,
  // Phase 9 additions (JR loose ends):
  editDraftJobRequest,
  cancelDraftJobRequest,
};
