// ============================================================================
// src/modules/equipment/equipment.validators.js  —  Zod schemas
// ----------------------------------------------------------------------------
// Two schemas:
//   • listQuerySchema  — GET /api/v1/equipment query params
//   • createEquipmentSchema — POST /api/v1/equipment body
//
// Both schemas are .strict() so unknown keys throw 422. The create schema
// includes the 6 T&C acceptance booleans as .literal(true) — a hard
// server-side guarantee the user really checked all six boxes, even if
// the FE button-disable is bypassed.
//
// Phase-5 K.6 reality check: the form has more fields than the database
// has columns. Fields like MIVR, lab phone, complaint description live
// only in audit_log.details — but they ARE validated here so we know
// the payload was well-formed.
// ============================================================================

'use strict';

const { z } = require('zod');

// ── Status enum on cmms_eqip_mst.EQM_MVP_STATUS (8 values) ──────────────
const STATUS_VALUES = [
  'PENDING_VERIFICATION',
  'ACTIVE',
  'UNDER_CALIBRATION',
  'UNDER_REPAIR',
  'OUT_OF_TOLERANCE',
  'QUARANTINED',
  'CONDEMNED',
  'RETIRED',
];

// EQM_TYPE has exactly two values in the live data: 'Instrument' (T&ME)
// and 'Equipment' (F&PE). The form's "Job Category" UI maps to these.
const JOB_CATEGORY_TO_EQM_TYPE = {
  'T&ME': 'Instrument',
  'F&PE': 'Equipment',
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ── GET /equipment — query params ───────────────────────────────────────
const listQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(25),
    q: z.string().trim().max(100).optional(),
    type_id: z.coerce.number().int().positive().optional(),
    eqm_type: z.enum(['Instrument', 'Equipment']).optional(),
    status: z.enum(STATUS_VALUES).optional(),
    model_no: z.string().trim().max(100).optional(),
    make: z.string().trim().max(100).optional(),
    sort: z.enum(['equipment_code', 'name', 'next_cal_due_date', 'model_no', 'make']).default('equipment_code'),
    order: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();

// ── POST /equipment — body ──────────────────────────────────────────────
const createEquipmentSchema = z
  .object({
    // §1 — Job Type
    job_category: z.enum(['T&ME', 'F&PE']),
    job_type: z.literal('Registration'),

    // §2 — Equipment details
    name: z.string().min(2).max(100),
    make_id: z.coerce.number().int().positive().optional().nullable(),       // FK to cmms_cont_mst.CMM_CONT_ID
    model_no: z.string().max(50).optional().default(''),
    mfg_model_name: z.string().max(100).optional().default(''),
    other_equipment_type: z.string().max(100).optional().default(''),
    serial_no: z.string().min(1).max(50),
    equipment_type_id: z.coerce.number().int().positive().optional().nullable(),
    options_description: z.string().max(250).optional().default(''),

    // §3 — Accessories (Phase-6 park; we ACCEPT them so the FE roundtrip
    // works but persist only as JSON in audit_log.details for now.)
    accessories: z
      .array(
        z.object({
          accessory_type: z.string().max(40),
          accessory_name: z.string().min(1).max(120),
          serial_no: z.string().max(80).optional().default(''),
        }),
      )
      .max(20)
      .default([]),

    // §4 — Procurement (PO + cost go on cmms_eqip_mst; MIVR / line-item
    // are accepted, validated, but live in audit_log.details for now.)
    po_number: z.string().min(1).max(50),
    po_date: z.string().regex(ISO_DATE, 'Use YYYY-MM-DD'),
    mivr_number: z.string().min(1).max(40),
    mivr_date: z.string().regex(ISO_DATE, 'Use YYYY-MM-DD'),
    line_item_code: z.string().min(1).max(40),
    cost: z.coerce.number().nonnegative(),
    cost_currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).default('INR'),
    warranty_months: z.coerce.number().int().nonnegative().max(600).optional().default(0),

    // §5 — Submitter context (auto-fill done client-side; server IGNORES
    // any submitter_* keys and uses req.user instead. We accept lab/room
    // phone, division, subsystem, project, complaint, remarks.)
    lab_phone: z.string().max(20).optional().default(''),
    room_phone: z.string().max(20).optional().default(''),
    division_id: z.coerce.number().int().positive(),   // FK to cmms_section_mst.SM_ID
    subsystem: z.string().max(80).optional().default(''),
    project: z.string().max(120).optional().default(''),

    // §6 — Dynamic T&C checkboxes, all must be literal true
    tc_accepted: z.record(z.literal(true)),
  })
  .strict();

module.exports = {
  listQuerySchema,
  createEquipmentSchema,
  STATUS_VALUES,
  JOB_CATEGORY_TO_EQM_TYPE,
};
