// ============================================================================
// src/modules/jobCards/repair/repair.service.js
// ----------------------------------------------------------------------------
// Business logic for the dedicated TME/FPE repair workflow rows.
// ============================================================================

'use strict';

const repo = require('./repair.repo');
const jcRepo = require('../jobCards.repo');
const jcService = require('../jobCards.service');
const { errors } = require('../../../middleware/errorHandler');

function isRepairJob(jc) {
  return jc?.work_type === 'REPAIR'
      || jc?.workflow_type === 'REPAIR_STANDARD'
      || jc?.workflow_type === 'REPAIR_VENDOR'
      || jc?.workflow_type === 'REPAIR_INHOUSE';
}

async function loadAndAuthorize(sectionJobNo, actor) {
  const jc = await jcRepo.findByIdWithDetails(sectionJobNo);
  if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);
  jcService.assertCanAccessLane(jc, actor);
  if (!isRepairJob(jc)) {
    throw errors.badRequest('Dedicated repair rows are available only for repair job cards');
  }
  if (jcService.isLegacyRow(jc)) throw errors.conflict('Legacy job cards are read-only.');
  const own = jcService.isOwnEngineer(
    { assigned_engineer_employee_id: jc.assigned_engineer_employee_id }, actor,
  );
  const licSa = jcService.LIC_SA_ROLES.has(actor.role);
  if (!own && !licSa) {
    throw errors.forbidden('Only the assigned engineer or LIC/SA can edit repair workflow rows');
  }
  return jc;
}

async function loadForRead(sectionJobNo, actor) {
  const jc = await jcRepo.findByIdWithDetails(sectionJobNo);
  if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);
  jcService.assertCanAccessLane(jc, actor);
  if (!isRepairJob(jc)) {
    throw errors.badRequest('Dedicated repair rows are available only for repair job cards');
  }
  return jc;
}

async function listEquipmentRows({ sectionJobNo, actor }) {
  await loadForRead(sectionJobNo, actor);
  const rows = await repo.listEquipmentRows(sectionJobNo);
  return rows.map((r) => ({
    id: r.id,
    sr_no: r.sr_no,
    equipment_id: r.equipment_id,
    equipment_name: r.equipment_name,
    created_by_employee_id: r.created_by_employee_id,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

async function addEquipmentRow({ sectionJobNo, body, actor }) {
  await loadAndAuthorize(sectionJobNo, actor);
  const inserted = await repo.insertEquipmentRow({
    sectionJobNo,
    equipment_id: body.equipment_id,
    equipment_name: body.equipment_name,
    createdByEmployeeId: actor.employeeId,
  });
  return {
    id: inserted.id,
    sr_no: inserted.sr_no,
    equipment_id: body.equipment_id || null,
    equipment_name: body.equipment_name || null,
  };
}

async function updateEquipmentRow({ sectionJobNo, rowId, body, actor }) {
  const row = await repo.findEquipmentRow(rowId);
  if (!row || row.jc_section_no !== sectionJobNo) {
    throw errors.notFound('Repair equipment row not found on this job card');
  }
  await loadAndAuthorize(sectionJobNo, actor);
  const affected = await repo.updateEquipmentRow(rowId, body);
  return { id: rowId, updated: affected > 0 };
}

async function deleteEquipmentRow({ sectionJobNo, rowId, actor }) {
  const row = await repo.findEquipmentRow(rowId);
  if (!row || row.jc_section_no !== sectionJobNo) {
    throw errors.notFound('Repair equipment row not found on this job card');
  }
  await loadAndAuthorize(sectionJobNo, actor);
  await repo.deleteEquipmentRow(rowId);
  return { id: rowId, deleted: true };
}

module.exports = {
  listEquipmentRows,
  addEquipmentRow,
  updateEquipmentRow,
  deleteEquipmentRow,
};
