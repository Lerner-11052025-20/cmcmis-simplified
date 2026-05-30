// ============================================================================
// src/modules/analytics/analytics.routes.js  —  Chart endpoints
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// Mounted at `${env.API_BASE_PATH}/analytics` (= '/api/v1/analytics').
//
//   GET /monthly-activity                    JSON   reports:view-analytics
//   GET /monthly-activity/csv                CSV    reports:view-analytics + export
//   GET /equipment-status                    JSON   reports:view-analytics
//   GET /equipment-status/csv                CSV    + export
//   GET /monthly-jobs                        JSON
//   GET /monthly-jobs/csv                    CSV
//   GET /division-wise                       JSON
//   GET /division-wise/csv                   CSV
//   GET /calibration-completion              JSON
//   GET /calibration-completion/csv          CSV
//   GET /job-type-distribution               JSON
//   GET /job-type-distribution/csv           CSV
//   GET /engineer-workload                   JSON
//   GET /engineer-workload/csv               CSV
//   GET /calibration-status-breakdown        JSON
//   GET /calibration-status-breakdown/csv    CSV
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const { authorizeAny } = require('../../middleware/authorize');
const validate     = require('../../middleware/validate');
const { errors }   = require('../../middleware/errorHandler');

const { commonChartQuery } = require('./analytics.validators');
const ctrl = require('./analytics.controller');

const router = express.Router();

// PHASE 11 SLICE 2 — accept either permission so the same chart endpoints
// power BOTH the Reports-page chart grid (Phase 10) AND the new standalone
// /analytics dashboard (Phase 11 Slice 2). Either gate unlocks the read.
const VIEW_PERMS = ['analytics:view', 'reports:view-analytics'];

// CSV download requires the export permission ON TOP of one of the view
// permissions. We can't use authorizeAny alone (would let a user with just
// reports:export through). So we layer authorizeAny(viewPerms) → requireExport.
function requireExport() {
  return function gate(req, _res, next) {
    if (!req.user || !Array.isArray(req.user.permissions)) {
      return next(errors.unauthorized('Authentication required'));
    }
    const owned = new Set(req.user.permissions);
    if (!owned.has('reports:export')) {
      return next(errors.forbidden('Missing required permission: reports:export'));
    }
    next();
  };
}

// Each chart is registered with a JSON GET and a CSV GET.
function register(path, jsonHandler, csvHandler) {
  router.get(path,
    authenticate,
    authorizeAny(...VIEW_PERMS),
    validate(commonChartQuery, 'query'),
    jsonHandler,
  );
  router.get(`${path}/csv`,
    authenticate,
    authorizeAny(...VIEW_PERMS),
    requireExport(),
    validate(commonChartQuery, 'query'),
    csvHandler,
  );
}

// ── G1..G8 ─────────────────────────────────────────────────────────────
register('/monthly-activity',             ctrl.monthlyActivity,             ctrl.monthlyActivityCsv);
register('/equipment-status',             ctrl.equipmentStatus,             ctrl.equipmentStatusCsv);
register('/monthly-jobs',                 ctrl.monthlyJobs,                 ctrl.monthlyJobsCsv);
register('/division-wise',                ctrl.divisionWise,                ctrl.divisionWiseCsv);
register('/calibration-completion',       ctrl.calibrationCompletion,       ctrl.calibrationCompletionCsv);
register('/job-type-distribution',        ctrl.jobTypeDistribution,         ctrl.jobTypeDistributionCsv);
register('/engineer-workload',            ctrl.engineerWorkload,            ctrl.engineerWorkloadCsv);
register('/calibration-status-breakdown', ctrl.calibrationStatusBreakdown,  ctrl.calibrationStatusBreakdownCsv);

// ── G9..G12 (Phase 11 Slice 3) ─────────────────────────────────────────
register('/weekly-activity',              ctrl.weeklyActivity,              ctrl.weeklyActivityCsv);
register('/jc-lifecycle-funnel',          ctrl.jcLifecycleFunnel,           ctrl.jcLifecycleFunnelCsv);
register('/equipment-registration-trend', ctrl.equipmentRegistrationTrend,  ctrl.equipmentRegistrationTrendCsv);
register('/priority-mix-trend',           ctrl.priorityMixTrend,            ctrl.priorityMixTrendCsv);

// ── Lab Capacity & Heatmaps (Phase 16) ──────────────────────────────────
router.get('/lab-capacity',
  authenticate,
  authorizeAny(...VIEW_PERMS),
  ctrl.labCapacity,
);

module.exports = router;

