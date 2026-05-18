// ============================================================================
// src/modules/inquiry/inquiry.validators.js  —  zod query schemas
// ----------------------------------------------------------------------------
// Slice 1 exposes four search endpoints; all four accept the SAME base
// shape (`q`, `page`, `page_size`) plus an optional `type` filter on the
// vendors tab. We keep the schemas separate (rather than one shared shape)
// so future Slice-2 filters can be added per tab without affecting siblings.
//
// SECURITY
//   • `q` is bounded to 100 chars to cap the BOOLEAN-mode allocation in
//     FULLTEXT and to make accidental log-leakage of long strings small.
//   • `q` allows whitespace + punctuation but NOT control characters.
//     The repo uses parameter binding so SQL injection is structurally
//     impossible — this whitelist is a *content* filter, not a SQL guard.
//   • page_size is constrained to {10, 25} per P8-D12.
// ============================================================================

'use strict';

const { z } = require('zod');

// ── Shared atoms ──────────────────────────────────────────────────────

// Trim then bound 0..100 chars. Empty string is allowed and means
// "no search" — the FE sends `q=` on tab-load and we just return the
// first page sorted by primary code.
const searchTerm = z
  .string()
  .trim()
  .max(100, 'Search term too long (max 100 chars)')
  .regex(/^[\p{L}\p{N}\p{Zs}\-_.@:,'/]*$/u, 'Search contains invalid characters')
  .optional()
  .default('');

const pageNum = z.coerce.number().int().min(1).max(10_000).default(1);
// P8-D12 lock: page_size restricted to {10, 25}.
const pageSize = z.coerce.number().int().refine(
  (v) => v === 10 || v === 25,
  { message: 'page_size must be 10 or 25' },
).default(10);

// ── Vendor-tab schema ────────────────────────────────────────────────
// `type` accepts the canonical names; repo translates to legacy enum.
// 'SERVICE_PROVIDER' is intentionally OUT OF SCOPE for Slice 1
// (P8-D7: legacy enum lacks it).
const vendorsQuerySchema = z.object({
  q: searchTerm,
  type: z.enum(['MANUFACTURER', 'SUPPLIER']).optional(),
  page: pageNum,
  page_size: pageSize,
}).strict();

// ── Products-tab schema ──────────────────────────────────────────────
const productsQuerySchema = z.object({
  q: searchTerm,
  page: pageNum,
  page_size: pageSize,
}).strict();

// ── Job-Cards-tab schema ─────────────────────────────────────────────
const jobCardsQuerySchema = z.object({
  q: searchTerm,
  page: pageNum,
  page_size: pageSize,
}).strict();

// ── Instruments-tab schema ───────────────────────────────────────────
const instrumentsQuerySchema = z.object({
  q: searchTerm,
  page: pageNum,
  page_size: pageSize,
}).strict();

module.exports = {
  vendorsQuerySchema,
  productsQuerySchema,
  jobCardsQuerySchema,
  instrumentsQuerySchema,
};
