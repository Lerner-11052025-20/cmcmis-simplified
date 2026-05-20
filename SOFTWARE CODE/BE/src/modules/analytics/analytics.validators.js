// ============================================================================
// src/modules/analytics/analytics.validators.js  —  Zod schemas for chart APIs
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// Each analytics endpoint accepts:
//   ?months=<int>          (chart window in months, default 6, max 24)
//   ?divisionId=<int>      (optional cmms_section_mst.SM_ID filter)
//   ?dateFrom / dateTo     (optional explicit window — when present,
//                            overrides `months`)
// ============================================================================

'use strict';

const { z } = require('zod');

const positiveInt = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? Number(v) : v))
  .refine((n) => Number.isInteger(n) && n > 0, 'Must be a positive integer');

const months = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === undefined ? 6 : typeof v === 'string' ? Number(v) : v))
  .refine((n) => Number.isInteger(n) && n >= 1 && n <= 24, 'months must be 1..24');

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .optional();

const commonChartQuery = z.object({
  months,
  divisionId: positiveInt.optional(),
  dateFrom:   dateString,
  dateTo:     dateString,
}).strict();

module.exports = {
  commonChartQuery,
};
