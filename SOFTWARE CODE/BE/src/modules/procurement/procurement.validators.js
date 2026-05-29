// ============================================================================
// src/modules/procurement/procurement.validators.js  —  Zod schemas
// ----------------------------------------------------------------------------
// PHASE 13 — Procurement sub-module
//
// Endpoint inputs covered:
//
//   PURCHASE ORDERS
//     GET   /procurement/purchase-orders?q=&status=&vendor=&page=…
//     POST  /procurement/purchase-orders                       (create + items)
//     GET   /procurement/purchase-orders/:id                   (detail + items)
//     PATCH /procurement/purchase-orders/:id                   (header + status)
//     GET   /procurement/purchase-orders/export                (CSV)
//
//   SPARE PARTS
//     GET   /procurement/spare-parts?q=&vendor=&low_stock=
//     POST  /procurement/spare-parts                           (add)
//     PATCH /procurement/spare-parts/:id                       (edit)
//     POST  /procurement/spare-parts/:id/order                 (order action)
//     GET   /procurement/spare-parts/export                    (CSV)
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
  .refine((n) => Number.isInteger(n) && n >= 1 && n <= 200, 'page_size must be 1..200');

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

const boolFlag = z
  .union([z.literal('0'), z.literal('1'), z.literal(0), z.literal(1),
          z.literal('true'), z.literal('false'), z.boolean()])
  .optional()
  .transform((v) => v === true || v === '1' || v === 1 || v === 'true');

// ── Domain enums ──────────────────────────────────────────────────────────
const PO_STATUSES = ['ACTIVE', 'COMPLETED', 'EXPIRED'];


// ────────────────────────────────────────────────────────────────────────
//  PURCHASE ORDERS
// ────────────────────────────────────────────────────────────────────────

const poListQuerySchema = z.object({
  q:        z.string().max(120).optional(),
  status:   z.enum(PO_STATUSES).optional(),
  vendor:   z.string().max(40).optional(),
  date_from:dateOnly.optional(),
  date_to:  dateOnly.optional(),
  page,
  page_size: pageSize,
}).strict();

// PO line item (used inside the create body).
const poItemSchema = z.object({
  item_name:    z.string().min(1).max(200),
  spare_part_id: z.union([z.number(), z.null(), z.undefined()])
                  .transform((v) => (v === undefined || v === null) ? null : Number(v))
                  .refine((v) => v === null || (Number.isInteger(v) && v > 0),
                          'spare_part_id must be a positive integer or null')
                  .optional(),
  quantity:     z.union([z.string(), z.number()])
                  .transform((v) => typeof v === 'string' ? Number(v) : v)
                  .refine((n) => Number.isInteger(n) && n > 0 && n <= 999999,
                          'quantity must be a positive integer'),
  unit_cost:    z.union([z.string(), z.number()])
                  .transform((v) => typeof v === 'string' ? Number(v) : v)
                  .refine((n) => Number.isFinite(n) && n >= 0,
                          'unit_cost must be a non-negative number'),
}).strict();

const poCreateSchema = z.object({
  vendor_id:        z.string().min(1).max(40),
  vendor_label:     z.string().max(160).optional(),
  po_date:          dateOnly,
  warranty_months:  z.union([z.string(), z.number()])
                      .optional()
                      .transform((v) => v === undefined || v === '' || v === null
                          ? null
                          : typeof v === 'string' ? Number(v) : v)
                      .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 1200),
                              'warranty_months must be 0..1200 or null'),
  status:           z.enum(PO_STATUSES).optional(),
  notes:            z.string().max(1000).optional(),
  items:            z.array(poItemSchema).min(1, 'At least one line item is required'),
}).strict();

// PATCH: header-only edits + status change. Line items are NOT editable
// once the PO is created in Phase 13 (delete + recreate if needed). This
// keeps total_cost provably consistent across the row's lifetime.
const poEditSchema = z.object({
  vendor_label:    z.string().max(160).optional(),
  po_date:         dateOnly.optional(),
  warranty_months: z.union([z.string(), z.number()])
                     .optional()
                     .transform((v) => v === undefined || v === '' || v === null
                         ? null
                         : typeof v === 'string' ? Number(v) : v)
                     .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 1200),
                             'warranty_months must be 0..1200 or null'),
  status:          z.enum(PO_STATUSES).optional(),
  notes:           z.string().max(1000).optional(),
}).strict().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: 'At least one field must be provided' },
);


// ────────────────────────────────────────────────────────────────────────
//  SPARE PARTS
// ────────────────────────────────────────────────────────────────────────

const spareListQuerySchema = z.object({
  q:         z.string().max(120).optional(),
  vendor:    z.string().max(40).optional(),
  low_stock: boolFlag,                  // when true → filter to stock <= min_stock
  page,
  page_size: pageSize,
}).strict();

const spareCreateSchema = z.object({
  part_name:        z.string().min(1).max(160),
  equipment_ref:    z.string().max(80).optional(),
  vendor_id:        z.string().max(40).optional(),
  vendor_label:     z.string().max(160).optional(),
  stock_qty:        z.union([z.string(), z.number()])
                      .optional()
                      .transform((v) => v === undefined || v === '' ? 0 : typeof v === 'string' ? Number(v) : v)
                      .refine((n) => Number.isInteger(n) && n >= 0, 'stock_qty must be a non-negative integer'),
  min_stock:        z.union([z.string(), z.number()])
                      .optional()
                      .transform((v) => v === undefined || v === '' ? 0 : typeof v === 'string' ? Number(v) : v)
                      .refine((n) => Number.isInteger(n) && n >= 0, 'min_stock must be a non-negative integer'),
  unit_cost:        z.union([z.string(), z.number()])
                      .optional()
                      .transform((v) => v === undefined || v === '' || v === null ? null : typeof v === 'string' ? Number(v) : v)
                      .refine((v) => v === null || (Number.isFinite(v) && v >= 0), 'unit_cost must be >= 0 or null'),
  last_ordered_date:dateOnly.optional(),
  notes:            z.string().max(1000).optional(),
}).strict();

const spareEditSchema = z.object({
  part_name:        z.string().min(1).max(160).optional(),
  equipment_ref:    z.string().max(80).optional(),
  vendor_id:        z.string().max(40).optional(),
  vendor_label:     z.string().max(160).optional(),
  stock_qty:        z.union([z.string(), z.number()])
                      .optional()
                      .transform((v) => v === undefined || v === '' ? undefined : typeof v === 'string' ? Number(v) : v)
                      .refine((n) => n === undefined || (Number.isInteger(n) && n >= 0), 'stock_qty must be non-negative integer'),
  min_stock:        z.union([z.string(), z.number()])
                      .optional()
                      .transform((v) => v === undefined || v === '' ? undefined : typeof v === 'string' ? Number(v) : v)
                      .refine((n) => n === undefined || (Number.isInteger(n) && n >= 0), 'min_stock must be non-negative integer'),
  unit_cost:        z.union([z.string(), z.number()])
                      .optional()
                      .transform((v) => v === undefined || v === '' || v === null ? undefined : typeof v === 'string' ? Number(v) : v)
                      .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), 'unit_cost must be >= 0'),
  last_ordered_date:dateOnly.optional(),
  notes:            z.string().max(1000).optional(),
}).strict().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: 'At least one field must be provided' },
);

// Order action — clerk asks "order N units of this spare from vendor V at
// unit_cost U". If a PO for that vendor was created today and is still
// ACTIVE, we append a line item to it. Otherwise we create a new PO. Both
// flows update the spare's last_ordered_date.
const spareOrderSchema = z.object({
  quantity:        z.union([z.string(), z.number()])
                     .transform((v) => typeof v === 'string' ? Number(v) : v)
                     .refine((n) => Number.isInteger(n) && n > 0 && n <= 999999,
                             'quantity must be a positive integer'),
  unit_cost:       z.union([z.string(), z.number()])
                     .optional()
                     .transform((v) => v === undefined || v === '' || v === null ? null : typeof v === 'string' ? Number(v) : v)
                     .refine((v) => v === null || (Number.isFinite(v) && v >= 0), 'unit_cost must be >= 0 or null'),
  warranty_months: z.union([z.string(), z.number()])
                     .optional()
                     .transform((v) => v === undefined || v === '' || v === null ? null : typeof v === 'string' ? Number(v) : v)
                     .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 1200), 'warranty_months 0..1200'),
  notes:           z.string().max(500).optional(),
}).strict();


// ── Shared path/query atoms ──────────────────────────────────────────────
const idParamSchema = z.object({ id: positiveInt }).strict();

const exportQuerySchema = z.object({
  q:        z.string().max(120).optional(),
  status:   z.enum(PO_STATUSES).optional(),
  vendor:   z.string().max(40).optional(),
  low_stock:boolFlag,
}).strict();


module.exports = {
  // PO
  poListQuerySchema,
  poCreateSchema,
  poEditSchema,
  poItemSchema,
  // Spares
  spareListQuerySchema,
  spareCreateSchema,
  spareEditSchema,
  spareOrderSchema,
  // Shared
  idParamSchema,
  exportQuerySchema,
  PO_STATUSES,
};
