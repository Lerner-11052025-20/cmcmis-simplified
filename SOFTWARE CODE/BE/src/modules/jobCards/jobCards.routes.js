// ============================================================================
// src/modules/jobCards/jobCards.routes.js  —  URL wiring
// ----------------------------------------------------------------------------
// Mounted at `${env.API_BASE_PATH}/job-cards` (= '/api/v1/job-cards').
//
// ROUTE TABLE (Phase 6 Slice 1)
//
//   GET    /              → authenticate → authorize('job_card:read-list')
//                          → rowLevelScope('job_card')
//                          → validate(listQuerySchema, 'query')
//                          → ctrl.list
//
// SHIPS-IN-FUTURE STUBS — lock the URL + perm gates now
//   GET    /:id           → 404 Slice 2
//   POST   /:id/start     → 404 Slice 2
//   POST   /:id/complete  → 404 Slice 2
//   POST   /:id/verify    → 404 Slice 2
//   POST   /:id/reopen    → 404 Slice 2
//   GET    /:id/pdf       → 404 Slice 2
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const rowLevelScope = require('../../middleware/rowLevelScope');
const validate = require('../../middleware/validate');
const { errors } = require('../../middleware/errorHandler');

const v = require('./jobCards.validators');
const ctrl = require('./jobCards.controller');

const router = express.Router();

router.get('/',
  authenticate,
  authorize('job_card:read-list'),
  rowLevelScope('job_card'),
  validate(v.listQuerySchema, 'query'),
  ctrl.list,
);

const SLICE_2 = (_req, _res, next) => next(errors.notFound('Ships in Phase 6 Slice 2'));

router.get('/:id',
  authenticate, authorize('job_card:read-detail'), SLICE_2);
router.post('/:id/start',
  authenticate, authorize('job_card:start-work'), SLICE_2);
router.post('/:id/complete',
  authenticate, authorize('job_card:complete'), SLICE_2);
router.post('/:id/verify',
  authenticate, authorize('job_card:verify-close'), SLICE_2);
router.post('/:id/reopen',
  authenticate, authorize('job_card:reopen'), SLICE_2);
router.get('/:id/pdf',
  authenticate, authorize('job_card:generate-pdf'), SLICE_2);

module.exports = router;
