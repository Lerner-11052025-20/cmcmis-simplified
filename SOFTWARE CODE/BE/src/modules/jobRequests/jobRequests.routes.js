// ============================================================================
// src/modules/jobRequests/jobRequests.routes.js  —  URL wiring
// ----------------------------------------------------------------------------
// Mounted at `${env.API_BASE_PATH}/job-requests` (= '/api/v1/job-requests').
//
// ROUTE TABLE
//
//   GET    /              → list (Phase 6 Slice 1)
//   POST   /              → create (Phase 6 Slice 1)
//   POST   /:id/submit    → DRAFT → SUBMITTED (Phase 6 Slice 1)
//
//   PHASE 7 SLICE 2 ─────────────────────────────────────────────────
//   GET    /:id           → detail (RBAC-scoped)
//   GET    /:id/history   → status_history rows (RBAC-scoped)
//   POST   /:id/convert   → atomic approve + assign + create JC
//                              auth: approve AND assign-engineer (BOTH)
//   POST   /:id/reject    → SUBMITTED → REJECTED with reason
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const { authorizeAny } = authorize;
const rowLevelScope = require('../../middleware/rowLevelScope');
const validate = require('../../middleware/validate');

const v = require('./jobRequests.validators');
const ctrl = require('./jobRequests.controller');

const router = express.Router();

// ── List + Create + Submit (Phase 6) ─────────────────────────────────
router.get('/',
  authenticate,
  authorizeAny('job_request:read-all', 'job_request:read-own'),
  rowLevelScope('job_request'),
  validate(v.listQuerySchema, 'query'),
  ctrl.list,
);

router.post('/',
  authenticate,
  authorize('job_request:create'),
  validate(v.createSchema, 'body'),
  ctrl.create,
);

router.post('/:id/submit',
  authenticate,
  authorize('job_request:create'),
  validate(v.submitSchema, 'body'),
  ctrl.submit,
);

// ── PHASE 15  ·  BULK VERIFY ALL ────────────────────────────────────
// IMPORTANT: must be registered BEFORE any /:id route — Express would
// otherwise absorb "bulk-verify-all" as the :id param on a GET /:id.

router.post('/bulk-verify-all',
  authenticate,
  authorize('job_request:bulk-verify'),
  ctrl.postBulkVerifyAll,
);

// ── PHASE 7 SLICE 2 ──────────────────────────────────────────────────

// GET /:id → Detail page. Same auth shape as the list endpoint:
// authorizeAny covers the "either-or" perm split, rowLevelScope writes
// req.scope, and the controller passes scope into the service for the
// defence-in-depth ownership check.
router.get('/:id',
  authenticate,
  authorizeAny('job_request:read-all', 'job_request:read-own'),
  rowLevelScope('job_request'),
  ctrl.getDetail,
);

// GET /:id/history → status_history rows for the Timeline component.
router.get('/:id/history',
  authenticate,
  authorizeAny('job_request:read-all', 'job_request:read-own'),
  rowLevelScope('job_request'),
  ctrl.getHistory,
);

// POST /:id/convert — Convert action requires BOTH approve AND assign
// permissions. Chaining `authorize()` twice means a 403 is raised at the
// route layer if either permission is missing; the state machine inside
// the service re-checks the same two as defence in depth (Doctrine 5).
router.post('/:id/convert',
  authenticate,
  authorize('job_request:approve'),
  authorize('job_request:assign-engineer'),
  validate(v.convertSchema, 'body'),
  ctrl.postConvert,
);

// POST /:id/reject — single perm.
router.post('/:id/reject',
  authenticate,
  authorize('job_request:reject'),
  validate(v.rejectSchema, 'body'),
  ctrl.postReject,
);

// ── PHASE 9 ──────────────────────────────────────────────────────────

// PATCH /:id — owner-only edit of a DRAFT body. Permission gate is the
// same as create (`job_request:create`) because the action is "modify
// my own draft". Ownership is enforced in the service. State machine
// will throw 409 ILLEGAL_TRANSITION if the JR is not DRAFT.
router.patch('/:id',
  authenticate,
  authorize('job_request:create'),
  validate(v.editDraftSchema, 'body'),
  ctrl.patchEditDraft,
);

// POST /:id/cancel — owner-only cancel of a DRAFT (logical CANCELLED).
router.post('/:id/cancel',
  authenticate,
  authorize('job_request:create'),
  validate(v.cancelDraftSchema, 'body'),
  ctrl.postCancelDraft,
);

module.exports = router;
