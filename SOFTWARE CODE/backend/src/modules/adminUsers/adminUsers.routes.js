// ============================================================================
// src/modules/adminUsers/adminUsers.routes.js  —  URL wiring
// ----------------------------------------------------------------------------
// Mounted at `${env.API_BASE_PATH}/admin/users` (= '/api/v1/admin/users').
//
//   GET    /                  → authenticate → authorize('user:read-list') → list
//   GET    /:id               → authenticate → authorize('user:read-list') → detail
//   GET    /:id/history       → authenticate → authorize('user:read-list') → history
//   PATCH  /:id/role          → authenticate → authorize('user:role-assign')→ validate → changeRole
//   PATCH  /:id/activate      → authenticate → authorize('user:activate')   → validate → activate
//   PATCH  /:id/deactivate    → authenticate → authorize('user:deactivate') → validate → deactivate
//   POST   /:id/force-logout  → authenticate → authorize('user:force-logout')→ validate → forceLogout
//
// All seven gates resolve to SUPER_ADMIN only (Phase 3 mig 007 + Phase 7 mig 113).
// ============================================================================

'use strict';

const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const v = require('./adminUsers.validators');
const ctrl = require('./adminUsers.controller');

const router = express.Router();

// ── List + detail + history (all read-list) ──────────────────────────
router.get('/',
  authenticate,
  authorize('user:read-list'),
  validate(v.listQuerySchema, 'query'),
  ctrl.list,
);

router.get('/:id',
  authenticate,
  authorize('user:read-list'),
  ctrl.detail,
);

router.get('/:id/history',
  authenticate,
  authorize('user:read-list'),
  ctrl.history,
);

// ── Mutations ───────────────────────────────────────────────────────
router.patch('/:id/role',
  authenticate,
  authorize('user:role-assign'),
  validate(v.roleChangeSchema, 'body'),
  ctrl.changeRole,
);

router.patch('/:id/activate',
  authenticate,
  authorize('user:activate'),
  validate(v.activateSchema, 'body'),
  ctrl.activate,
);

router.patch('/:id/deactivate',
  authenticate,
  authorize('user:deactivate'),
  validate(v.deactivateSchema, 'body'),
  ctrl.deactivate,
);

router.post('/:id/force-logout',
  authenticate,
  authorize('user:force-logout'),
  validate(v.forceLogoutSchema, 'body'),
  ctrl.forceLogout,
);

module.exports = router;
