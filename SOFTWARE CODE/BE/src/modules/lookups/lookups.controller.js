// ============================================================================
// src/modules/lookups/lookups.controller.js  —  HTTP handlers
// ----------------------------------------------------------------------------
// Two endpoints, both feed FE form dropdowns:
//   GET /api/v1/lookups/divisions
//   GET /api/v1/lookups/equipment/search?q=…&limit=20
// ============================================================================

'use strict';

const repo = require('./lookups.repo');

async function getDivisions(_req, res, next) {
  try {
    const items = await repo.listDivisions();
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

async function getProjects(_req, res, next) {
  try {
    const items = await repo.listProjects();
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

async function getEquipmentSearch(req, res, next) {
  try {
    const q = String(req.query.q || '').slice(0, 120);
    const limit = req.query.limit;
    const category = req.query.category ? String(req.query.category).slice(0, 20) : null;
    const items = await repo.searchEquipment(q, limit, category);
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

async function getSubmitterContext(req, res, next) {
  try {
    const items = await repo.getSubmitterContext(req.user.employeeId);
    return res.json({ data: items });
  } catch (e) { return next(e); }
}

async function getEquipmentAccessories(req, res, next) {
  try {
    const eqmType = String(req.query.eqm_type || '').slice(0, 60);
    const eqmId = Number(req.query.eqm_id);
    if (!eqmType || !Number.isInteger(eqmId) || eqmId <= 0) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid equipment reference', details: null },
      });
    }
    const items = await repo.listEquipmentAccessories(eqmType, eqmId);
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

/**
 * GET /api/v1/lookups/engineers
 * Returns every active LAB_ENGINEER with workload counts. Sorted
 * ascending by active_card_count (least-loaded first).
 */
async function getEngineers(req, res, next) {
  try {
    const items = await repo.listEngineersWithWorkload({
      role: req.user.role,
      laneScopes: req.user.laneScopes || [],
    });
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

/**
 * GET /api/v1/lookups/task-library?category=CALIBRATION
 * Returns active library tasks for the Task Checklist dropdown (Tab 10).
 * Category is optional — Phase 9 D-9.7 says we pre-filter by JC's workflow
 * category but allow "show all" via no category param.
 */
async function getTaskLibrary(req, res, next) {
  try {
    const cat = req.query.category ? String(req.query.category).toUpperCase() : null;
    if (cat && !['CALIBRATION', 'INSPECTION', 'MAINTENANCE'].includes(cat)) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid category', details: null },
      });
    }
    const items = await repo.listTaskLibrary(cat);
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

async function getCalibrationPeople(req, res, next) {
  try {
    const items = await repo.listCalibrationPeople({
      role: req.user.role,
      laneScopes: req.user.laneScopes || [],
    });
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

module.exports = {
  getDivisions,
  getProjects,
  getEquipmentSearch,
  getSubmitterContext,
  getEquipmentAccessories,
  getEngineers,
  getTaskLibrary,
  getCalibrationPeople,
};
