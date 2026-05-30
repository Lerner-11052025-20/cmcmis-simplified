// ============================================================================
// src/modules/analytics/analytics.controller.js  —  HTTP handlers for charts
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// Each chart has TWO endpoints:
//   GET /api/v1/analytics/<chart>          ← JSON dataset
//   GET /api/v1/analytics/<chart>/csv      ← CSV download (text/csv)
//
// CSV download semantics:
//   • Content-Type: text/csv; charset=utf-8
//   • Content-Disposition: attachment; filename="<chart>-<ts>.csv"
//   • Cache-Control: no-store (always fresh)
//   • Body begins with a UTF-8 BOM so Excel opens it correctly.
// ============================================================================

'use strict';

const svc = require('./analytics.service');

function csvHeaders(res, filenameBase) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}-${ts}.csv"`);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
}

// Factory to reduce per-chart boilerplate. Builds a (json, csv) controller pair.
function makeChartHandlers(jsonName, fetchFn, csvBaseName, csvSerialiser) {
  async function json(req, res, next) {
    try {
      const data = await fetchFn(req.query);
      res.json({ data });
    } catch (e) { next(e); }
  }
  async function csv(req, res, next) {
    try {
      const rows = await fetchFn(req.query);
      csvHeaders(res, csvBaseName);
      res.send(csvSerialiser(rows));
    } catch (e) { next(e); }
  }
  return { [jsonName]: json, [`${jsonName}Csv`]: csv };
}

// ── Per-chart handler pairs ────────────────────────────────────────────
const monthlyActivityHandlers       = makeChartHandlers('monthlyActivity',
  svc.getMonthlyActivityTrends, 'monthly-activity-trends', svc.csvMonthlyActivityTrends);

const equipmentStatusHandlers       = makeChartHandlers('equipmentStatus',
  svc.getEquipmentStatus, 'equipment-status', svc.csvEquipmentStatus);

const monthlyJobsHandlers           = makeChartHandlers('monthlyJobs',
  svc.getMonthlyJobTrends, 'monthly-job-trends', svc.csvMonthlyJobTrends);

const divisionWiseHandlers          = makeChartHandlers('divisionWise',
  svc.getDivisionWise, 'division-wise-jobs', svc.csvDivisionWise);

const calibrationCompletionHandlers = makeChartHandlers('calibrationCompletion',
  svc.getCalibrationCompletion, 'calibration-completion', svc.csvCalibrationCompletion);

const jobTypeDistributionHandlers   = makeChartHandlers('jobTypeDistribution',
  svc.getJobTypeDistribution, 'job-type-distribution', svc.csvJobTypeDistribution);

const engineerWorkloadHandlers      = makeChartHandlers('engineerWorkload',
  svc.getEngineerWorkload, 'engineer-workload', svc.csvEngineerWorkload);

const calibrationStatusHandlers     = makeChartHandlers('calibrationStatusBreakdown',
  svc.getCalibrationStatusBreakdown, 'calibration-status-breakdown', svc.csvCalibrationStatusBreakdown);

// Phase 11 Slice 3 — additional chart handlers (G9..G12)
const weeklyActivityHandlers        = makeChartHandlers('weeklyActivity',
  svc.getWeeklyActivityTrend, 'weekly-activity-trend', svc.csvWeeklyActivityTrend);

const jcLifecycleFunnelHandlers     = makeChartHandlers('jcLifecycleFunnel',
  svc.getJcLifecycleFunnel, 'jc-lifecycle-funnel', svc.csvJcLifecycleFunnel);

const equipmentRegistrationHandlers = makeChartHandlers('equipmentRegistrationTrend',
  svc.getEquipmentRegistrationTrend, 'equipment-registration-trend', svc.csvEquipmentRegistrationTrend);

const priorityMixHandlers           = makeChartHandlers('priorityMixTrend',
  svc.getPriorityMixTrend, 'priority-mix-trend', svc.csvPriorityMixTrend);

async function labCapacity(req, res, next) {
  try {
    const data = await svc.getLabCapacity();
    return res.json({ data });
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  ...monthlyActivityHandlers,
  ...equipmentStatusHandlers,
  ...monthlyJobsHandlers,
  ...divisionWiseHandlers,
  ...calibrationCompletionHandlers,
  ...jobTypeDistributionHandlers,
  ...engineerWorkloadHandlers,
  ...calibrationStatusHandlers,
  // Phase 11 Slice 3
  ...weeklyActivityHandlers,
  ...jcLifecycleFunnelHandlers,
  ...equipmentRegistrationHandlers,
  ...priorityMixHandlers,
  // Lab Capacity
  labCapacity,
};

