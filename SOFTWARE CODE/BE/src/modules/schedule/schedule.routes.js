// ============================================================================
// src/modules/schedule/schedule.routes.js  —  URL wiring
// ----------------------------------------------------------------------------
// PHASE 13 — Schedule sub-module
//
// Mounted at `${env.API_BASE_PATH}/schedules` (= '/api/v1/schedules').
//
// ROUTE TABLE
//   GET    /                           list / calendar query
//   POST   /                           create
//   GET    /:id                        detail
//   PATCH  /:id                        edit (partial)
//   POST   /:id/status                 transition (PLANNED → SCHEDULED → …)
//   DELETE /:id                        cancel (logical)
//   GET    /:id/ics                    single-event ICS
//   GET    /export.ics                 bulk filtered ICS feed
//
// PIPELINE NOTE — `/export.ics` is registered BEFORE `/:id/ics` so Express
// does not interpret "export" as an :id param. Same with `/export.ics`
// and `/:id`.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const validate     = require('../../middleware/validate');

const v    = require('./schedule.validators');
const ctrl = require('./schedule.controller');

const router = express.Router();

// ── List ──────────────────────────────────────────────────────────────
router.get('/',
  authenticate,
  authorize('schedule:read-list'),
  validate(v.listQuerySchema, 'query'),
  ctrl.list,
);

// ── Bulk ICS export (MUST be before /:id and /:id/ics) ────────────────
router.get('/export.ics',
  authenticate,
  authorize('schedule:export'),
  validate(v.icsExportQuerySchema, 'query'),
  ctrl.icsBulk,
);

// ── Create ────────────────────────────────────────────────────────────
router.post('/',
  authenticate,
  authorize('schedule:create'),
  validate(v.createSchema, 'body'),
  ctrl.create,
);

// ── Detail ────────────────────────────────────────────────────────────
router.get('/:id',
  authenticate,
  authorize('schedule:read-list'),
  validate(v.idParamSchema, 'params'),
  ctrl.getDetail,
);

// ── Edit (partial) ────────────────────────────────────────────────────
router.patch('/:id',
  authenticate,
  authorize('schedule:update'),
  validate(v.idParamSchema, 'params'),
  validate(v.editSchema, 'body'),
  ctrl.edit,
);

// ── Status transition ─────────────────────────────────────────────────
router.post('/:id/status',
  authenticate,
  authorize('schedule:update'),
  validate(v.idParamSchema, 'params'),
  validate(v.statusTransitionSchema, 'body'),
  ctrl.transition,
);

// ── Cancel (logical delete) ───────────────────────────────────────────
router.delete('/:id',
  authenticate,
  authorize('schedule:delete'),
  validate(v.idParamSchema, 'params'),
  ctrl.cancel,
);

// ── Per-schedule ICS ──────────────────────────────────────────────────
router.get('/:id/ics',
  authenticate,
  authorize('schedule:export'),
  validate(v.idParamSchema, 'params'),
  ctrl.icsOne,
);

module.exports = router;
