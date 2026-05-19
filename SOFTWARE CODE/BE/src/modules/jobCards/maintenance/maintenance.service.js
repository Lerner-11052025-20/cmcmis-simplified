// ============================================================================
// src/modules/jobCards/maintenance/maintenance.service.js
// ----------------------------------------------------------------------------
// Business logic for jc_maintenance_details CRUD.
//
// Ownership: same shape as Task Checklist — engineer (own JC) OR LIC/SA
// can write; legacy JCs are read-only (D-9.14).
// ============================================================================

'use strict';

const repo = require('./maintenance.repo');
const jcRepo = require('../jobCards.repo');
const jcService = require('../jobCards.service');
const { errors } = require('../../../middleware/errorHandler');

// ── Shared write-access gate. Reused by add / update / delete. ──
async function loadAndAuthorize(sectionJobNo, actor) {
  const jc = await jcRepo.findByIdWithDetails(sectionJobNo);
  if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);
  if (jcService.isLegacyRow(jc)) throw errors.conflict('Legacy job cards are read-only.');
  const own = jcService.isOwnEngineer(
    { assigned_engineer_employee_id: jc.assigned_engineer_employee_id }, actor,
  );
  const licSa = jcService.LIC_SA_ROLES.has(actor.role);
  if (!own && !licSa) {
    throw errors.forbidden('Only the assigned engineer or LIC/SA can edit maintenance rows');
  }
  return jc;
}

// ── List (read-only, anyone with job_card:read-detail) ──
async function listRows({ sectionJobNo }) {
  // We could also check the JC exists here, but the route's auth gate
  // already ran and an unknown section_job_no returns 0 rows naturally.
  const rows = await repo.listForJc(sectionJobNo);
  return rows.map((r) => ({
    id: r.id,
    sr_no: r.sr_no,
    defect_description: r.defect_description,
    observation: r.observation,
    action_taken: r.action_taken,
    remarks: r.remarks,
    created_by_employee_id: r.created_by_employee_id,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

// ── Add one new row ──
async function addRow({ sectionJobNo, body, actor }) {
  await loadAndAuthorize(sectionJobNo, actor);
  const inserted = await repo.insertRow({
    sectionJobNo,
    defect_description: body.defect_description,
    observation:        body.observation,
    action_taken:       body.action_taken,
    remarks:            body.remarks,
    createdByEmployeeId: actor.employeeId,
  });
  return {
    id: inserted.id,
    sr_no: inserted.sr_no,
    defect_description: body.defect_description,
    observation: body.observation || null,
    action_taken: body.action_taken || null,
    remarks: body.remarks || null,
  };
}

// ── Update an existing row ──
async function updateRow({ sectionJobNo, rowId, body, actor }) {
  const row = await repo.findById(rowId);
  if (!row || row.jc_section_no !== sectionJobNo) {
    throw errors.notFound('Maintenance row not found on this job card');
  }
  await loadAndAuthorize(sectionJobNo, actor);
  const affected = await repo.updateRow(rowId, body);
  if (affected === 0) return { id: rowId, updated: false };
  return { id: rowId, updated: true };
}

// ── Delete one row (hard delete per Q-5) ──
async function deleteRow({ sectionJobNo, rowId, actor }) {
  const row = await repo.findById(rowId);
  if (!row || row.jc_section_no !== sectionJobNo) {
    throw errors.notFound('Maintenance row not found on this job card');
  }
  await loadAndAuthorize(sectionJobNo, actor);
  await repo.deleteRow(rowId);
  return { id: rowId, deleted: true };
}

module.exports = { listRows, addRow, updateRow, deleteRow };
