// ============================================================================
// src/modules/lookups/lookups.routes.js  —  URL wiring
// ----------------------------------------------------------------------------
// Mounted at `${env.API_BASE_PATH}/lookups`. Both endpoints require auth
// AND the relevant create-permission so a view-only user can't enumerate
// the master via the typeahead.
//
//   GET /lookups/divisions          → authenticate → authorize('job_request:create')
//   GET /lookups/equipment/search   → authenticate → authorize('job_request:create')
//
// Note: equipment:read-list would be a softer gate, but the form auto-fill
// is the only consumer in slice 1, and that path already requires
// job_request:create — using the same gate prevents surprise.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const { authorizeAny } = authorize;
const ctrl = require('./lookups.controller');

const router = express.Router();

router.get('/divisions',
  authenticate,
  authorizeAny('job_request:create', 'equipment:read-list'),
  ctrl.getDivisions,
);

router.get('/equipment/search',
  authenticate,
  authorizeAny('job_request:create', 'equipment:read-list'),
  ctrl.getEquipmentSearch,
);

module.exports = router;
