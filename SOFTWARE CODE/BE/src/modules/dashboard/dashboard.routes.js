// ============================================================================
// src/modules/dashboard/dashboard.routes.js  —  URL wiring
// ----------------------------------------------------------------------------
// Mounted at `${env.API_BASE_PATH}/dashboard` (= '/api/v1/dashboard').
//
//   GET /kpis   → authenticate → authorize('dashboard:view') → validate → controller
//
// Slice 1 exposes exactly one endpoint. Slice 2 will add /charts /activity
// /workload behind the same gate.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');

const v = require('./dashboard.validators');
const ctrl = require('./dashboard.controller');

const router = express.Router();

// GET /api/v1/dashboard/kpis
router.get(
  '/kpis',
  authenticate,
  authorize('dashboard:view'),
  validate(v.kpisQuerySchema, 'query'),
  ctrl.kpis,
);

module.exports = router;
