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

// ────────────────────────────────────────────────────────────────────
//  LIST
// ────────────────────────────────────────────────────────────────────
async function listJobRequests(params, scope) {
  const { rows, total } = await repo.listJobRequests(params, scope);

  const items = rows.map((r) => ({
    id:                  r.jr_no,
    request_code:        formatJrCode(r.jr_no, r.submitted_at_legacy || r.created_at),
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
    return { id: jrNo, request_code: formatJrCode(jrNo, jr.created_at), status: newState };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { listJobRequests, createJobRequest, submitJobRequest };
