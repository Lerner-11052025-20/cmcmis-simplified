// ============================================================================
// src/modules/tasks/tasks.service.js  —  Tasks orchestration logic
// ----------------------------------------------------------------------------
// Maps repository queries to REST responses and handles duplicate validation checks.
// ============================================================================

'use strict';

const repo = require('./tasks.repo');
const { errors } = require('../../middleware/errorHandler');

/**
 * Fetch a paginated list of tasks with metadata.
 */
async function listTasks({ page, page_size, q, type }) {
  const { items, total } = await repo.findAndCount({ page, pageSize: page_size, q, type });
  return {
    items,
    total,
    page: Number(page),
    page_size: Number(page_size),
    total_pages: Math.ceil(total / Number(page_size)),
  };
}

/**
 * Create a new task after ensuring there is no duplicate.
 */
async function createTask({ name, type, desc, est_hour, is_active, employee_id }) {
  const isDuplicate = await repo.existsByNameAndType(name, type);
  if (isDuplicate) {
    throw errors.conflict(`Task with name "${name}" and type "${type}" already exists`);
  }

  const isActiveTiny = is_active ? 1 : 0;
  return await repo.insert({ name, type, desc, est_hour, is_active: isActiveTiny, employee_id });
}

/**
 * Update an existing task.
 */
async function updateTask(id, payload, employee_id) {
  const existing = await repo.findById(id);
  if (!existing) {
    throw errors.notFound(`Task with ID ${id} not found`);
  }

  const checkName = payload.name !== undefined ? payload.name : existing.name;
  const checkType = payload.type !== undefined ? payload.type : existing.type;

  if (payload.name !== undefined || payload.type !== undefined) {
    const isDuplicate = await repo.existsByNameAndType(checkName, checkType, id);
    if (isDuplicate) {
      throw errors.conflict(`Task with name "${checkName}" and type "${checkType}" already exists`);
    }
  }

  const updatedData = {
    name: payload.name !== undefined ? payload.name : undefined,
    type: payload.type !== undefined ? payload.type : undefined,
    desc: payload.desc !== undefined ? payload.desc : undefined,
    est_hour: payload.est_hour !== undefined ? payload.est_hour : undefined,
    is_active: payload.is_active !== undefined ? (payload.is_active ? 1 : 0) : undefined,
    employee_id,
  };

  await repo.update(id, updatedData);
  return { id, ...existing, ...payload };
}

/**
 * Permanently delete a task.
 */
async function deleteTask(id) {
  const existing = await repo.findById(id);
  if (!existing) {
    throw errors.notFound(`Task with ID ${id} not found`);
  }

  await repo.delete(id);
  return { success: true };
}

module.exports = {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
};
