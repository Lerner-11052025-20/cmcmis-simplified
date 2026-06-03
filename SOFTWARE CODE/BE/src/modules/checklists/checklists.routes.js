'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const { authorizeAny } = authorize;
const validate = require('../../middleware/validate');

const v = require('./checklists.validators');
const ctrl = require('./checklists.controller');

const router = express.Router();

router.get('/',
  authenticate,
  authorizeAny('tasks:manage', 'job_card:update-tasks'),
  validate(v.listQuerySchema, 'query'),
  ctrl.list,
);

router.get('/equipment',
  authenticate,
  authorizeAny('tasks:manage', 'job_card:update-tasks'),
  validate(v.equipmentQuerySchema, 'query'),
  ctrl.equipment,
);

router.get('/task-master',
  authenticate,
  authorizeAny('tasks:manage', 'job_card:update-tasks'),
  validate(v.taskQuerySchema, 'query'),
  ctrl.taskMaster,
);

router.get('/for-equipment',
  authenticate,
  authorize('job_card:read-detail'),
  validate(v.forEquipmentQuerySchema, 'query'),
  ctrl.forEquipment,
);

router.post('/job-cards/:id/apply',
  authenticate,
  authorize('job_card:update-tasks'),
  validate(v.applyBodySchema, 'body'),
  ctrl.applyToJobCard,
);

router.get('/:id',
  authenticate,
  authorizeAny('tasks:manage', 'job_card:update-tasks'),
  ctrl.get,
);

router.post('/',
  authenticate,
  authorizeAny('tasks:manage', 'job_card:update-tasks'),
  validate(v.createBodySchema, 'body'),
  ctrl.create,
);

router.put('/:id',
  authenticate,
  authorizeAny('tasks:manage', 'job_card:update-tasks'),
  validate(v.updateBodySchema, 'body'),
  ctrl.update,
);

router.delete('/:id',
  authenticate,
  authorizeAny('tasks:manage', 'job_card:update-tasks'),
  ctrl.delete,
);

module.exports = router;
