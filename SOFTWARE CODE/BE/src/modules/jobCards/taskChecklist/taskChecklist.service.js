// ============================================================================
// src/modules/jobCards/taskChecklist/taskChecklist.service.js
// ----------------------------------------------------------------------------
// Business logic for the Task Checklist sub-feature (Tab 10).
//
// All mutations gate through jobCards.service helpers (isLegacyRow,
// isOwnEngineer, LIC_SA_ROLES) so the per-JC ownership rules stay
// consistent with transitions.
// ============================================================================

'use strict';

const pool = require('../../../config/db');
const repo = require('./taskChecklist.repo');
const jcRepo = require('../jobCards.repo');
const jcService = require('../jobCards.service');
const { errors } = require('../../../middleware/errorHandler');

// ── Ownership gate shared by all mutations on tasks ──
function requireWriteAccess(jc, actor) {
  jcService.assertCanAccessLane(jc, actor);
  if (jcService.isLegacyRow(jc)) {
    throw errors.conflict('Legacy job cards are read-only.');
  }
  const own = jcService.isOwnEngineer(jc, actor);
  const licSa = jcService.LIC_SA_ROLES.has(actor.role);
  if (!own && !licSa) {
    throw errors.forbidden('Only the assigned engineer or LIC/SA can modify task checklist');
  }
}

// ── List tasks ──────────────────────────────────────────────────────
async function listTasks({ sectionJobNo, actor }) {
  const jc = await jcRepo.findByIdWithDetails(sectionJobNo);
  if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);
  jcService.assertCanAccessLane(jc, actor);
  
  const isCalibration = jc.work_type === 'CALIBRATION'
    || jc.workflow_type === 'CALIBRATION_STANDARD'
    || jc.workflow_type === 'CALIBRATION_PRECISION';

  const rows = await repo.listTasksForJc(sectionJobNo, isCalibration);
  return rows.map((r) => ({
    id:            r.id,
    checklist_id:  r.checklist_id || null,
    task_id:       r.task_id,
    task_text:     r.task_text,
    is_custom:     !!r.is_custom,
    is_completed:  !!r.is_completed,
    completed_by_employee_id: r.completed_by_employee_id,
    completed_at:  r.completed_at,
    order_index:   r.order_index,
    task_type:     r.task_type || null,
    task_result:   r.task_result || null,
  }));
}

// ── Add task ────────────────────────────────────────────────────────
async function addTask({ sectionJobNo, body, actor }) {
  const jc = await jcRepo.findByIdWithDetails(sectionJobNo);
  if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);
  // map onto what jcService.isOwnEngineer / isLegacyRow expect
  const jcShape = {
    parent_jr_no: jc.parent_jr_no,
    assigned_engineer_employee_id: jc.assigned_engineer_employee_id,
    status: jc.status,
    lane_code: jc.lane_code,
  };
  requireWriteAccess(jcShape, actor);

  const isCalibration = jc.work_type === 'CALIBRATION'
    || jc.workflow_type === 'CALIBRATION_STANDARD'
    || jc.workflow_type === 'CALIBRATION_PRECISION';

  let task_text, isCustom = body.is_custom === true, libraryTaskId = null;
  if (body.task_id) {
    // If calibration, library task refers to master table cmms_task_mst
    const lib = isCalibration
      ? await repo.findMstTask(body.task_id)
      : await repo.findLibraryTask(body.task_id);

    if (!lib || !lib.is_active) {
      throw errors.badRequest('Selected library task not found or inactive', { field: 'task_id' });
    }
    task_text = lib.task_text;
    isCustom = false;
    libraryTaskId = lib.id;
  } else {
    // Custom path.
    task_text = (body.task_text || '').trim();
    if (task_text.length < 3) {
      throw errors.badRequest('Custom task text must be at least 3 characters', { field: 'task_text' });
    }
    if (task_text.length > 500) {
      throw errors.badRequest('Custom task text cannot exceed 500 characters', { field: 'task_text' });
    }
    isCustom = true;
  }

  const newId = await repo.insertTask(null, {
    sectionJobNo,
    taskId: libraryTaskId,
    taskText: task_text,
    isCustom,
    createdByEmployeeId: actor.employeeId,
  }, isCalibration);
  return { id: newId, task_text, is_custom: isCustom };
}

// ── Toggle completion ───────────────────────────────────────────────
async function toggleTask({ sectionJobNo, taskRowId, body, actor }) {
  const jc = await jcRepo.findByIdWithDetails(sectionJobNo);
  if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);

  const isCalibration = jc.work_type === 'CALIBRATION'
    || jc.workflow_type === 'CALIBRATION_STANDARD'
    || jc.workflow_type === 'CALIBRATION_PRECISION';

  const task = await repo.findTaskById(taskRowId, isCalibration);
  if (!task || task.jc_section_no !== sectionJobNo) {
    throw errors.notFound('Task not found on this job card');
  }

  requireWriteAccess({
    parent_jr_no: jc.parent_jr_no,
    assigned_engineer_employee_id: jc.assigned_engineer_employee_id,
    status: jc.status,
    lane_code: jc.lane_code,
  }, actor);

  await repo.setTaskCompletion(null, taskRowId, {
    isCompleted: body.is_completed === true,
    byEmployeeId: actor.employeeId,
    taskType: body.task_type || null,
    taskResult: body.task_result || null,
  }, isCalibration);

  return {
    id: taskRowId,
    is_completed: body.is_completed === true,
    task_type: body.task_type || null,
    task_result: body.task_result || null,
  };
}

// ── Delete task ─────────────────────────────────────────────────────
async function deleteTask({ sectionJobNo, taskRowId, actor }) {
  const jc = await jcRepo.findByIdWithDetails(sectionJobNo);
  if (!jc) throw errors.notFound(`Job card ${sectionJobNo} not found`);

  const isCalibration = jc.work_type === 'CALIBRATION'
    || jc.workflow_type === 'CALIBRATION_STANDARD'
    || jc.workflow_type === 'CALIBRATION_PRECISION';

  const task = await repo.findTaskById(taskRowId, isCalibration);
  if (!task || task.jc_section_no !== sectionJobNo) {
    throw errors.notFound('Task not found on this job card');
  }

  requireWriteAccess({
    parent_jr_no: jc.parent_jr_no,
    assigned_engineer_employee_id: jc.assigned_engineer_employee_id,
    status: jc.status,
    lane_code: jc.lane_code,
  }, actor);

  await repo.deleteTask(null, taskRowId, isCalibration);
  return { id: taskRowId, deleted: true };
}

module.exports = { listTasks, addTask, toggleTask, deleteTask };
