// ============================================================================
// src/modules/jobCards/jobCards.routes.js  —  URL wiring
// ----------------------------------------------------------------------------
// Mounted at `${env.API_BASE_PATH}/job-cards` (= '/api/v1/job-cards').
//
// Phase 9 routes (replaces Phase 6 Slice 1 stubs):
//   GET    /              → list (Phase 6)
//   GET    /:id           → detail
//   GET    /:id/history   → state-machine log
//   PATCH  /:id           → tab data save (no transition)
//   POST   /:id/start-work
//   POST   /:id/mark-complete
//   POST   /:id/verify-close   (LIC/SA only)
//   POST   /:id/reopen         (LIC/SA only, reason required)
//   GET    /:id/pdf            → 404 "Ships in Phase 11"
//
// Task-checklist routes live in taskChecklist.routes.js (mounted under
// the same /job-cards/:id prefix, see taskChecklist.routes.js for the
// shape). Documents routes live in documents.routes.js.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const rowLevelScope = require('../../middleware/rowLevelScope');
const validate = require('../../middleware/validate');
const { errors } = require('../../middleware/errorHandler');

const v = require('./jobCards.validators');
const ctrl = require('./jobCards.controller');

// Sub-module routers — mounted under the same router so all URLs share
// the /:id prefix. taskChecklist + documents export Express routers
// that already include their full path under /:id/... .
const taskChecklistRouter = require('./taskChecklist/taskChecklist.routes');
const documentsRouter     = require('./documents/documents.routes');
// Phase 9 — Slice-2 multi-row child sub-modules (Maintenance + Spares).
// Hot-promoted from the original Phase 9 deferral after DS surfaced the
// missing CRUD on 2026-05-19. Same Express subrouter pattern as the
// taskChecklist sub-module — mergeParams:true so :id flows down.
const maintenanceRouter   = require('./maintenance/maintenance.routes');
const sparesRouter        = require('./spares/spares.routes');

const router = express.Router();

router.get('/',
  authenticate,
  authorize('job_card:read-list'),
  rowLevelScope('job_card'),
  validate(v.listQuerySchema, 'query'),
  ctrl.list,
);

router.get('/export-pdf',
  authenticate,
  authorize('job_card:read-list'),
  rowLevelScope('job_card'),
  ctrl.exportPdf,
);

// ── DETAIL + HISTORY ─────────────────────────────────────────────────
router.get('/:id',
  authenticate,
  authorize('job_card:read-detail'),
  rowLevelScope('job_card'),
  ctrl.getDetail,
);
router.get('/:id/history',
  authenticate,
  authorize('job_card:read-detail'),
  rowLevelScope('job_card'),
  ctrl.getHistory,
);

// ── TAB PATCH (save data, no transition) ─────────────────────────────
router.patch('/:id',
  authenticate,
  authorize('job_card:update-tasks'),
  validate(v.patchTabSchema, 'body'),
  ctrl.patchTab,
);

// ── TRANSITIONS ──────────────────────────────────────────────────────
// start-work: state-machine validates own-engineer / LIC-SA.
router.post('/:id/start-work',
  authenticate,
  authorize('job_card:start-work'),
  validate(v.startWorkSchema, 'body'),
  ctrl.postStartWork,
);
// mark-complete: state-machine + 4 pre-completion gates.
router.post('/:id/mark-complete',
  authenticate,
  authorize('job_card:complete'),
  validate(v.markCompleteSchema, 'body'),
  ctrl.postMarkComplete,
);
// verify-close: LIC/SA only (state machine enforces).
router.post('/:id/verify-close',
  authenticate,
  authorize('job_card:verify-close'),
  validate(v.verifyCloseSchema, 'body'),
  ctrl.postVerifyClose,
);
// reopen: LIC/SA only with reason (state machine enforces).
router.post('/:id/reopen',
  authenticate,
  authorize('job_card:reopen'),
  validate(v.reopenSchema, 'body'),
  ctrl.postReopen,
);

// ── SUB-MODULES (mounted under the same /:id prefix) ────────────────
router.use('/:id/tasks',             taskChecklistRouter);
router.use('/:id/documents',         documentsRouter);
router.use('/:id/maintenance-rows',  maintenanceRouter);
router.use('/:id/spares-rows',       sparesRouter);

// ── PDF stub — ships in Phase 11 ─────────────────────────────────────
router.get('/:id/pdf',
  authenticate,
  authorize('job_card:generate-pdf'),
  (_req, _res, next) => next(errors.notFound('Ships in Phase 11 (PDF generation)')),
);

module.exports = router;
