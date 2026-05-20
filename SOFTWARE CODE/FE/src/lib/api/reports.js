// ============================================================================
// src/lib/api/reports.js  —  Reports + Analytics HTTP wrappers
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// Thin axios wrappers. ZERO UI logic — every function returns the raw
// `r.data.data` body so react-query hooks downstream can cache it as-is.
//
// PARAM SHAPE
//   All endpoints accept the same filter object:
//     { dateFrom?, dateTo?, divisionId?, status?, dueSoonDays?,
//       unassigned?, employeeId?, engineerId?, page?, page_size?, months? }
//   We pass it straight through as axios `params`; falsy / undefined
//   values are stripped so the BE Zod schema doesn't reject unknown keys.
//
// PDF DOWNLOADS
//   downloadReportPdf() returns a Blob — caller pipes it to an <a> click
//   to trigger the browser save dialog. The BE handles auth+RBAC; no
//   special headers needed here (the axios instance attaches the
//   Authorization + X-CSRF-Token automatically).
// ============================================================================

import { api } from '../api-client.js';

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Drop keys whose value is null, undefined, '' or NaN. Keeps the query
 * string clean and the BE Zod schema happy.
 */
function clean(params) {
  if (!params) return undefined;
  const out = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '' || Number.isNaN(v)) return;
    out[k] = v;
  });
  return out;
}

/**
 * Trigger a browser download of a Blob with the given filename.
 * Uses createObjectURL + <a> click — works in every supported browser.
 */
function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Free the blob URL on next tick so the click handler has time to consume it.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ── REPORTS — JSON views ───────────────────────────────────────────────

const REPORT_PATHS = {
  calibrationDue:      '/reports/calibration-due',
  pendingJobs:         '/reports/pending-jobs',
  equipmentUtilization:'/reports/equipment-utilization',
  engineerSummary:     '/reports/engineer-summary',
  jobCardSummary:      '/reports/job-card-summary',
  jobRequestSummary:   '/reports/job-request-summary',
};

/**
 * Generic report fetcher. `key` is one of REPORT_PATHS keys.
 */
export async function fetchReport(key, params, signal) {
  const path = REPORT_PATHS[key];
  if (!path) throw new Error(`Unknown report key: ${key}`);
  const r = await api.get(path, { params: clean(params), signal });
  return r.data.data;
}

/**
 * Download the PDF for a given report. Filename comes from the
 * Content-Disposition header (BE sets it) — we still pass a fallback.
 */
export async function downloadReportPdf(key, params) {
  const path = REPORT_PATHS[key];
  if (!path) throw new Error(`Unknown report key: ${key}`);
  const r = await api.get(`${path}/pdf`, {
    params: clean(params),
    responseType: 'blob',
  });
  // Extract filename from Content-Disposition; fall back to key+timestamp.
  const cd = r.headers?.['content-disposition'] || '';
  const match = cd.match(/filename="([^"]+)"/);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = (match && match[1]) || `${key}-${ts}.pdf`;
  triggerBlobDownload(r.data, filename);
  return { filename, bytes: r.data.size || 0 };
}


// ── ANALYTICS — JSON + CSV ─────────────────────────────────────────────

const CHART_PATHS = {
  monthlyActivity:             '/analytics/monthly-activity',
  equipmentStatus:             '/analytics/equipment-status',
  monthlyJobs:                 '/analytics/monthly-jobs',
  divisionWise:                '/analytics/division-wise',
  calibrationCompletion:       '/analytics/calibration-completion',
  jobTypeDistribution:         '/analytics/job-type-distribution',
  engineerWorkload:            '/analytics/engineer-workload',
  calibrationStatusBreakdown:  '/analytics/calibration-status-breakdown',
};

export async function fetchChart(key, params, signal) {
  const path = CHART_PATHS[key];
  if (!path) throw new Error(`Unknown chart key: ${key}`);
  const r = await api.get(path, { params: clean(params), signal });
  return r.data.data;
}

export async function downloadChartCsv(key, params) {
  const path = CHART_PATHS[key];
  if (!path) throw new Error(`Unknown chart key: ${key}`);
  const r = await api.get(`${path}/csv`, {
    params: clean(params),
    responseType: 'blob',
  });
  const cd = r.headers?.['content-disposition'] || '';
  const match = cd.match(/filename="([^"]+)"/);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = (match && match[1]) || `${key}-${ts}.csv`;
  triggerBlobDownload(r.data, filename);
  return { filename };
}

export const REPORT_KEYS = Object.freeze(Object.keys(REPORT_PATHS));
export const CHART_KEYS  = Object.freeze(Object.keys(CHART_PATHS));
