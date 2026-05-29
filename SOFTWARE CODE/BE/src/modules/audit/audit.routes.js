// ============================================================================
// src/modules/audit/audit.routes.js  —  URL wiring
// ----------------------------------------------------------------------------
// PHASE 14 — Audit Log Viewer
//
// Mounted at `${env.API_BASE_PATH}/audit` (= '/api/v1/audit').
//
// ROUTE TABLE  (all routes are GET — strictly read-only module)
//
//   GET /              authenticate → authorize('audit:read-list')   list
//   GET /filters       authenticate → authorize('audit:read-list')   dropdown values
//   GET /export        authenticate → authorize('audit:export')      CSV stream
//   GET /:id           authenticate → authorize('audit:read-list')   detail
//
// PIPELINE NOTE — `/filters` + `/export` are registered BEFORE `/:id` so
// Express does not interpret "filters" or "export" as an :id param.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const validate     = require('../../middleware/validate');

const v    = require('./audit.validators');
const ctrl = require('./audit.controller');

const router = express.Router();

router.get('/',
  authenticate,
  authorize('audit:read-list'),
  validate(v.listQuerySchema, 'query'),
  ctrl.list,
);

router.get('/filters',
  authenticate,
  authorize('audit:read-list'),
  validate(v.filtersQuerySchema, 'query'),
  ctrl.filters,
);

router.get('/export',
  authenticate,
  authorize('audit:export'),
  validate(v.exportQuerySchema, 'query'),
  ctrl.exportCsv,
);

router.get('/:id',
  authenticate,
  authorize('audit:read-list'),
  validate(v.detailParamSchema, 'params'),
  validate(v.detailQuerySchema, 'query'),
  ctrl.detail,
);

module.exports = router;
