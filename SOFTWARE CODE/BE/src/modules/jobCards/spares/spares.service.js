// ============================================================================
// src/modules/jobCards/spares/spares.service.js
// ----------------------------------------------------------------------------
// Mirrors maintenance.service. Same ownership + legacy gates.
// ============================================================================

'use strict';

const repo = require('./spares.repo');
const jcRepo = require('../jobCards.repo');
const jcService = require('../jobCards.service');
const { errors } = require('../../../middleware/errorHandler');

async function loadAndAuthorize(sectionJobNo, actor) {
  const jc = await jcRepo.findByIdWithDetails(sectionJobNo);
  if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);
  jcService.assertCanAccessLane(jc, actor);
  if (jcService.isLegacyRow(jc)) throw errors.conflict('Legacy job cards are read-only.');
  const own = jcService.isOwnEngineer(
    { assigned_engineer_employee_id: jc.assigned_engineer_employee_id }, actor,
  );
  const licSa = jcService.LIC_SA_ROLES.has(actor.role);
  if (!own && !licSa) {
    throw errors.forbidden('Only the assigned engineer or LIC/SA can edit spares rows');
  }
  return jc;
}

async function listRows({ sectionJobNo, actor }) {
  const jc = await jcRepo.findByIdWithDetails(sectionJobNo);
  if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);
  jcService.assertCanAccessLane(jc, actor);
  const rows = await repo.listForJc(sectionJobNo);
  return rows.map((r) => ({
    id: r.id,
    sr_no: r.sr_no,
    spare_type: r.spare_type,
    source: r.source,
    part_no: r.part_no,
    part_description: r.part_description,
    // Decimal coming back as string from mysql2 — coerce to Number for the FE.
    quantity: r.quantity == null ? null : Number(r.quantity),
    cost:     r.cost     == null ? null : Number(r.cost),
    created_by_employee_id: r.created_by_employee_id,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

async function addRow({ sectionJobNo, body, actor }) {
  await loadAndAuthorize(sectionJobNo, actor);
  const inserted = await repo.insertRow({
    sectionJobNo,
    spare_type: body.spare_type,
    source:     body.source,
    part_no:    body.part_no,
    part_description: body.part_description,
    quantity:   body.quantity,
    cost:       body.cost,
    createdByEmployeeId: actor.employeeId,
  });
  return { id: inserted.id, sr_no: inserted.sr_no, ...body };
}

async function updateRow({ sectionJobNo, rowId, body, actor }) {
  const row = await repo.findById(rowId);
  if (!row || row.jc_section_no !== sectionJobNo) {
    throw errors.notFound('Spare row not found on this job card');
  }
  await loadAndAuthorize(sectionJobNo, actor);
  const affected = await repo.updateRow(rowId, body);
  return { id: rowId, updated: affected > 0 };
}

async function deleteRow({ sectionJobNo, rowId, actor }) {
  const row = await repo.findById(rowId);
  if (!row || row.jc_section_no !== sectionJobNo) {
    throw errors.notFound('Spare row not found on this job card');
  }
  await loadAndAuthorize(sectionJobNo, actor);
  await repo.deleteRow(rowId);
  return { id: rowId, deleted: true };
}

module.exports = { listRows, addRow, updateRow, deleteRow };
