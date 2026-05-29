// ============================================================================
// src/modules/jobCards/taskChecklist/taskChecklist.controller.js
// ============================================================================

'use strict';

const service = require('./taskChecklist.service');

async function listTasks(req, res, next) {
  try {
    const items = await service.listTasks({
      sectionJobNo: req.params.id,
      actor: { role: req.user.role, laneScopes: req.user.laneScopes || [] },
    });
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

async function postAddTask(req, res, next) {
  try {
    const data = await service.addTask({
      sectionJobNo: req.params.id,
      body:         req.body,
      actor: {
        employeeId:  req.user.employeeId,
        role:        req.user.role,
        permissions: req.user.permissions,
        laneScopes:  req.user.laneScopes || [],
      },
    });
    return res.status(201).json({ data });
  } catch (e) { return next(e); }
}

async function patchToggleTask(req, res, next) {
  try {
    const taskRowId = parseInt(req.params.taskId, 10);
    if (!Number.isFinite(taskRowId) || taskRowId <= 0) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid task id', details: null } });
    }
    const data = await service.toggleTask({
      sectionJobNo: req.params.id,
      taskRowId,
      body: req.body,
      actor: {
        employeeId:  req.user.employeeId,
        role:        req.user.role,
        permissions: req.user.permissions,
        laneScopes:  req.user.laneScopes || [],
      },
    });
    return res.json({ data });
  } catch (e) { return next(e); }
}

async function deleteTask(req, res, next) {
  try {
    const taskRowId = parseInt(req.params.taskId, 10);
    if (!Number.isFinite(taskRowId) || taskRowId <= 0) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid task id', details: null } });
    }
    const data = await service.deleteTask({
      sectionJobNo: req.params.id,
      taskRowId,
      actor: {
        employeeId:  req.user.employeeId,
        role:        req.user.role,
        permissions: req.user.permissions,
        laneScopes:  req.user.laneScopes || [],
      },
    });
    return res.json({ data });
  } catch (e) { return next(e); }
}

module.exports = { listTasks, postAddTask, patchToggleTask, deleteTask };
