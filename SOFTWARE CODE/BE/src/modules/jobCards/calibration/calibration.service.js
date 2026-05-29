// ============================================================================
// src/modules/jobCards/calibration/calibration.service.js
// ----------------------------------------------------------------------------
// Business logic for the dedicated TME/FPE calibration workflow rows.
// ============================================================================

'use strict';

const repo = require('./calibration.repo');
const jcRepo = require('../jobCards.repo');
const jcService = require('../jobCards.service');
const { errors } = require('../../../middleware/errorHandler');

function isCalibrationJob(jc) {
  return jc?.work_type === 'CALIBRATION'
      || jc?.workflow_type === 'CALIBRATION_STANDARD'
      || jc?.workflow_type === 'CALIBRATION_PRECISION';
}

async function loadAndAuthorize(sectionJobNo, actor) {
  const jc = await jcRepo.findByIdWithDetails(sectionJobNo);
  if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);
  jcService.assertCanAccessLane(jc, actor);
  if (!isCalibrationJob(jc)) {
    throw errors.badRequest('Dedicated calibration rows are available only for calibration job cards');
  }
  if (jcService.isLegacyRow(jc)) throw errors.conflict('Legacy job cards are read-only.');
  const own = jcService.isOwnEngineer(
    { assigned_engineer_employee_id: jc.assigned_engineer_employee_id }, actor,
  );
  const licSa = jcService.LIC_SA_ROLES.has(actor.role);
  if (!own && !licSa) {
    throw errors.forbidden('Only the assigned engineer or LIC/SA can edit calibration workflow rows');
  }
  return jc;
}

async function loadForRead(sectionJobNo, actor) {
  const jc = await jcRepo.findByIdWithDetails(sectionJobNo);
  if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);
  jcService.assertCanAccessLane(jc, actor);
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
    throw errors.notFound('Calibration equipment row not found on this job card');
  }
  await loadAndAuthorize(sectionJobNo, actor);
  const affected = await repo.updateEquipmentRow(rowId, body);
  return { id: rowId, updated: affected > 0 };
}

async function deleteEquipmentRow({ sectionJobNo, rowId, actor }) {
  const row = await repo.findEquipmentRow(rowId);
  if (!row || row.jc_section_no !== sectionJobNo) {
    throw errors.notFound('Calibration equipment row not found on this job card');
  }
  await loadAndAuthorize(sectionJobNo, actor);
  await repo.deleteEquipmentRow(rowId);
  return { id: rowId, deleted: true };
}

async function listAdjustmentRows({ sectionJobNo, actor }) {
  await loadForRead(sectionJobNo, actor);
  const rows = await repo.listAdjustmentRows(sectionJobNo);
  return rows.map((r) => ({
    id: r.id,
    sr_no: r.sr_no,
    parameter_name: r.parameter_name,
    test_value: r.test_value,
    specifications_limits: r.specifications_limits,
    observation_before: r.observation_before,
    observation_after: r.observation_after,
    created_by_employee_id: r.created_by_employee_id,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

async function addAdjustmentRow({ sectionJobNo, body, actor }) {
  await loadAndAuthorize(sectionJobNo, actor);
  const inserted = await repo.insertAdjustmentRow({
    sectionJobNo,
    parameter_name: body.parameter_name,
    test_value: body.test_value,
    specifications_limits: body.specifications_limits,
    observation_before: body.observation_before,
    observation_after: body.observation_after,
    createdByEmployeeId: actor.employeeId,
  });
  return {
    id: inserted.id,
    sr_no: inserted.sr_no,
    parameter_name: body.parameter_name || null,
    test_value: body.test_value || null,
    specifications_limits: body.specifications_limits || null,
    observation_before: body.observation_before || null,
    observation_after: body.observation_after || null,
  };
}

async function updateAdjustmentRow({ sectionJobNo, rowId, body, actor }) {
  const row = await repo.findAdjustmentRow(rowId);
  if (!row || row.jc_section_no !== sectionJobNo) {
    throw errors.notFound('Calibration adjustment row not found on this job card');
  }
  await loadAndAuthorize(sectionJobNo, actor);
  const affected = await repo.updateAdjustmentRow(rowId, body);
  return { id: rowId, updated: affected > 0 };
}

async function deleteAdjustmentRow({ sectionJobNo, rowId, actor }) {
  const row = await repo.findAdjustmentRow(rowId);
  if (!row || row.jc_section_no !== sectionJobNo) {
    throw errors.notFound('Calibration adjustment row not found on this job card');
  }
  await loadAndAuthorize(sectionJobNo, actor);
  await repo.deleteAdjustmentRow(rowId);
  return { id: rowId, deleted: true };
}

module.exports = {
  listEquipmentRows,
  addEquipmentRow,
  updateEquipmentRow,
  deleteEquipmentRow,
  listAdjustmentRows,
  addAdjustmentRow,
  updateAdjustmentRow,
  deleteAdjustmentRow,
};
