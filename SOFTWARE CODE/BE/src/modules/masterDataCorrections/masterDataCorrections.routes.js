'use strict';

const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const ctrl = require('./masterDataCorrections.controller');
const v = require('./masterDataCorrections.validators');

const router = express.Router();

router.get('/context',
  authenticate,
  authorize('master_data_correction:create'),
  validate(v.contextQuerySchema, 'query'),
  ctrl.context,
);

router.post('/',
  authenticate,
  authorize('master_data_correction:create'),
  validate(v.createSchema, 'body'),
  ctrl.create,
);

router.get('/',
  authenticate,
  authorize('master_data_correction:read-list'),
  validate(v.listQuerySchema, 'query'),
  ctrl.list,
);

router.post('/:id/approve',
  authenticate,
  authorize('master_data_correction:approve'),
  validate(v.idParamSchema, 'params'),
  validate(v.reviewSchema, 'body'),
  ctrl.approve,
);

router.post('/:id/reject',
  authenticate,
  authorize('master_data_correction:reject'),
  validate(v.idParamSchema, 'params'),
  validate(v.reviewSchema, 'body'),
  ctrl.reject,
);

module.exports = router;
