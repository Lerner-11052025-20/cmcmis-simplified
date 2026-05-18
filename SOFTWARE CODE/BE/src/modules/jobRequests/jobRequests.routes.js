// ============================================================================
// src/modules/jobRequests/jobRequests.routes.js  —  URL wiring
// ----------------------------------------------------------------------------
// Mounted at `${env.API_BASE_PATH}/job-requests` (= '/api/v1/job-requests').
//
// ROUTE TABLE (Phase 6 Slice 1)
//
//   GET    /              → authenticate
//                          → authorizeAny('job_request:read-all','job_request:read-own')
//                          → rowLevelScope('job_request')
//                          → validate(listQuerySchema, 'query')
//                          → ctrl.list
//
//   POST   /              → authenticate → authorize('job_request:create')
//                          → validate(createSchema, 'body')
//                          → ctrl.create
//
//   POST   /:id/submit    → authenticate → authorize('job_request:create')
//                          → validate(submitSchema, 'body')
//                          → ctrl.submit  (ownership re-checked in service)
//
// SHIPS-IN-FUTURE STUBS (lock the URL surface + permission gate now)
//   GET    /:id           → 404 "Ships in Phase 6 Slice 2"
//   POST   /:id/approve   → 404 "Ships in Phase 6 Slice 2"
//   POST   /:id/reject    → 404 "Ships in Phase 6 Slice 2"
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const { authorizeAny } = authorize;
const rowLevelScope = require('../../middleware/rowLevelScope');
const validate = require('../../middleware/validate');
const { errors } = require('../../middleware/errorHandler');

const v = require('./jobRequests.validators');
const ctrl = require('./jobRequests.controller');

const router = express.Router();

// ── List + Create + Submit ───────────────────────────────────────────
router.get('/',
  authenticate,
  authorizeAny('job_request:read-all', 'job_request:read-own'),
  rowLevelScope('job_request'),
  validate(v.listQuerySchema, 'query'),
  ctrl.list,
);

router.post('/',
  authenticate,
  authorize('job_request:create'),
  validate(v.createSchema, 'body'),
  ctrl.create,
);

router.post('/:id/submit',
  authenticate,
  authorize('job_request:create'),
  validate(v.submitSchema, 'body'),
  ctrl.submit,
);

// ── Stubs — slice 2+ ─────────────────────────────────────────────────
const SLICE_2 = (_req, _res, next) => next(errors.notFound('Ships in Phase 6 Slice 2'));

router.get('/:id',
  authenticate, authorizeAny('job_request:read-all', 'job_request:read-own'), SLICE_2);
router.post('/:id/approve',
  authenticate, authorize('job_request:approve'), SLICE_2);
router.post('/:id/reject',
  authenticate, authorize('job_request:reject'), SLICE_2);

module.exports = router;
