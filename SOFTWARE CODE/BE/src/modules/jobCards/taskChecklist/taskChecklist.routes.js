// ============================================================================
// src/modules/jobCards/taskChecklist/taskChecklist.routes.js
// ----------------------------------------------------------------------------
// Mounted at /job-cards/:id/tasks (via parent jobCards.routes.js).
// Uses mergeParams so :id (sectionJobNo) flows through to handlers.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../../middleware/authenticate');
const authorize = require('../../../middleware/authorize');
const validate = require('../../../middleware/validate');

const v = require('../jobCards.validators');
const ctrl = require('./taskChecklist.controller');

// mergeParams:true → :id from the parent router is accessible as req.params.id
const router = express.Router({ mergeParams: true });

// ── GET /job-cards/:id/tasks — list (read-only) ─────────────────────
router.get('/',
  authenticate,
  authorize('job_card:read-detail'),
  ctrl.listTasks,
);

// ── POST /job-cards/:id/tasks — add (library or custom) ─────────────
router.post('/',
  authenticate,
  authorize('job_card:update-tasks'),
  validate(v.addTaskSchema, 'body'),
  ctrl.postAddTask,
);

// ── PATCH /job-cards/:id/tasks/:taskId — toggle is_completed ────────
router.patch('/:taskId',
  authenticate,
  authorize('job_card:update-tasks'),
  validate(v.toggleTaskSchema, 'body'),
  ctrl.patchToggleTask,
);

// ── DELETE /job-cards/:id/tasks/:taskId — hard delete ───────────────
router.delete('/:taskId',
  authenticate,
  authorize('job_card:update-tasks'),
  ctrl.deleteTask,
);

module.exports = router;
