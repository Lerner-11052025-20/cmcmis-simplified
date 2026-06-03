'use strict';

const repo = require('./checklists.repo');
const jcRepo = require('../jobCards/jobCards.repo');
const jcService = require('../jobCards/jobCards.service');
const { errors } = require('../../middleware/errorHandler');

const MANAGER_ROLES = new Set([
  'SUPER_ADMIN',
  'TME_CAL_LAB_IN_CHARGE',
  'FPE_CAL_LAB_IN_CHARGE',
  'TME_REPAIR_LAB_IN_CHARGE',
  'FPE_REPAIR_LAB_IN_CHARGE',
  'LAB_IN_CHARGE',
]);

function requireChecklistManager(actor) {
  if (!MANAGER_ROLES.has(actor.role)) {
    throw errors.forbidden('Only Super Admin and calibration Lab In-Charge roles can manage checklists');
  }
}

function isCalibrationJobCard(jc) {
  return jc?.work_type === 'CALIBRATION'
    || jc?.workflow_type === 'CALIBRATION_STANDARD'
    || jc?.workflow_type === 'CALIBRATION_PRECISION';
}

function normalizeTask(task) {
  return {
    task_id: task.is_custom ? null : task.task_id || null,
    task_text: String(task.task_text || '').trim(),
    task_type: task.task_type || 'NABL',
    is_custom: !!task.is_custom || !task.task_id,
  };
}

async function hydrateEquipment(equipmentCode) {
  const equipment = await repo.findEquipmentByCode(equipmentCode);
  if (!equipment) {
    throw errors.badRequest('Equipment ID was not found in equipment master', { field: 'equipment_code' });
  }
  return equipment;
}

async function list({ query, actor }) {
  requireChecklistManager(actor);
  const items = await repo.listChecklists({ q: query.q });
  const hydrated = await Promise.all(items.map((item) => repo.getChecklist(item.id)));
  return { items: hydrated.map((item, index) => ({ ...item, task_count: items[index].task_count })) };
}

async function equipment({ query, actor }) {
  requireChecklistManager(actor);
  const item = await hydrateEquipment(query.code);
  return { item };
}

async function taskMaster({ query, actor }) {
  requireChecklistManager(actor);
  const items = await repo.listTaskMaster({ q: query.q, limit: query.limit });
  return { items };
}

async function get({ id, actor }) {
  requireChecklistManager(actor);
  const item = await repo.getChecklist(id);
  if (!item) throw errors.notFound(`Checklist ${id} not found`);
  return { item };
}

async function create({ body, actor }) {
  requireChecklistManager(actor);
  const equipment = await hydrateEquipment(body.equipment_code);
  const tasks = body.tasks.map(normalizeTask);
  const item = await repo.insertChecklist({
    checklistName: body.checklist_name,
    equipment,
    tasks,
    actor,
  });
  return { item };
}

async function update({ id, body, actor }) {
  requireChecklistManager(actor);
  const existing = await repo.getChecklist(id);
  if (!existing) throw errors.notFound(`Checklist ${id} not found`);
  const equipment = await hydrateEquipment(body.equipment_code);
  const tasks = body.tasks.map(normalizeTask);
  const item = await repo.updateChecklist(id, {
    checklistName: body.checklist_name,
    equipment,
    tasks,
    isActive: body.is_active !== false,
    actor,
  });
  return { item };
}

async function remove({ id, actor }) {
  requireChecklistManager(actor);
  const existing = await repo.getChecklist(id);
  if (!existing) throw errors.notFound(`Checklist ${id} not found`);
  await repo.deleteChecklist(id);
  return { id, deleted: true };
}

async function forEquipment({ query, actor }) {
  const items = await repo.listChecklistsForEquipment(query.equipment_type, query.equipment_id);
  return { items };
}

async function applyToJobCard({ sectionJobNo, body, actor }) {
  const jc = await jcRepo.findByIdWithDetails(sectionJobNo);
  if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);
  if (!isCalibrationJobCard(jc)) {
    throw errors.badRequest('Checklist master can be applied only to calibration job cards');
  }

  jcService.assertCanAccessLane(jc, actor);
  if (jcService.isLegacyRow(jc)) {
    throw errors.conflict('Legacy job cards are read-only.');
  }
  const own = jcService.isOwnEngineer(jc, actor);
  const licSa = jcService.LIC_SA_ROLES.has(actor.role);
  if (!own && !licSa) {
    throw errors.forbidden('Only the assigned engineer or LIC/SA can apply a checklist');
  }

  const checklist = await repo.getChecklist(body.checklist_id);
  if (!checklist || !checklist.is_active) {
    throw errors.badRequest('Selected checklist was not found or inactive', { field: 'checklist_id' });
  }
  if (String(checklist.equipment_type) !== String(jc.equipment_type) || Number(checklist.equipment_id) !== Number(jc.equipment_id)) {
    throw errors.badRequest('Selected checklist is not configured for this job card equipment');
  }

  const result = await repo.applyChecklistToJobCard({ sectionJobNo, checklistId: body.checklist_id, actor });
  return result;
}

module.exports = {
  list,
  equipment,
  taskMaster,
  get,
  create,
  update,
  remove,
  forEquipment,
  applyToJobCard,
};
