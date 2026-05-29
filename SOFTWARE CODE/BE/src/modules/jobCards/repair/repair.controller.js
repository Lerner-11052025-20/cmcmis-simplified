// ============================================================================
// src/modules/jobCards/repair/repair.controller.js
// ============================================================================

'use strict';

const service = require('./repair.service');

function readActor(req) {
  return { role: req.user.role, laneScopes: req.user.laneScopes || [] };
}

function writeActor(req) {
  return {
    employeeId: req.user.employeeId,
    role: req.user.role,
    permissions: req.user.permissions,
    laneScopes: req.user.laneScopes || [],
  };
}

function parseRowId(req, res) {
  const rowId = parseInt(req.params.rowId, 10);
  if (!Number.isFinite(rowId) || rowId <= 0) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid row id', details: null } });
    return null;
  }
  return rowId;
}

async function listEquipmentRows(req, res, next) {
  try {
    const items = await service.listEquipmentRows({
      sectionJobNo: req.params.id,
      actor: readActor(req),
    });
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

async function postEquipmentRow(req, res, next) {
  try {
    const data = await service.addEquipmentRow({
      sectionJobNo: req.params.id,
      body: req.body,
      actor: writeActor(req),
    });
    return res.status(201).json({ data });
  } catch (e) { return next(e); }
}

async function patchEquipmentRow(req, res, next) {
  try {
    const rowId = parseRowId(req, res);
    if (!rowId) return null;
    const data = await service.updateEquipmentRow({
      sectionJobNo: req.params.id,
      rowId,
      body: req.body,
      actor: writeActor(req),
    });
    return res.json({ data });
  } catch (e) { return next(e); }
}

async function deleteEquipmentRow(req, res, next) {
  try {
    const rowId = parseRowId(req, res);
    if (!rowId) return null;
    const data = await service.deleteEquipmentRow({
      sectionJobNo: req.params.id,
      rowId,
      actor: writeActor(req),
    });
    return res.json({ data });
  } catch (e) { return next(e); }
}

module.exports = {
  listEquipmentRows,
  postEquipmentRow,
  patchEquipmentRow,
  deleteEquipmentRow,
};
