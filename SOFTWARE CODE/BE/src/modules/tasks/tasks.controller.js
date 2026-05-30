// ============================================================================
// src/modules/tasks/tasks.controller.js  —  Tasks HTTP endpoint handlers
// ----------------------------------------------------------------------------
// Implements routing controllers to translate HTTP requests to Tasks services.
// ============================================================================

'use strict';

const service = require('./tasks.service');

/**
 * GET /api/v1/tasks
 * Fetches a list of tasks.
 */
async function list(req, res, next) {
  try {
    const data = await service.listTasks(req.query);
    return res.json({ data });
  } catch (e) {
    return next(e);
  }
}

/**
 * POST /api/v1/tasks
 * Creates a new task.
 */
async function create(req, res, next) {
  try {
    const payload = {
      name: req.body.name,
      type: req.body.type,
      desc: req.body.desc,
      est_hour: req.body.est_hour,
      is_active: req.body.is_active,
      employee_id: req.user.employeeId,
    };
    const item = await service.createTask(payload);
    return res.status(201).json({ data: item });
  } catch (e) {
    return next(e);
  }
}

/**
 * PUT /api/v1/tasks/:id
 * Updates an existing task.
 */
async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid ID parameter', details: null },
      });
    }
    const item = await service.updateTask(id, req.body, req.user.employeeId);
    return res.json({ data: item });
  } catch (e) {
    return next(e);
  }
}

/**
 * DELETE /api/v1/tasks/:id
 * Deletes a task.
 */
async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid ID parameter', details: null },
      });
    }
    const result = await service.deleteTask(id);
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
