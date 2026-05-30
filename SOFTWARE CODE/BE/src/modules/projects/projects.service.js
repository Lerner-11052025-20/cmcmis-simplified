// ============================================================================
// src/modules/projects/projects.service.js  —  Projects orchestration logic
// ----------------------------------------------------------------------------
// Maps repository queries to REST responses and handles duplicate validation checks.
// ============================================================================

'use strict';

const repo = require('./projects.repo');
const { errors } = require('../../middleware/errorHandler');

/**
 * Fetch a paginated list of projects with metadata.
 */
async function listProjects({ page, page_size, q }) {
  const { items, total } = await repo.findAndCount({ page, pageSize: page_size, q });
  return {
    items,
    total,
    page: Number(page),
    page_size: Number(page_size),
    total_pages: Math.ceil(total / Number(page_size)),
  };
}

/**
 * Create a new project after ensuring there is no name duplicate.
 */
async function createProject({ name, is_active, employee_id }) {
  const isDuplicate = await repo.existsByName(name);
  if (isDuplicate) {
    throw errors.conflict(`Project with name "${name}" already exists`);
  }

  const isActiveTiny = is_active ? 1 : 0;
  return await repo.insert({ name, is_active: isActiveTiny, employee_id });
}

/**
 * Update an existing project.
 */
async function updateProject(id, payload, employee_id) {
  const existing = await repo.findById(id);
  if (!existing) {
    throw errors.notFound(`Project with ID ${id} not found`);
  }

  if (payload.name !== undefined) {
    const isDuplicate = await repo.existsByName(payload.name, id);
    if (isDuplicate) {
      throw errors.conflict(`Project with name "${payload.name}" already exists`);
    }
  }

  const updatedData = {
    name: payload.name !== undefined ? payload.name : undefined,
    is_active: payload.is_active !== undefined ? (payload.is_active ? 1 : 0) : undefined,
    employee_id,
  };

  await repo.update(id, updatedData);
  return { id, ...existing, ...payload };
}

/**
 * Permanently delete a project.
 */
async function deleteProject(id) {
  const existing = await repo.findById(id);
  if (!existing) {
    throw errors.notFound(`Project with ID ${id} not found`);
  }

  await repo.delete(id);
  return { success: true };
}

module.exports = {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
};
