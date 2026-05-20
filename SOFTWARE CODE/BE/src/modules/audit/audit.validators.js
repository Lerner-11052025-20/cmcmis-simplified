// ============================================================================
// src/modules/audit/audit.validators.js  —  Zod schemas
// ----------------------------------------------------------------------------
// PHASE 14 — Audit Log Viewer
//
// READ-ONLY MODULE. Every endpoint is a SELECT — there are no body schemas
// at all (no create/edit/delete). Only query + path validators exist.
//
//   GET /audit?source=&from=&to=&actor=&action=&entityType=&entityId=
//              &q=&page=&page_size=
//   GET /audit/:id?source=         (single row from the chosen source)
//   GET /audit/filters?source=     (distinct values for the dropdowns)
//   GET /audit/export?source=…     (CSV with the same filters; row-capped)
// ============================================================================

'use strict';

const { z } = require('zod');

// ── Atoms ────────────────────────────────────────────────────────────────

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
  .refine((n) => Number.isInteger(n) && n >= 1 && n <= 200, 'page_size must be 1..200');

// ISO date OR ISO datetime — the FE may send either. We slice to YYYY-MM-DD
// in the repo and apply boundary times.
const dateOrDateTime = z.string().regex(
  /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/,
  'Date must be YYYY-MM-DD or YYYY-MM-DD HH:MM[:SS]',
);


// ── Source tabs ──────────────────────────────────────────────────────────
// 3 distinct sources backed by 3 different tables in the repo. Default is
// 'audit_log' (the generic operational record).
const SOURCES = [
  'audit_log',         // ALL ACTIONS (audit_log)
  'identity',          // IDENTITY & ACCESS (user_role_history)
  'transitions',       // STATUS TRANSITIONS (job_request_status_history + job_card_status_history + schedule_status_history)
];


// ── List query ────────────────────────────────────────────────────────────
const listQuerySchema = z.object({
  source:     z.enum(SOURCES).optional(),    // default applied in service
  from:       dateOrDateTime.optional(),
  to:         dateOrDateTime.optional(),
  actor:      z.string().max(60).optional(), // employee_id or numeric user_id
  action:     z.string().max(60).optional(),
  entityType: z.string().max(60).optional(),
  entityId:   z.string().max(120).optional(),
  q:          z.string().max(160).optional(),
  page,
  page_size:  pageSize,
}).strict();


// ── Detail (:id) ─────────────────────────────────────────────────────────
// The :id semantics depend on the source — audit_log PK is audit_id BIGINT,
// status-history tables use history_id BIGINT, user_role_history uses id
// BIGINT. ALL are positive integers, so one schema covers all cases.
//
// `subSource` is only meaningful when source='transitions' — it tells the
// repo which underlying history table to query (the UNION list view tags
// each row with this hint so the FE can pass it back on click).
const detailParamSchema = z.object({ id: positiveInt }).strict();
const detailQuerySchema = z.object({
  source:    z.enum(SOURCES).optional(),
  subSource: z.enum(['job_request', 'job_card', 'schedule']).optional(),
}).strict();


// ── Filters lookup ───────────────────────────────────────────────────────
const filtersQuerySchema = z.object({
  source: z.enum(SOURCES).optional(),
}).strict();


// ── Export — same shape as list (without page/page_size) ─────────────────
const exportQuerySchema = z.object({
  source:     z.enum(SOURCES).optional(),
  from:       dateOrDateTime.optional(),
  to:         dateOrDateTime.optional(),
  actor:      z.string().max(60).optional(),
  action:     z.string().max(60).optional(),
  entityType: z.string().max(60).optional(),
  entityId:   z.string().max(120).optional(),
  q:          z.string().max(160).optional(),
}).strict();


module.exports = {
  listQuerySchema,
  detailParamSchema,
  detailQuerySchema,
  filtersQuerySchema,
  exportQuerySchema,
  SOURCES,
};
