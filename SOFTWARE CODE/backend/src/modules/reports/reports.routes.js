// ============================================================================
// src/modules/reports/reports.routes.js  —  URL wiring for 6 reports
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// Mounted at `${env.API_BASE_PATH}/reports` (= '/api/v1/reports').
//
// PIPELINE
//   route → authenticate → authorize(view-perm) → validate(query) → ctrl.view
//   route → authenticate → authorizeAny(view-perm, export) → validate(query) → ctrl.pdf
//
// We use authorizeAny for /pdf endpoints because BOTH permissions must
// hold: the view-permission gates which report the caller may see, AND
// the export permission gates downloading. We enforce that via a custom
// inline guard so the failure mode is explicit. (Single-permission
// authorize wouldn't combine the two cleanly.)
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const validate     = require('../../middleware/validate');
const { errors }   = require('../../middleware/errorHandler');

const v   = require('./reports.validators');
const ctrl = require('./reports.controller');

const router = express.Router();

// ── Composite gate: view-perm AND export-perm ──────────────────────────
// Factory that builds an Express middleware enforcing BOTH permissions
// in sequence. We do not use authorizeAny here because the semantics are
// "must have view AND export"; authorizeAny is OR semantics.
function requireBoth(viewPerm, exportPerm) {
  return function compositeGate(req, _res, next) {
    if (!req.user || !Array.isArray(req.user.permissions)) {
      return next(errors.unauthorized('Authentication required'));
    }
    const owned = new Set(req.user.permissions);
    if (!owned.has(viewPerm)) {
      req.log?.warn?.({ permission: viewPerm, employeeId: req.user.employeeId },
        'Reports: view permission denied');
      return next(errors.forbidden(`Missing required permission: ${viewPerm}`));
    }
    if (!owned.has(exportPerm)) {
      req.log?.warn?.({ permission: exportPerm, employeeId: req.user.employeeId },
        'Reports: export permission denied');
      return next(errors.forbidden(`Missing required permission: ${exportPerm}`));
    }
    return next();
  };
}

// ── R1 — Calibration Due ──────────────────────────────────────────────
router.get('/calibration-due',
  authenticate,
  authorize('reports:view-calibration-due'),
  validate(v.calibrationDueQuerySchema, 'query'),
  ctrl.calibrationDueView,
);
router.get('/calibration-due/pdf',
  authenticate,
  requireBoth('reports:view-calibration-due', 'reports:export'),
  validate(v.calibrationDueQuerySchema, 'query'),
  ctrl.calibrationDuePdf,
);

// ── R2 — Pending Jobs ─────────────────────────────────────────────────
router.get('/pending-jobs',
  authenticate,
  authorize('reports:view-pending-jobs'),
  validate(v.pendingJobsQuerySchema, 'query'),
  ctrl.pendingJobsView,
);
router.get('/pending-jobs/pdf',
  authenticate,
  requireBoth('reports:view-pending-jobs', 'reports:export'),
  validate(v.pendingJobsQuerySchema, 'query'),
  ctrl.pendingJobsPdf,
);

// ── R3 — Equipment Utilization ────────────────────────────────────────
router.get('/equipment-utilization',
  authenticate,
  authorize('reports:view-equipment-utilization'),
  validate(v.equipmentUtilizationQuerySchema, 'query'),
  ctrl.equipmentUtilizationView,
);
router.get('/equipment-utilization/pdf',
  authenticate,
  requireBoth('reports:view-equipment-utilization', 'reports:export'),
  validate(v.equipmentUtilizationQuerySchema, 'query'),
  ctrl.equipmentUtilizationPdf,
);

// ── R4 — Engineer Summary ─────────────────────────────────────────────
router.get('/engineer-summary',
  authenticate,
  authorize('reports:view-engineer-summary'),
  validate(v.engineerSummaryQuerySchema, 'query'),
  ctrl.engineerSummaryView,
);
router.get('/engineer-summary/pdf',
  authenticate,
  requireBoth('reports:view-engineer-summary', 'reports:export'),
  validate(v.engineerSummaryQuerySchema, 'query'),
  ctrl.engineerSummaryPdf,
);

// ── R5 — Job Card Summary ─────────────────────────────────────────────
router.get('/job-card-summary',
  authenticate,
  authorize('reports:view-job-card-summary'),
  validate(v.jobCardSummaryQuerySchema, 'query'),
  ctrl.jobCardSummaryView,
);
router.get('/job-card-summary/pdf',
  authenticate,
  requireBoth('reports:view-job-card-summary', 'reports:export'),
  validate(v.jobCardSummaryQuerySchema, 'query'),
  ctrl.jobCardSummaryPdf,
);

// ── R6 — Job Request Summary ──────────────────────────────────────────
router.get('/job-request-summary',
  authenticate,
  authorize('reports:view-job-request-summary'),
  validate(v.jobRequestSummaryQuerySchema, 'query'),
  ctrl.jobRequestSummaryView,
);
router.get('/job-request-summary/pdf',
  authenticate,
  requireBoth('reports:view-job-request-summary', 'reports:export'),
  validate(v.jobRequestSummaryQuerySchema, 'query'),
  ctrl.jobRequestSummaryPdf,
);

module.exports = router;
