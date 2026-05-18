// ============================================================================
// src/lib/schemas/inquirySchemas.js  —  Zod mirrors of BE inquiry validators
// ----------------------------------------------------------------------------
// Doctrine 9 (Phase 7): mirror BE schemas on the FE so a bad request is
// caught BEFORE the round-trip. The shape is identical to
// BE/src/modules/inquiry/inquiry.validators.js — keep them in sync.
//
// We don't use these to validate INCOMING data (BE is the boundary); we
// use them to:
//   • clamp page_size to {10, 25} when reading from the URL (defence in
//     depth against handcrafted URLs).
//   • coerce numeric URL params from strings.
//   • feed the "Type" select's option list.
// ============================================================================

import { z } from 'zod';

// ── Canonical vendor types (P8-D7) ───────────────────────────────────
// Slice 1 supports MANUFACTURER + SUPPLIER. SERVICE_PROVIDER is deferred
// until the legacy enum gets ALTER'd (separate ticket).
export const VENDOR_TYPE_OPTIONS = /** @type {const} */ ([
  { value: '',             label: 'All Types' },
  { value: 'MANUFACTURER', label: 'Manufacturer' },
  { value: 'SUPPLIER',     label: 'Supplier' },
]);

// Allowed Inquiry tabs (single source of truth for the URL `?tab=` param).
// The order here is the order in the tab strip.
export const INQUIRY_TABS = /** @type {const} */ ([
  { id: 'vendors',     label: 'Vendor',           permission: 'inquiry:search-vendors' },
  { id: 'products',    label: 'Product',          permission: 'inquiry:search-products' },
  { id: 'job-cards',   label: 'Job Card Status',  permission: 'inquiry:search-job-cards' },
  { id: 'instruments', label: 'Instrument Lookup',permission: 'inquiry:search-instruments' },
]);

// ── Page-size locked to {10, 25} (P8-D12) ────────────────────────────
const pageSize = z.coerce.number().int()
  .refine((v) => v === 10 || v === 25, { message: 'page_size must be 10 or 25' })
  .catch(10); // soft-clamp invalid URL inputs to default 10

const page = z.coerce.number().int().min(1).max(10_000).catch(1);

const q = z.string()
  .trim()
  .max(100)
  .catch('');

export const vendorsQuerySchema = z.object({
  q,
  type: z.enum(['MANUFACTURER', 'SUPPLIER']).optional().catch(undefined),
  page,
  page_size: pageSize,
});

export const productsQuerySchema = z.object({
  q,
  page,
  page_size: pageSize,
});

export const jobCardsQuerySchema = z.object({
  q,
  page,
  page_size: pageSize,
});

export const instrumentsQuerySchema = z.object({
  q,
  page,
  page_size: pageSize,
});

// ── Status-pill colour token map ─────────────────────────────────────
// Mirrors inquiry.service.js. The BE returns `status_accent` per row —
// we use this map only as a SAFETY DEFAULT if the BE returns something
// unexpected.
export const STATUS_ACCENT_CLASSES = {
  green:   'bg-green-100   text-green-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber:   'bg-amber-100   text-amber-700',
  blue:    'bg-blue-100    text-blue-700',
  orange:  'bg-orange-100  text-orange-700',
  red:     'bg-red-100     text-red-700',
  slate:   'bg-slate-100   text-slate-700',
  indigo:  'bg-indigo-100  text-indigo-700',
};
