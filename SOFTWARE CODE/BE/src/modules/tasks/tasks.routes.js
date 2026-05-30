// ============================================================================
// src/modules/tasks/tasks.routes.js  —  Routing paths for tasks module
// ----------------------------------------------------------------------------
// Gated strictly to SUPER_ADMIN users with `tasks:manage` permission code.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');

const v = require('./tasks.validators');
const ctrl = require('./tasks.controller');

const router = express.Router();

// GET /api/v1/tasks — fetch paginated list of tasks (SUPER_ADMIN only)
router.get('/',
  authenticate,
  authorize('tasks:manage'),
  validate(v.createQuerySchema, 'query'),
  ctrl.list
);

// POST /api/v1/tasks — create a new task (SUPER_ADMIN only)
router.post('/',
  authenticate,
  authorize('tasks:manage'),
  validate(v.createBodySchema, 'body'),
  ctrl.create
);

// PUT /api/v1/tasks/:id — update an existing task (SUPER_ADMIN only)
router.put('/:id',
  authenticate,
  authorize('tasks:manage'),
  validate(v.updateBodySchema, 'body'),
  ctrl.update
);

// DELETE /api/v1/tasks/:id — delete a task permanently (SUPER_ADMIN only)
router.delete('/:id',
  authenticate,
  authorize('tasks:manage'),
  ctrl.delete
);

module.exports = router;
// 
