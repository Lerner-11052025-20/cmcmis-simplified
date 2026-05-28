// ============================================================================
// src/modules/jobCards/spares/spares.controller.js
// ============================================================================

'use strict';

const service = require('./spares.service');

async function listRows(req, res, next) {
  try {
    const items = await service.listRows({
      sectionJobNo: req.params.id,
      actor: { role: req.user.role, laneScopes: req.user.laneScopes || [] },
    });
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

async function postAddRow(req, res, next) {
  try {
    const data = await service.addRow({
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

async function patchRow(req, res, next) {
  try {
    const rowId = parseInt(req.params.rowId, 10);
    if (!Number.isFinite(rowId) || rowId <= 0) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid row id', details: null } });
    }
    const data = await service.updateRow({
      sectionJobNo: req.params.id,
      rowId,
      body:         req.body,
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

async function deleteRow(req, res, next) {
  try {
    const rowId = parseInt(req.params.rowId, 10);
    if (!Number.isFinite(rowId) || rowId <= 0) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid row id', details: null } });
    }
    const data = await service.deleteRow({
      sectionJobNo: req.params.id,
      rowId,
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

module.exports = { listRows, postAddRow, patchRow, deleteRow };
