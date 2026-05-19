// ============================================================================
// src/modules/jobCards/spares/spares.routes.js
// ----------------------------------------------------------------------------
// Mounted at /job-cards/:id/spares-rows via parent jobCards.routes.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../../middleware/authenticate');
const authorize = require('../../../middleware/authorize');
const validate = require('../../../middleware/validate');

const v = require('../jobCards.validators');
const ctrl = require('./spares.controller');

const router = express.Router({ mergeParams: true });

router.get('/',
  authenticate,
  authorize('job_card:read-detail'),
  ctrl.listRows,
);

router.post('/',
  authenticate,
  authorize('job_card:update-tasks'),
  validate(v.spareRowSchema, 'body'),
  ctrl.postAddRow,
);

router.patch('/:rowId',
  authenticate,
  authorize('job_card:update-tasks'),
  validate(v.spareRowSchema.partial(), 'body'),
  ctrl.patchRow,
);

router.delete('/:rowId',
  authenticate,
  authorize('job_card:update-tasks'),
  ctrl.deleteRow,
);

module.exports = router;
