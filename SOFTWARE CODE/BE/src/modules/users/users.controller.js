// ============================================================================
// src/modules/users/users.controller.js  —  Current-user endpoint handler
// ----------------------------------------------------------------------------
// GET /api/v1/me — returns the authenticated user's identity, permission
// set, AND (Phase 5 enrichment) their display_name / designation / email
// from cmms_emp_mst for the Equipment Form's Section 5 auto-fill.
//
// Phase 4 ORIGINAL behavior was zero-DB-hop (everything from req.user).
// Phase 5 adds ONE narrow query against cmms_emp_mst keyed on the PK
// (EMM_ID), index-cheap. If the JOIN fails we still return the JWT
// fields — graceful degradation, no 500.
// ============================================================================

'use strict';

const repo = require('./users.repo');

async function getMe(req, res, next) {
  if (!req.user) {
    return next(new Error('authenticate middleware did not populate req.user'));
  }

  // Base payload — always present, comes free from the JWT.
  const payload = {
    employeeId: req.user.employeeId,
    userId: req.user.userId,
    role: req.user.role,
    permissions: req.user.permissions,
    // Default the profile fields so the FE never reads undefined.
    display_name: '',
    designation: '',
    email: '',
  };

  // Enrich from cmms_emp_mst (best effort). If the row is missing or the
  // query fails, we still return 200 with the base payload.
  try {
    const profile = await repo.findEmployeeProfile(req.user.employeeId);
    if (profile) {
      payload.display_name = profile.display_name || '';
      payload.designation = profile.designation || '';
      payload.email = profile.email || '';
    }
  } catch (err) {
    req.log?.warn?.({ err: { message: err.message } },
      'Profile enrichment failed; returning base JWT fields only');
  }

  return res.json({ data: payload });
}

module.exports = { getMe };
