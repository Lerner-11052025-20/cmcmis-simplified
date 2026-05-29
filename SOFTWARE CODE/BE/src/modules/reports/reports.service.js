// ============================================================================
// src/modules/reports/reports.service.js  —  Report payload assembly
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// Owns three responsibilities:
//   1. Decide row-level scope (canReadAll vs ownerEmployeeId) from the
//      actor's permissions — Normal users see only their own JR rows.
//   2. Fire the repo's `list*` + `summary*` pair in parallel; assemble
//      a single JSON payload shaped for both the on-screen table and
//      the PDF generator (they share the data).
//   3. Stamp meta fields the PDF header needs (report_id, generated_on,
//      generated_by, filter echo).
//
// NO CACHE here. Reports are real-time per Phase-10 §1.E. The query is
// already paginated and the indexes are tuned for sub-200ms cold reads.
// ============================================================================

'use strict';

const repo = require('./reports.repo');

// ── Row-level scope resolver ───────────────────────────────────────────
// Mirrors the Phase-6 row-level-scope middleware logic without pulling
// the middleware in (cleaner DI). Normal users — who don't hold
// job_request:read-all — are restricted to their own JRs.
function resolveRowScope(actor) {
  if (!actor || !Array.isArray(actor.permissions)) {
    return { canReadAll: false, ownerEmployeeId: actor?.employeeId || '' };
  }
  const canReadAll = actor.permissions.includes('job_request:read-all');
  return { canReadAll, ownerEmployeeId: actor.employeeId };
}

// ── Common meta stamper ────────────────────────────────────────────────
// Every report ships with the same meta object so the PDF header layout
// is shared between all six.
function buildMeta(reportId, reportTitle, actor, params) {
  return {
    report_id:     reportId,                            // e.g. 'R1-CAL-DUE'
    report_title:  reportTitle,                         // human title
    generated_on:  new Date().toISOString(),
    generated_by: {
      employee_id: actor?.employeeId || '',
      name:        actor?.fullName   || actor?.employeeId || '',
      role:        actor?.role       || '',
    },
    // Echo the applied filters so the PDF caption mirrors the on-screen state.
    filters: {
      date_from:    params.dateFrom    || null,
      date_to:      params.dateTo      || null,
      division_id:  params.divisionId  || null,
      status:       params.status      || null,
      // Per-report-specific filters that get included transparently when present.
      due_soon_days: params.dueSoonDays !== undefined ? params.dueSoonDays : null,
      unassigned:    params.unassigned !== undefined ? params.unassigned   : null,
      employee_id:   params.employeeId  || null,
      engineer_id:   params.engineerId  || null,
    },
    page:      params.page,
    page_size: params.page_size,
  };
}


// ────────────────────────────────────────────────────────────────────
//  R1 — CALIBRATION DUE
// ────────────────────────────────────────────────────────────────────
async function getCalibrationDue(actor, params) {
  const [list, summary] = await Promise.all([
    repo.listCalibrationDue(params),
    repo.summaryCalibrationDue(params),
  ]);
  return {
    meta:    buildMeta('R1-CAL-DUE', 'Calibration Due Report', actor, params),
    summary,                                                  // { total, overdue, due_soon, valid }
    rows:    list.rows,
    total:   list.total,
  };
}

// ────────────────────────────────────────────────────────────────────
//  R2 — PENDING JOBS
// ────────────────────────────────────────────────────────────────────
async function getPendingJobs(actor, params) {
  const scope = resolveRowScope(actor);
  const [list, summary] = await Promise.all([
    repo.listPendingJobs(params, scope),
    repo.summaryPendingJobs(params, scope),
  ]);
  return {
    meta:    buildMeta('R2-PEND-JOBS', 'Pending Jobs Report', actor, params),
    summary,
    rows:    list.rows,
    total:   list.total,
  };
}

// ────────────────────────────────────────────────────────────────────
//  R3 — EQUIPMENT UTILIZATION
// ────────────────────────────────────────────────────────────────────
async function getEquipmentUtilization(actor, params) {
  const [list, summary] = await Promise.all([
    repo.listEquipmentUtilization(params),
    repo.summaryEquipmentUtilization(params),
  ]);
  return {
    meta:    buildMeta('R3-EQP-UTIL', 'Equipment Utilization Report', actor, params),
    summary,
    rows:    list.rows,
    total:   list.total,
  };
}

// ────────────────────────────────────────────────────────────────────
//  R4 — ENGINEER SUMMARY
// ────────────────────────────────────────────────────────────────────
async function getEngineerSummary(actor, params) {
  // Lab Engineers (who hold reports:view-engineer-summary but not the
  // job_card:read-list permission for the org? — actually they do hold it)
  // see their own row only when they pass employeeId. The endpoint is
  // already permission-gated; we do not auto-narrow here. If a future
  // policy requires self-only, set:
  //   const isLabEngineer = (actor.role === 'LAB_ENGINEER');
  //   if (isLabEngineer && !params.employeeId) params.employeeId = actor.employeeId;
  // For now, full read for any holder of the permission (matches Phase 8
  // dashboard pattern — RBAC alone is the gate).
  const [list, summary] = await Promise.all([
    repo.listEngineerSummary(params),
    repo.summaryEngineerSummary(params),
  ]);
  return {
    meta:    buildMeta('R4-ENG-SUM', 'Engineer Summary Report', actor, params),
    summary,
    rows:    list.rows,
    total:   list.total,
  };
}

// ────────────────────────────────────────────────────────────────────
//  R5 — JOB CARD SUMMARY
// ────────────────────────────────────────────────────────────────────
async function getJobCardSummary(actor, params) {
  const [list, summary] = await Promise.all([
    repo.listJobCardSummary(params),
    repo.summaryJobCardSummary(params),
  ]);
  return {
    meta:    buildMeta('R5-JC-SUM', 'Job Card Summary Report', actor, params),
    summary,
    rows:    list.rows,
    total:   list.total,
  };
}

// ────────────────────────────────────────────────────────────────────
//  R6 — JOB REQUEST SUMMARY
// ────────────────────────────────────────────────────────────────────
async function getJobRequestSummary(actor, params) {
  const scope = resolveRowScope(actor);
  const [list, summary] = await Promise.all([
    repo.listJobRequestSummary(params, scope),
    repo.summaryJobRequestSummary(params, scope),
  ]);
  return {
    meta:    buildMeta('R6-JR-SUM', 'Job Request Summary Report', actor, params),
    summary,
    rows:    list.rows,
    total:   list.total,
  };
}

module.exports = {
  getCalibrationDue,
  getPendingJobs,
  getEquipmentUtilization,
  getEngineerSummary,
  getJobCardSummary,
  getJobRequestSummary,
  // exposed for unit testing.
  resolveRowScope,
  buildMeta,
};
