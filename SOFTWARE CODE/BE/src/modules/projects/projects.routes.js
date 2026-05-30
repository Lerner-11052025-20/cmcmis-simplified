// ============================================================================
// src/modules/projects/projects.routes.js  —  Routing paths for projects module
// ----------------------------------------------------------------------------
// Gated strictly to SUPER_ADMIN users with `projects:manage` permission code.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');

const v = require('./projects.validators');
const ctrl = require('./projects.controller');

const router = express.Router();

// GET /api/v1/projects — fetch paginated list of projects (SUPER_ADMIN only)
router.get('/',
  authenticate,
  authorize('projects:manage'),
  validate(v.createQuerySchema, 'query'),
  ctrl.list
);

// POST /api/v1/projects — create a new project (SUPER_ADMIN only)
router.post('/',
  authenticate,
  authorize('projects:manage'),
  validate(v.createBodySchema, 'body'),
  ctrl.create
);

// PUT /api/v1/projects/:id — update an existing project (SUPER_ADMIN only)
router.put('/:id',
  authenticate,
  authorize('projects:manage'),
  validate(v.updateBodySchema, 'body'),
  ctrl.update
);

// DELETE /api/v1/projects/:id — delete a project permanently (SUPER_ADMIN only)
router.delete('/:id',
  authenticate,
  authorize('projects:manage'),
  ctrl.delete
);

module.exports = router;
