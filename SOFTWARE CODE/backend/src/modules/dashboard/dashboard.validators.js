// ============================================================================
// src/modules/dashboard/dashboard.validators.js  —  zod schemas
// ----------------------------------------------------------------------------
// The dashboard endpoint has NO query params for Slice 1. Filters / date-
// range pickers / per-card refresh are explicit Slice-2 scope.
//
// We still export an (empty-object) schema so the routes file stays
// uniform with every other module in the codebase (`validate(schema)`
// is the standard middleware factory).
// ============================================================================

'use strict';

const { z } = require('zod');

// ── No query params accepted in Slice 1 ───────────────────────────────
// `strict()` makes unknown keys a 400 — defence in depth against the FE
// accidentally sending stray params that we'd silently ignore.
const kpisQuerySchema = z.object({}).strict();

module.exports = {
  kpisQuerySchema,
};
