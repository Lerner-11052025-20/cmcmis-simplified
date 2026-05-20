// ============================================================================
// src/modules/schedule/schedule.validators.js  —  Zod schemas
// ----------------------------------------------------------------------------
// PHASE 13 — Schedule sub-module
//
// Endpoint inputs covered:
//
//   GET   /schedules?type=&status=&from=&to=&engineer=&q=&page=&page_size=
//   POST  /schedules                                  (create)
//   GET   /schedules/:id                              (detail — id only)
//   PATCH /schedules/:id                              (edit; partial body)
//   POST  /schedules/:id/status                       (transition)
//   DELETE /schedules/:id                             (cancel = logical delete)
//   GET   /schedules/:id/ics                          (id only — output stream)
//   GET   /schedules/export.ics?type=&from=&to=       (bulk ICS feed)
//
// DOCTRINE
//   These schemas are the OUTER perimeter — any field that survives parse()
//   is guaranteed to be well-shaped. The repo / service layers can trust
//   the shape and focus on semantics (eg. equipment_id exists in the
//   legacy master). Strict mode is ON so a typo in the payload throws 422
//   rather than silently dropping the field.
// ============================================================================

'use strict';

const { z } = require('zod');

// ── Reusable atoms ────────────────────────────────────────────────────────

const positiveInt = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? Number(v) : v))
  .refine((n) => Number.isInteger(n) && n > 0 && n <= 2147483647,
          'Must be a positive integer');

const page = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === undefined ? 1 : typeof v === 'string' ? Number(v) : v))
  .refine((n) => Number.isInteger(n) && n >= 1, 'page must be >= 1');

const pageSize = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === undefined ? 25 : typeof v === 'string' ? Number(v) : v))
  .refine((n) => Number.isInteger(n) && n >= 1 && n <= 500, 'page_size must be 1..500');

// Accept ISO `YYYY-MM-DD` only — keeps DTSTART deterministic for ICS.
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/,
  'Date must be in YYYY-MM-DD format');

// employee_id everywhere in CMCMIS is VARCHAR(7) (mig 100+). We accept that
// shape OR an empty string (which we coerce to null) so the FE can submit a
// blank "Unassigned" selection.
const employeeIdOrNull = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (s === '') return null;
    return s;
  })
  .refine((v) => v === null || /^[A-Za-z0-9_-]{1,7}$/.test(v),
          'assigned_engineer_employee_id must be up to 7 alphanumeric chars or null');

// Soft-FK equipment_id (composite EQM_TYPE-EQM_ID style). Up to 40 chars.
const equipmentIdString = z.string().min(1).max(40);

// ── Domain enums (mirror the DB enum exactly) ─────────────────────────────
const SCHEDULE_TYPES = ['PREVENTIVE_MAINTENANCE', 'CALIBRATION'];
const PRIORITIES     = ['LOW', 'MEDIUM', 'HIGH'];
const STATUSES       = ['PLANNED', 'SCHEDULED', 'DUE', 'COMPLETED', 'CANCELLED'];
const RECURRENCES    = ['NONE', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'];

// ── List query ────────────────────────────────────────────────────────────
const listQuerySchema = z.object({
  // Filter to one tab; absent → both tabs (calendar view).
  type:        z.enum(SCHEDULE_TYPES).optional(),
  status:      z.enum(STATUSES).optional(),
  // Date range — used by the calendar fetch (visible month) and the list
  // view's overdue filter.
  from:        dateOnly.optional(),
  to:          dateOnly.optional(),
  engineer:    z.string().max(7).optional(),
  q:           z.string().max(120).optional(),
  // view='calendar' relaxes pagination — calendars need every row in the
  // visible range. We still cap page_size at 500 above.
  view:        z.enum(['list', 'calendar']).optional(),
  page,
  page_size:   pageSize,
}).strict();

// ── Create ────────────────────────────────────────────────────────────────
const createSchema = z.object({
  schedule_type:   z.enum(SCHEDULE_TYPES),
  equipment_id:    equipmentIdString,
  equipment_label: z.string().max(160).optional(),
  scheduled_date:  dateOnly,
  priority:        z.enum(PRIORITIES).optional(),
  assigned_engineer_employee_id: employeeIdOrNull.optional(),
  recurrence:      z.enum(RECURRENCES).optional(),
  notes:           z.string().max(1000).optional(),
}).strict();

// ── Edit (partial) ────────────────────────────────────────────────────────
// Every field is optional on PATCH. We require at least one field via
// .refine() so a no-op edit doesn't waste a transaction.
const editSchema = z.object({
  equipment_id:    equipmentIdString.optional(),
  equipment_label: z.string().max(160).optional(),
  scheduled_date:  dateOnly.optional(),
  priority:        z.enum(PRIORITIES).optional(),
  assigned_engineer_employee_id: employeeIdOrNull.optional(),
  recurrence:      z.enum(RECURRENCES).optional(),
  notes:           z.string().max(1000).optional(),
}).strict().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: 'At least one field must be provided' },
);

// ── Status transition ─────────────────────────────────────────────────────
// `to` is required; `reason` is required when moving to CANCELLED.
const statusTransitionSchema = z.object({
  to:     z.enum(STATUSES),
  reason: z.string().max(500).optional(),
}).strict().refine(
  (obj) => obj.to !== 'CANCELLED' || (obj.reason && obj.reason.trim().length > 0),
  { message: 'Reason is required when cancelling a schedule', path: ['reason'] },
);

// ── :id path param ────────────────────────────────────────────────────────
const idParamSchema = z.object({ id: positiveInt }).strict();

// ── ICS bulk export ───────────────────────────────────────────────────────
// Same filter shape as list, but pagination is irrelevant — the feed
// always emits every match (capped server-side at MAX_FEED_ROWS).
const icsExportQuerySchema = z.object({
  type:   z.enum(SCHEDULE_TYPES).optional(),
  status: z.enum(STATUSES).optional(),
  from:   dateOnly.optional(),
  to:     dateOnly.optional(),
}).strict();


module.exports = {
  // Schemas
  listQuerySchema,
  createSchema,
  editSchema,
  statusTransitionSchema,
  idParamSchema,
  icsExportQuerySchema,
  // Re-exported enum tuples — used by the state machine.
  SCHEDULE_TYPES,
  PRIORITIES,
  STATUSES,
  RECURRENCES,
};
