// ============================================================================
// src/modules/analytics/analytics.service.js  —  Chart payloads + CSV serialiser
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// Thin pass-through over the analytics repo for JSON chart data. The
// CSV serialiser turns the same data into a workbook-friendly string
// per the spec ("CSV by default, Excel for tabular datasets").
//
// We hand-roll the CSV (no SheetJS dep) because:
//   • The datasets are small (<= 24 months, <= 10 rows for engineer workload).
//   • Excel opens CSV natively, including UTF-8 BOM.
//   • Keeps the BE dep surface tight.
// ============================================================================

'use strict';

const repo = require('./analytics.repo');

// ── Public chart fetchers ──────────────────────────────────────────────
async function getMonthlyActivityTrends(params) { return repo.monthlyActivityTrends(params); }
async function getEquipmentStatus(params)       { return repo.equipmentStatusDistribution(params); }
async function getMonthlyJobTrends(params)      { return repo.monthlyJobTrends(params); }
async function getDivisionWise(params)          { return repo.divisionWiseJobs(params); }
async function getCalibrationCompletion(params) { return repo.calibrationCompletionTrend(params); }
async function getJobTypeDistribution(params)   { return repo.jobTypeDistribution(params); }
async function getEngineerWorkload(params)      { return repo.engineerWorkload(params); }
async function getCalibrationStatusBreakdown(params) { return repo.calibrationStatusBreakdown(params); }

// Phase 11 Slice 3 — new chart endpoints (G9..G12)
async function getWeeklyActivityTrend(params)        { return repo.weeklyActivityTrend(params); }
async function getJcLifecycleFunnel(params)          { return repo.jcLifecycleFunnel(params); }
async function getEquipmentRegistrationTrend(params) { return repo.equipmentRegistrationTrend(params); }
async function getPriorityMixTrend(params)           { return repo.priorityMixTrend(params); }


// ── CSV helpers ────────────────────────────────────────────────────────

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Serialise an array-of-objects into a CSV string with header row.
 * Prepends a UTF-8 BOM so Excel opens the file with the right encoding
 * out of the gate.
 *
 * @param {string[]} columns  Ordered list of object keys → column headers.
 * @param {object[]} rows
 * @param {string[]} [headers] Optional custom header labels (defaults to keys).
 * @returns {string}
 */
function toCsv(columns, rows, headers) {
  const head = (headers && headers.length === columns.length ? headers : columns)
    .map(csvEscape).join(',');
  const body = rows.map((r) =>
    columns.map((c) => csvEscape(r[c])).join(',')
  ).join('\r\n');
  return '﻿' + head + '\r\n' + body + '\r\n';
}

// ── Per-chart CSV serialisers ──────────────────────────────────────────

function csvMonthlyActivityTrends(rows) {
  return toCsv(
    ['month', 'calibrations', 'repairs'], rows,
    ['Month', 'Calibrations', 'Repairs'],
  );
}
function csvEquipmentStatus(rows) {
  return toCsv(['status', 'count'], rows, ['Equipment Status', 'Count']);
}
function csvMonthlyJobTrends(rows) {
  return toCsv(
    ['month', 'completed', 'pending'], rows,
    ['Month', 'Completed', 'Pending'],
  );
}
function csvDivisionWise(rows) {
  return toCsv(
    ['division', 'division_id', 'count'], rows,
    ['Division', 'Division ID', 'Count'],
  );
}
function csvCalibrationCompletion(rows) {
  return toCsv(
    ['month', 'on_time', 'delayed'], rows,
    ['Month', 'On Time', 'Delayed'],
  );
}
function csvJobTypeDistribution(rows) {
  return toCsv(['job_type', 'count'], rows, ['Job Type', 'Count']);
}
function csvEngineerWorkload(rows) {
  return toCsv(
    ['engineer_employee_id', 'engineer_name', 'open_load', 'done'], rows,
    ['Engineer ID', 'Engineer Name', 'Open Load', 'Done'],
  );
}
function csvCalibrationStatusBreakdown(rows) {
  return toCsv(['band', 'count'], rows, ['Calibration Band', 'Count']);
}

// ── G9..G12 CSV serialisers (Phase 11 Slice 3) ─────────────────────────
function csvWeeklyActivityTrend(rows) {
  return toCsv(['week', 'calibrations', 'repairs'], rows,
               ['ISO Week', 'Calibrations', 'Repairs']);
}
function csvJcLifecycleFunnel(rows) {
  return toCsv(['stage', 'count'], rows, ['Lifecycle Stage', 'Count']);
}
function csvEquipmentRegistrationTrend(rows) {
  return toCsv(['month', 'registered'], rows, ['Month', 'Equipment Registered']);
}
function csvPriorityMixTrend(rows) {
  return toCsv(['month', 'low', 'medium', 'high'], rows,
               ['Month', 'Low', 'Medium', 'High']);
}

module.exports = {
  // JSON — G1..G8
  getMonthlyActivityTrends,
  getEquipmentStatus,
  getMonthlyJobTrends,
  getDivisionWise,
  getCalibrationCompletion,
  getJobTypeDistribution,
  getEngineerWorkload,
  getCalibrationStatusBreakdown,
  // JSON — G9..G12 (Phase 11 Slice 3)
  getWeeklyActivityTrend,
  getJcLifecycleFunnel,
  getEquipmentRegistrationTrend,
  getPriorityMixTrend,
  // CSV — G1..G8
  csvMonthlyActivityTrends,
  csvEquipmentStatus,
  csvMonthlyJobTrends,
  csvDivisionWise,
  csvCalibrationCompletion,
  csvJobTypeDistribution,
  csvEngineerWorkload,
  csvCalibrationStatusBreakdown,
  // CSV — G9..G12
  csvWeeklyActivityTrend,
  csvJcLifecycleFunnel,
  csvEquipmentRegistrationTrend,
  csvPriorityMixTrend,
};
