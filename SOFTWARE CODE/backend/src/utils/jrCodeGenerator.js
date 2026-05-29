// ============================================================================
// src/utils/jrCodeGenerator.js  —  request_code / card_code formatters
// ----------------------------------------------------------------------------
// PURPOSE
//   The screens display "JR-2026-1234" and "JC-2026-1234". The DB only
//   stores the INT id (JR_JOBREQUESTNO / JM_JobCardNO) and a year-bearing
//   timestamp (JR_JOBREQUESTDATE / JM_JCRecdDate). This file is the SINGLE
//   place that knows the display format.
//
// DECISION (SCHEMA_PHASE6.md §1, P6-D3 + P6-D4):
//   We do NOT persist these display codes in their own columns. Instead we
//   format them on-the-fly from (year, id). Saves an ALTER + avoids storing
//   derived data that could drift if the date is ever corrected.
//
// FORMAT
//   JR-{YYYY}-{NNNN}    YYYY from the timestamp, NNNN = id zero-padded to 4
//                       Example: id=1234, ts=2026-04-14  →  JR-2026-1234
//                       Example: id=42,   ts=2026-01-02  →  JR-2026-0042
//
// IMPLEMENTATION NOTES
//   • Padding to 4 only — beyond 9999 the display will overflow (JR-YYYY-12345).
//     That's a Phase-8 problem; legacy data has 4-digit max ids.
//   • If the timestamp is null (legacy rows), we fall back to the current
//     year — better than rendering "JR-undefined-1234". Callers are
//     expected to pass non-null dates, this is purely defensive.
// ============================================================================

'use strict';

/**
 * Format a Job Request display code.
 *
 * @param {number} jobRequestNo       cmms_jobrequest_mst.JR_JOBREQUESTNO
 * @param {Date|string|null} dateOrYear  JR_JOBREQUESTDATE (or already a year number)
 * @returns {string}                  e.g. "JR-2026-1234"
 */
function formatJrCode(jobRequestNo, dateOrYear) {
  const year = extractYear(dateOrYear);
  const padded = String(jobRequestNo).padStart(4, '0');
  return `JR-${year}-${padded}`;
}

/**
 * Format a Job Card display code.
 *
 * @param {number} jobCardNo          cmms_jobcard_mst.JM_JobCardNO
 * @param {Date|string|null} dateOrYear  JM_JCRecdDate (or already a year number)
 * @returns {string}                  e.g. "JC-2026-0063"
 */
function formatJcCode(jobCardNo, dateOrYear) {
  const year = extractYear(dateOrYear);
  const padded = String(jobCardNo).padStart(4, '0');
  return `JC-${year}-${padded}`;
}

/**
 * Internal: pull a 4-digit year out of a JS Date, an ISO string, a year
 * number, or null (→ today's year).
 */
function extractYear(v) {
  if (v == null) return new Date().getUTCFullYear();
  if (typeof v === 'number') return v;                // already a year
  if (v instanceof Date) return v.getUTCFullYear();
  // Try parsing the leading 4 chars of an ISO date — cheaper than Date().
  if (typeof v === 'string' && /^\d{4}/.test(v)) return parseInt(v.slice(0, 4), 10);
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? new Date().getUTCFullYear()
    : d.getUTCFullYear();
}

module.exports = { formatJrCode, formatJcCode };
