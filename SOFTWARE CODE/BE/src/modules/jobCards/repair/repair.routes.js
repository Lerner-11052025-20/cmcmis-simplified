// ============================================================================
// src/modules/jobCards/repair/repair.routes.js
// ----------------------------------------------------------------------------
// Mounted at /job-cards/:id/repair via parent jobCards.routes.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../../middleware/authenticate');
const authorize = require('../../../middleware/authorize');
const validate = require('../../../middleware/validate');

const v = require('../jobCards.validators');
const ctrl = require('./repair.controller');

const router = express.Router({ mergeParams: true });

router.get('/equipment-rows',
  authenticate,
  authorize('job_card:read-detail'),
  ctrl.listEquipmentRows,
);

router.post('/equipment-rows',
  authenticate,
  authorize('job_card:update-tasks'),
  validate(v.repairEquipmentRowSchema, 'body'),
  ctrl.postEquipmentRow,
);

router.patch('/equipment-rows/:rowId',
  authenticate,
  authorize('job_card:update-tasks'),
  validate(v.repairEquipmentRowSchema.partial(), 'body'),
  ctrl.patchEquipmentRow,
);

router.delete('/equipment-rows/:rowId',
  authenticate,
  authorize('job_card:update-tasks'),
  ctrl.deleteEquipmentRow,
);

module.exports = router;
