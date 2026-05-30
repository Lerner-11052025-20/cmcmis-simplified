// ============================================================================
// src/modules/jobRequestTerms/terms.routes.js  —  URL wiring
// ----------------------------------------------------------------------------
// Mounted at `${env.API_BASE_PATH}/job-request-terms` (= '/api/v1/job-request-terms').
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');

const v = require('./terms.validators');
const ctrl = require('./terms.controller');

const router = express.Router();

// GET /api/v1/job-request-terms — fetch active terms (accessible to all logged-in users)
router.get('/',
  authenticate,
  ctrl.getActive
);

// GET /api/v1/job-request-terms/all — fetch all terms (SUPER_ADMIN only)
router.get('/all',
  authenticate,
  authorize('terms:manage'),
  ctrl.getAll
);

// POST /api/v1/job-request-terms — create a new term (SUPER_ADMIN only)
router.post('/',
  authenticate,
  authorize('terms:manage'),
  validate(v.createSchema, 'body'),
  ctrl.create
);

// PUT /api/v1/job-request-terms/:id — update a term (SUPER_ADMIN only)
router.put('/:id',
  authenticate,
  authorize('terms:manage'),
  validate(v.updateSchema, 'body'),
  ctrl.update
);

// DELETE /api/v1/job-request-terms/:id — delete a term (SUPER_ADMIN only)
router.delete('/:id',
  authenticate,
  authorize('terms:manage'),
  ctrl.delete
);

module.exports = router;
