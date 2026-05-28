// ============================================================================
// src/modules/dashboard/dashboard.controller.js  —  HTTP handler
// ----------------------------------------------------------------------------
// Doctrine 8 (Phase 6): thin controllers. One service call, one response,
// no SQL, no business logic. Exactly TWO concerns here:
//   1. Pull the actor (role + employeeId) from req.user.
//   2. Shape the response envelope `{ data: { ... } }` per house style.
// ============================================================================

'use strict';

const service = require('./dashboard.service');

/**
 * GET /api/v1/dashboard/kpis
 *
 * The authenticate middleware has already verified the JWT + checked
 * token_version. The authorize('dashboard:view') middleware has confirmed
 * the actor holds the permission. We trust req.user.
 */
async function kpis(req, res, next) {
  try {
    const actor = {
      role:       req.user.role,
      employeeId: req.user.employeeId,
      laneScopes: req.user.laneScopes || [],
    };
    const result = await service.getKpis(actor);
    return res.json({ data: result });
  } catch (e) {
    return next(e);
  }
}

module.exports = { kpis };
