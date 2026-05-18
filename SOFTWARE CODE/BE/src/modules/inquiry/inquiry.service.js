// ============================================================================
// src/modules/inquiry/inquiry.service.js  —  Business logic for the 4 tabs
// ----------------------------------------------------------------------------
// Each public function takes a validated query object from the controller,
// delegates the SQL to the repo, then post-processes:
//   • progress % mapping for the job-card row (status→pct ladder)
//   • status pill label mapping for the instrument row (ACTIVE→Operational)
//   • date formatting (YYYY-MM-DD) for tabular display
//   • pagination envelope identical to other modules
//
// The repo returns canonical rows; this layer adds presentation concerns
// only. No SQL.
// ============================================================================

'use strict';

const dayjs = require('dayjs');
const repo = require('./inquiry.repo');

// ── Constants ─────────────────────────────────────────────────────────

// Progress % mapping for Job Card status (P8-D11 / SCHEMA_PHASE8.md §5).
// Decided in service layer so SQL stays clean.
const JC_PROGRESS_PCT = {
  ASSIGNED:        25,
  IN_PROGRESS:     60,
  COMPLETED:      100,
  VERIFIED_CLOSED:100,
  REOPENED:        40,
};

// Instrument status pill mapping (canonical → display string).
// FE uses these display strings directly; no logic on FE side.
const INSTRUMENT_STATUS_LABEL = {
  ACTIVE:                'Operational',
  PENDING_VERIFICATION:  'Pending Verification',
  UNDER_CALIBRATION:     'Under Calibration',
  UNDER_REPAIR:          'Under Repair',
  OUT_OF_TOLERANCE:      'Out of Tolerance',
  QUARANTINED:           'Quarantined',
  CONDEMNED:             'Condemned',
  RETIRED:               'Retired',
};

// Accent colour token (Tailwind palette family) by instrument status.
// Used by the FE StatusPill component.
const INSTRUMENT_STATUS_ACCENT = {
  ACTIVE:                'green',
  PENDING_VERIFICATION:  'slate',
  UNDER_CALIBRATION:     'blue',
  UNDER_REPAIR:          'orange',
  OUT_OF_TOLERANCE:      'red',
  QUARANTINED:           'red',
  CONDEMNED:             'slate',
  RETIRED:               'slate',
};

// Job Card status pill mapping (matches the screenshot's vocabulary).
const JC_STATUS_LABEL = {
  ASSIGNED:        'Pending',
  IN_PROGRESS:     'In Progress',
  COMPLETED:       'Completed',
  VERIFIED_CLOSED: 'Verified Closed',
  REOPENED:        'Reopened',
};

const JC_STATUS_ACCENT = {
  ASSIGNED:        'amber',
  IN_PROGRESS:     'blue',
  COMPLETED:       'green',
  VERIFIED_CLOSED: 'emerald',
  REOPENED:        'orange',
};

// ── Helpers ───────────────────────────────────────────────────────────

function fmtDate(d) {
  return d ? dayjs(d).format('YYYY-MM-DD') : null;
}

function buildPagination(params, total) {
  const totalPages = Math.max(1, Math.ceil(total / params.page_size));
  return {
    page: params.page,
    page_size: params.page_size,
    total_items: total,
    total_pages: totalPages,
  };
}

function buildAppliedFilters(params) {
  // Compact, readable shape — null over absent so the FE can compare to
  // its own state and decide whether to show "Clear filters".
  return {
    q: params.q || null,
    type: params.type || null,
    page: params.page,
    page_size: params.page_size,
  };
}

// ── Public — Vendor tab ───────────────────────────────────────────────
async function listVendors(params) {
  const { rows, total } = await repo.searchVendors(params);
  const items = rows.map((r) => ({
    id: r.id,
    vendor_code: r.vendor_code,
    name: r.name,
    type: r.type,
    contact_person: r.contact_person || null,
    contact: r.contact || null,
    email: r.email || null,
    address: r.address || null,
  }));
  return {
    items,
    pagination: buildPagination(params, total),
    applied_filters: buildAppliedFilters(params),
  };
}

// ── Public — Product tab ──────────────────────────────────────────────
async function listProducts(params) {
  const { rows, total } = await repo.searchProducts(params);
  const items = rows.map((r) => ({
    id: r.id,
    product_code: r.product_code,
    name: r.name,
    description: r.description || null,
    equipment_count: Number(r.equipment_count) || 0,
    top_manufacturer: r.top_manufacturer || null,
  }));
  return {
    items,
    pagination: buildPagination(params, total),
    applied_filters: buildAppliedFilters(params),
  };
}

// ── Public — Job Cards tab ────────────────────────────────────────────
async function listJobCards(params) {
  const { rows, total } = await repo.searchJobCards(params);
  const items = rows.map((r) => ({
    id: r.id,
    job_code: r.job_code,
    eqm_type: r.eqm_type,
    eqm_id: r.eqm_id,
    equipment_name: r.equipment_name || null,
    status: r.status,
    status_label: JC_STATUS_LABEL[r.status] || r.status,
    status_accent: JC_STATUS_ACCENT[r.status] || 'slate',
    assigned_engineer: r.assigned_engineer || null,
    received_at: fmtDate(r.received_at),
    completed_at: fmtDate(r.completed_at),
    verified_at: fmtDate(r.verified_at),
    progress_pct: JC_PROGRESS_PCT[r.status] ?? 0,
  }));
  return {
    items,
    pagination: buildPagination(params, total),
    applied_filters: buildAppliedFilters(params),
  };
}

// ── Public — Instrument Lookup tab ────────────────────────────────────
async function listInstruments(params) {
  const { rows, total } = await repo.searchInstruments(params);
  const items = rows.map((r) => ({
    id: r.id,
    equipment_code: r.equipment_code,
    eqm_type: r.eqm_type,
    eqm_id: r.eqm_id,
    name: r.name,
    model_no: r.model_no || null,
    serial_no: r.serial_no || null,
    division_code: r.division_code || null,
    location_name: r.location_name || null,
    status: r.status,
    status_label: INSTRUMENT_STATUS_LABEL[r.status] || r.status,
    status_accent: INSTRUMENT_STATUS_ACCENT[r.status] || 'slate',
    last_cal_date: fmtDate(r.last_cal_date),
    next_cal_due_date: fmtDate(r.next_cal_due_date),
  }));
  return {
    items,
    pagination: buildPagination(params, total),
    applied_filters: buildAppliedFilters(params),
  };
}

module.exports = {
  listVendors,
  listProducts,
  listJobCards,
  listInstruments,
  // Exported for unit testing / docs reference.
  JC_PROGRESS_PCT,
  INSTRUMENT_STATUS_LABEL,
  JC_STATUS_LABEL,
};
