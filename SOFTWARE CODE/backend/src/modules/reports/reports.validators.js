// ============================================================================
// src/modules/reports/reports.validators.js  —  Zod schemas for filter params
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// Every report endpoint accepts a small, whitelisted set of filter query
// params. Unknown params are REJECTED (z.object().strict()) so that:
//   1. A typo in the FE never silently changes the result set.
//   2. We never grow an undocumented surface area by accident.
//
// FILTERS (per attached Reports panel):
//
//   ?dateFrom=YYYY-MM-DD     (optional, inclusive lower bound)
//   ?dateTo=YYYY-MM-DD       (optional, inclusive upper bound)
//   ?divisionId=<int>        (optional, FK to cmms_section_mst.SM_ID)
//   ?status=<enum>           (optional, per-report enum subset)
//   ?page=<int>              (optional, default 1, used by paginated views)
//   ?page_size=<int>         (optional, default 50, capped at 500)
//   ?include_legacy=<0|1>    (optional, legacy rows toggle — default 0 EXCEPT
//                             for the calibration-due report which legitimately
//                             needs to surface every active piece of hardware)
//
// All status enums are repo-private legacy enum strings. The repo layer
// (reports.repo.js) is the only place that knows the column mapping;
// validators just enforce membership.
// ============================================================================

'use strict';

const { z } = require('zod');

// ── Common atoms ───────────────────────────────────────────────────────

/**
 * ISO date string (YYYY-MM-DD) — no time component. Reports filter on
 * inclusive whole-day windows; dayjs on the FE always sends this shape.
 */
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .optional();

/**
 * 1..2_000_000_000 positive int. divisionId is a SM_ID (SMALLINT in
 * legacy DB); status text divisions and free-form keywords are rejected.
 */
const positiveInt = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? Number(v) : v))
  .refine((n) => Number.isInteger(n) && n > 0, 'Must be a positive integer');

const page = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === undefined ? 1 : typeof v === 'string' ? Number(v) : v))
  .refine((n) => Number.isInteger(n) && n >= 1, 'page must be >= 1');

const pageSize = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === undefined ? 50 : typeof v === 'string' ? Number(v) : v))
  .refine((n) => Number.isInteger(n) && n >= 1 && n <= 500, 'page_size must be 1..500');

const boolFlag = z
  .union([z.literal('0'), z.literal('1'), z.literal(0), z.literal(1)])
  .optional()
  .transform((v) => v === '1' || v === 1);

// ── Enum allow-lists per report ────────────────────────────────────────
// EQM_MVP_STATUS legacy enum — full set surfaced for filter UI.
const EQM_STATUS = [
  'PENDING_VERIFICATION', 'ACTIVE', 'UNDER_CALIBRATION', 'UNDER_REPAIR',
  'OUT_OF_TOLERANCE', 'QUARANTINED', 'CONDEMNED', 'RETIRED',
];

// Calibration Due "calibration status" derived enum — VALID/DUE_SOON/OVERDUE.
const CAL_STATUS = ['VALID', 'DUE_SOON', 'OVERDUE'];

// JR_MVP_STATUS legacy enum (without DRAFT for Pending Jobs report).
const JR_STATUS_PENDING = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'];
const JR_STATUS_ANY     = ['DRAFT', 'SUBMITTED', 'ASSIGNED', 'IN_PROGRESS',
                           'COMPLETED', 'VERIFIED_CLOSED', 'REJECTED', 'REOPENED'];

// JM_MVP_STATUS legacy enum.
const JC_STATUS = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED_CLOSED', 'REOPENED'];


// ── Report 1 — CALIBRATION DUE ─────────────────────────────────────────
//
// Status filter accepts the *derived* calibration status (VALID/DUE_SOON/
// OVERDUE), NOT EQM_MVP_STATUS. The service computes the band; an extra
// EQM_MVP_STATUS filter is intentionally NOT exposed here — the report
// already restricts to ACTIVE equipment by definition.
const calibrationDueQuerySchema = z.object({
  dateFrom:        dateString,
  dateTo:          dateString,
  divisionId:      positiveInt.optional(),
  status:          z.enum(CAL_STATUS).optional(),
  // Admin-tunable "Due Soon" threshold in days. Default 30 (per PDF).
  dueSoonDays:     z.union([z.string(), z.number()]).optional()
                    .transform((v) => (v === undefined ? 30 : typeof v === 'string' ? Number(v) : v))
                    .refine((n) => Number.isInteger(n) && n >= 1 && n <= 365, 'dueSoonDays must be 1..365'),
  page, page_size: pageSize,
}).strict();


// ── Report 2 — PENDING JOBS ────────────────────────────────────────────
//
// dateFrom/dateTo filter by JR_CREATED_AT (= submitted date). Status is
// optional — when blank, the repo restricts to "not completed/closed"
// (per PDF business rule).
const pendingJobsQuerySchema = z.object({
  dateFrom:    dateString,
  dateTo:      dateString,
  divisionId:  positiveInt.optional(),
  status:      z.enum(JR_STATUS_PENDING).optional(),
  // Unassigned filter — checkbox on the FE. When 1, restrict to rows where
  // JR_ASSIGNED_ENGINEER IS NULL OR ''.
  unassigned:  boolFlag,
  page, page_size: pageSize,
}).strict();


// ── Report 3 — EQUIPMENT UTILIZATION ───────────────────────────────────
//
// Date range filters the JC count subquery (only JCs in window count).
const equipmentUtilizationQuerySchema = z.object({
  dateFrom:   dateString,
  dateTo:     dateString,
  divisionId: positiveInt.optional(),
  status:     z.enum(EQM_STATUS).optional(),
  page, page_size: pageSize,
}).strict();


// ── Report 4 — ENGINEER SUMMARY ────────────────────────────────────────
//
// Date range filters JM_JCRecdDate. Per-row aggregation is by
// JM_ASSIGNED_ENGINEER. Division filter is via the JC's parent equipment.
const engineerSummaryQuerySchema = z.object({
  dateFrom:   dateString,
  dateTo:     dateString,
  divisionId: positiveInt.optional(),
  // Optional employeeId for "show me MY engineer summary only" (used by
  // Lab Engineers gated to their own row). Free-form 5-7 chars to match
  // the legacy varchar(7) shape.
  employeeId: z.string().trim().min(1).max(7).optional(),
  page, page_size: pageSize,
}).strict();


// ── Report 5 — JOB CARD SUMMARY (designed) ─────────────────────────────
const jobCardSummaryQuerySchema = z.object({
  dateFrom:   dateString,
  dateTo:     dateString,
  divisionId: positiveInt.optional(),
  status:     z.enum(JC_STATUS).optional(),
  // Optional engineer scope — varchar(7) employee_id.
  engineerId: z.string().trim().min(1).max(7).optional(),
  page, page_size: pageSize,
}).strict();


// ── Report 6 — JOB REQUEST SUMMARY (designed) ──────────────────────────
const jobRequestSummaryQuerySchema = z.object({
  dateFrom:   dateString,
  dateTo:     dateString,
  divisionId: positiveInt.optional(),
  status:     z.enum(JR_STATUS_ANY).optional(),
  page, page_size: pageSize,
}).strict();


module.exports = {
  // Allow-lists exported for service-side double-validation.
  EQM_STATUS, CAL_STATUS, JR_STATUS_PENDING, JR_STATUS_ANY, JC_STATUS,
  // Schemas (one per report).
  calibrationDueQuerySchema,
  pendingJobsQuerySchema,
  equipmentUtilizationQuerySchema,
  engineerSummaryQuerySchema,
  jobCardSummaryQuerySchema,
  jobRequestSummaryQuerySchema,
};
