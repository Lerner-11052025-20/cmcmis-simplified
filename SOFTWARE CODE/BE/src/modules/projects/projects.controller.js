// ============================================================================
// src/modules/projects/projects.controller.js  —  Projects HTTP endpoint handlers
// ----------------------------------------------------------------------------
// Implements routing controllers to translate HTTP requests to Projects services.
// ============================================================================

'use strict';

const service = require('./projects.service');

/**
 * GET /api/v1/projects
 * Fetches a list of projects.
 */
async function list(req, res, next) {
  try {
    const data = await service.listProjects(req.query);
    return res.json({ data });
  } catch (e) {
    return next(e);
  }
}

/**
 * POST /api/v1/projects
 * Creates a new project.
 */
async function create(req, res, next) {
  try {
    const payload = {
      name: req.body.name,
      is_active: req.body.is_active,
      employee_id: req.user.employeeId,
    };
    const item = await service.createProject(payload);
    return res.status(201).json({ data: item });
  } catch (e) {
    return next(e);
  }
}

/**
 * PUT /api/v1/projects/:id
 * Updates an existing project.
 */
async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid ID parameter', details: null },
      });
    }
    const item = await service.updateProject(id, req.body, req.user.employeeId);
    return res.json({ data: item });
  } catch (e) {
    return next(e);
  }
}

/**
 * DELETE /api/v1/projects/:id
 * Deletes a project.
 */
async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid ID parameter', details: null },
      });
    }
    const result = await service.deleteProject(id);
    return res.json({ data: result });
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  list,
  create,
  update,
  delete: remove,
};
// 
