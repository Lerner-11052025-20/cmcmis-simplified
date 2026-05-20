// ============================================================================
// src/modules/reports/reports.controller.js  —  HTTP handlers for 6 reports
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// Doctrine (Phase 6+): thin controllers. Build the actor object from
// req.user; pass validated query params to the service; respond with
// the standard `{ data: ... }` envelope (or stream the PDF). No SQL,
// no business logic.
//
// HTTP ENDPOINTS (mounted in reports.routes.js):
//   JSON view paths return data for the on-screen table + summary tiles.
//   /pdf  paths stream the rendered PDF document.
//
//   GET /api/v1/reports/calibration-due            ← JSON view
//   GET /api/v1/reports/calibration-due/pdf        ← PDF stream
//   GET /api/v1/reports/pending-jobs               ← JSON
//   GET /api/v1/reports/pending-jobs/pdf           ← PDF
//   GET /api/v1/reports/equipment-utilization      ← JSON
//   GET /api/v1/reports/equipment-utilization/pdf  ← PDF
//   GET /api/v1/reports/engineer-summary           ← JSON
//   GET /api/v1/reports/engineer-summary/pdf       ← PDF
//   GET /api/v1/reports/job-card-summary           ← JSON
//   GET /api/v1/reports/job-card-summary/pdf       ← PDF
//   GET /api/v1/reports/job-request-summary        ← JSON
//   GET /api/v1/reports/job-request-summary/pdf    ← PDF
//
// PDF STREAMING NOTE
//   PDFKit emits binary chunks as the document is built. We pipe its
//   readable stream directly into `res`. If the user disconnects, the
//   underlying mysql2 query has already resolved (synchronous service
//   call) — there is no orphan work to clean up.
//
//   For large datasets we explicitly cap PDF export rows at
//   PDF_MAX_ROWS (10_000) to prevent runaway memory. The query layer
//   still uses LIMIT/OFFSET; controllers pre-fetch up to PDF_MAX_ROWS
//   for the PDF render so the table is paginated by the PDF page break
//   logic, not by LIMIT.
// ============================================================================

'use strict';

const service = require('./reports.service');
const pdfRenderer = require('./reports.pdf');

const PDF_MAX_ROWS = 10_000;

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Build the actor object passed into the service. The service uses
 * `permissions` for row-level scope decisions.
 *
 * @param {Express.Request} req
 */
function actorFromReq(req) {
  return {
    employeeId:  req.user?.employeeId,
    fullName:    req.user?.fullName || req.user?.name || req.user?.employeeId || '',
    role:        req.user?.role || '',
    permissions: Array.isArray(req.user?.permissions) ? req.user.permissions : [],
  };
}

/**
 * Common PDF setup — headers, filename, error handling.
 *
 * @param {Express.Response} res
 * @param {string} filenameBase
 */
function preparePdfResponse(res, filenameBase) {
  // Use a date-stamped filename so re-downloads don't collide.
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${filenameBase}-${ts}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
}

// ── R1 — Calibration Due ──────────────────────────────────────────────
async function calibrationDueView(req, res, next) {
  try {
    const result = await service.getCalibrationDue(actorFromReq(req), req.query);
    res.json({ data: result });
  } catch (e) { next(e); }
}

async function calibrationDuePdf(req, res, next) {
  try {
    const params = { ...req.query, page: 1, page_size: PDF_MAX_ROWS };
    const result = await service.getCalibrationDue(actorFromReq(req), params);
    preparePdfResponse(res, 'calibration-due');
    pdfRenderer.renderCalibrationDuePdf(result, res);
  } catch (e) { next(e); }
}

// ── R2 — Pending Jobs ─────────────────────────────────────────────────
async function pendingJobsView(req, res, next) {
  try {
    const result = await service.getPendingJobs(actorFromReq(req), req.query);
    res.json({ data: result });
  } catch (e) { next(e); }
}

async function pendingJobsPdf(req, res, next) {
  try {
    const params = { ...req.query, page: 1, page_size: PDF_MAX_ROWS };
    const result = await service.getPendingJobs(actorFromReq(req), params);
    preparePdfResponse(res, 'pending-jobs');
    pdfRenderer.renderPendingJobsPdf(result, res);
  } catch (e) { next(e); }
}

// ── R3 — Equipment Utilization ────────────────────────────────────────
async function equipmentUtilizationView(req, res, next) {
  try {
    const result = await service.getEquipmentUtilization(actorFromReq(req), req.query);
    res.json({ data: result });
  } catch (e) { next(e); }
}

async function equipmentUtilizationPdf(req, res, next) {
  try {
    const params = { ...req.query, page: 1, page_size: PDF_MAX_ROWS };
    const result = await service.getEquipmentUtilization(actorFromReq(req), params);
    preparePdfResponse(res, 'equipment-utilization');
    pdfRenderer.renderEquipmentUtilizationPdf(result, res);
  } catch (e) { next(e); }
}

// ── R4 — Engineer Summary ─────────────────────────────────────────────
async function engineerSummaryView(req, res, next) {
  try {
    const result = await service.getEngineerSummary(actorFromReq(req), req.query);
    res.json({ data: result });
  } catch (e) { next(e); }
}

async function engineerSummaryPdf(req, res, next) {
  try {
    const params = { ...req.query, page: 1, page_size: PDF_MAX_ROWS };
    const result = await service.getEngineerSummary(actorFromReq(req), params);
    preparePdfResponse(res, 'engineer-summary');
    pdfRenderer.renderEngineerSummaryPdf(result, res);
  } catch (e) { next(e); }
}

// ── R5 — Job Card Summary ─────────────────────────────────────────────
async function jobCardSummaryView(req, res, next) {
  try {
    const result = await service.getJobCardSummary(actorFromReq(req), req.query);
    res.json({ data: result });
  } catch (e) { next(e); }
}

async function jobCardSummaryPdf(req, res, next) {
  try {
    const params = { ...req.query, page: 1, page_size: PDF_MAX_ROWS };
    const result = await service.getJobCardSummary(actorFromReq(req), params);
    preparePdfResponse(res, 'job-card-summary');
    pdfRenderer.renderJobCardSummaryPdf(result, res);
  } catch (e) { next(e); }
}

// ── R6 — Job Request Summary ──────────────────────────────────────────
async function jobRequestSummaryView(req, res, next) {
  try {
    const result = await service.getJobRequestSummary(actorFromReq(req), req.query);
    res.json({ data: result });
  } catch (e) { next(e); }
}

async function jobRequestSummaryPdf(req, res, next) {
  try {
    const params = { ...req.query, page: 1, page_size: PDF_MAX_ROWS };
    const result = await service.getJobRequestSummary(actorFromReq(req), params);
    preparePdfResponse(res, 'job-request-summary');
    pdfRenderer.renderJobRequestSummaryPdf(result, res);
  } catch (e) { next(e); }
}

module.exports = {
  calibrationDueView,        calibrationDuePdf,
  pendingJobsView,           pendingJobsPdf,
  equipmentUtilizationView,  equipmentUtilizationPdf,
  engineerSummaryView,       engineerSummaryPdf,
  jobCardSummaryView,        jobCardSummaryPdf,
  jobRequestSummaryView,     jobRequestSummaryPdf,
};
