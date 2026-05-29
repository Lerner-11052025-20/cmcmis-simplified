// ============================================================================
// src/modules/jobCards/calibration/calibration.routes.js
// ----------------------------------------------------------------------------
// Mounted at /job-cards/:id/calibration via parent jobCards.routes.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../../middleware/authenticate');
const authorize = require('../../../middleware/authorize');
const validate = require('../../../middleware/validate');

const v = require('../jobCards.validators');
const ctrl = require('./calibration.controller');

const router = express.Router({ mergeParams: true });

router.get('/equipment-rows',
  authenticate,
  authorize('job_card:read-detail'),
  ctrl.listEquipmentRows,
);

router.post('/equipment-rows',
  authenticate,
  authorize('job_card:update-tasks'),
  validate(v.calibrationEquipmentRowSchema, 'body'),
  ctrl.postEquipmentRow,
);

router.patch('/equipment-rows/:rowId',
  authenticate,
  authorize('job_card:update-tasks'),
  validate(v.calibrationEquipmentRowSchema.partial(), 'body'),
  ctrl.patchEquipmentRow,
);

router.delete('/equipment-rows/:rowId',
  authenticate,
  authorize('job_card:update-tasks'),
  ctrl.deleteEquipmentRow,
);

router.get('/adjustment-rows',
  authenticate,
  authorize('job_card:read-detail'),
  ctrl.listAdjustmentRows,
);

router.post('/adjustment-rows',
  authenticate,
  authorize('job_card:update-tasks'),
  validate(v.calibrationAdjustmentRowSchema, 'body'),
  ctrl.postAdjustmentRow,
);

router.patch('/adjustment-rows/:rowId',
  authenticate,
  authorize('job_card:update-tasks'),
  validate(v.calibrationAdjustmentRowSchema.partial(), 'body'),
  ctrl.patchAdjustmentRow,
);

router.delete('/adjustment-rows/:rowId',
  authenticate,
  authorize('job_card:update-tasks'),
  ctrl.deleteAdjustmentRow,
);

module.exports = router;
