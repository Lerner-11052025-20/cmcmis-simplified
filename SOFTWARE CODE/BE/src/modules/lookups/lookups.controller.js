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

async function getEquipmentSearch(req, res, next) {
  try {
    const q = String(req.query.q || '').slice(0, 120);
    const limit = req.query.limit;
    const items = await repo.searchEquipment(q, limit);
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

/**
 * GET /api/v1/lookups/engineers
 * Returns every active LAB_ENGINEER with workload counts. Sorted
 * ascending by active_card_count (least-loaded first).
 */
async function getEngineers(_req, res, next) {
  try {
    const items = await repo.listEngineersWithWorkload();
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

module.exports = { getDivisions, getEquipmentSearch, getEngineers };
