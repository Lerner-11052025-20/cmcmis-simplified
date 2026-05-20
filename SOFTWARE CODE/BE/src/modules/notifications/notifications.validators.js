// ============================================================================
// src/modules/notifications/notifications.validators.js  —  Zod schemas
// ----------------------------------------------------------------------------
// PHASE 12 — Notifications
//
// Endpoint inputs:
//
//   GET   /notifications?unreadOnly=&page=&page_size=
//   GET   /notifications/unread-count          (no query params)
//   PATCH /notifications/:id/read              (params.id)
//   PATCH /notifications/read-all              (no input)
//
// All endpoints are recipient-scoped at the SQL layer; the validator
// just rejects malformed input so the repo never sees garbage.
// ============================================================================

'use strict';

const { z } = require('zod');

// Reusable atoms ───────────────────────────────────────────────────────
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
  .transform((v) => (v === undefined ? 20 : typeof v === 'string' ? Number(v) : v))
  .refine((n) => Number.isInteger(n) && n >= 1 && n <= 100, 'page_size must be 1..100');

const boolFlag = z
  .union([z.literal('0'), z.literal('1'), z.literal(0), z.literal(1),
          z.literal('true'), z.literal('false'), z.boolean()])
  .optional()
  .transform((v) => v === true || v === '1' || v === 1 || v === 'true');


// ── List query (own notifications) ────────────────────────────────────
const listQuerySchema = z.object({
  unreadOnly: boolFlag,
  page,
  page_size:  pageSize,
}).strict();


// ── Single-notification :id path param ─────────────────────────────────
const idParamSchema = z.object({
  id: positiveInt,
}).strict();


// ── Empty body schemas (mark-all-read) ─────────────────────────────────
const emptyBodySchema = z.object({}).strict();


module.exports = {
  listQuerySchema,
  idParamSchema,
  emptyBodySchema,
};
