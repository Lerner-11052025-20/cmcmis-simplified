// ============================================================================
// src/modules/jobCards/maintenance/maintenance.routes.js
// ----------------------------------------------------------------------------
// Mounted at /job-cards/:id/maintenance-rows via parent jobCards.routes.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../../middleware/authenticate');
const authorize = require('../../../middleware/authorize');
const validate = require('../../../middleware/validate');

const v = require('../jobCards.validators');
const ctrl = require('./maintenance.controller');

const router = express.Router({ mergeParams: true });

// GET — anyone with read-detail.
router.get('/',
  authenticate,
  authorize('job_card:read-detail'),
  ctrl.listRows,
);

// POST — engineer (own) OR LIC/SA.
router.post('/',
  authenticate,
  authorize('job_card:update-tasks'),
  validate(v.maintenanceRowSchema, 'body'),
  ctrl.postAddRow,
);

// PATCH — partial update of any column.
router.patch('/:rowId',
  authenticate,
  authorize('job_card:update-tasks'),
  validate(v.maintenanceRowSchema.partial(), 'body'),
  ctrl.patchRow,
);

// DELETE — hard delete.
router.delete('/:rowId',
  authenticate,
  authorize('job_card:update-tasks'),
  ctrl.deleteRow,
);

module.exports = router;
