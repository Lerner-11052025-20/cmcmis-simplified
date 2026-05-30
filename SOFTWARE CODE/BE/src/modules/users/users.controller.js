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
    laneScopes: req.user.laneScopes || [],
    // Default the profile fields so the FE never reads undefined. Phase 6
    // adds lab_phone / room_phone / division_id|code|name for the JR form
    // Section 4 auto-fill (BR-JR-06).
    display_name: '',
    designation: '',
    email: '',
    lab_phone: '',
    room_phone: '',
    division_id: null,
    division_code: '',
    division_name: '',
  };

  // Enrich from cmms_emp_mst, users, and login_audit (best effort). If any query fails,
  // we still return 200 with the base payload.
  try {
    const profile = await repo.findEmployeeProfile(req.user.employeeId);
    if (profile) {
      payload.display_name = profile.display_name || '';
      payload.designation = profile.designation || '';
      payload.email = profile.email || '';
      payload.lab_phone = profile.lab_phone || '';
      payload.room_phone = profile.room_phone || '';
      payload.division_id = profile.division_id || null;
      payload.division_code = profile.division_code || '';
      payload.division_name = profile.division_name || '';
    }

    const account = await repo.findUserAccountDetails(req.user.userId);
    if (account) {
      payload.is_active = account.is_active;
      payload.is_locked = account.is_locked;
      payload.last_login_at = account.last_login_at;
      payload.created_at = account.created_at;
      payload.token_version = account.token_version;
    }

    const loginHistory = await repo.findUserLoginHistory(req.user.employeeId);
    payload.login_history = loginHistory || [];
  } catch (err) {
    req.log?.warn?.({ err: { message: err.message } },
      'Profile enrichment failed; returning base JWT fields only');
  }

  return res.json({ data: payload });
}

module.exports = { getMe };
