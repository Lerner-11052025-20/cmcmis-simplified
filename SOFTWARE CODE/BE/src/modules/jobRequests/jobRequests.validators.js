// ============================================================================
// src/modules/jobRequests/jobRequests.validators.js  —  zod schemas
// ----------------------------------------------------------------------------
// Schemas the validate() middleware runs against req.body and req.query.
//
//   listQuerySchema   GET  /job-requests       (req.query)
//   createSchema      POST /job-requests       (req.body)
//   submitSchema      POST /job-requests/:id/submit (req.body)
//
// CONTRACT WITH THE FE
//   The FE imports the same enum/length constants from
//   `src/lib/schemas/jobRequestSchemas.js` (Phase 6) for client-side
//   validation. Keep this file and the FE schema file in lock-step.
//
// BR-JR-06
//   The create body MUST NOT carry submitted_by_* fields — the server
//   sets them from req.user. The .strict() at the bottom of createSchema
//   rejects any unknown key, which catches a malicious payload that
//   tries to spoof submitter identity.
// ============================================================================

'use strict';

const { z } = require('zod');

// ── Shared atoms ─────────────────────────────────────────────────────
const jobCategoryEnum = z.enum(['TME', 'FPE']);
const jobTypeEnum     = z.enum(['CALIBRATION', 'REPAIR', 'REGISTRATION']);
const priorityEnum    = z.enum(['LOW', 'MEDIUM', 'HIGH']);
const statusEnum      = z.enum([
  'DRAFT', 'SUBMITTED', 'ASSIGNED', 'REJECTED',
  'IN_PROGRESS', 'COMPLETED', 'VERIFIED_CLOSED', 'REOPENED',
]);
const sortEnum = z.enum([
  '-created_at', 'created_at',
  '-priority',   'priority',
  'request_code','-request_code',
]);
const pageSizeEnum = z.coerce.number().int().refine(
  (n) => [10, 25, 50, 100].includes(n),
  { message: 'page_size must be 10, 25, 50, or 100' },
);

const accessorySchema = z.object({
  type:      z.string().min(1).max(60),
  name:      z.string().min(1).max(120),
  serial_no: z.string().max(120).optional(),
}).strict();

// ── listQuerySchema ─────────────────────────────────────────────────
const listQuerySchema = z.object({
  q:           z.string().max(120).optional(),
  type:        jobTypeEnum.optional(),
  status:      statusEnum.optional(),
  priority:    priorityEnum.optional(),
  division_id: z.coerce.number().int().positive().optional(),
  date_from:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sort:        sortEnum.optional().default('-created_at'),
  page:        z.coerce.number().int().min(1).max(10000).default(1),
  page_size:   pageSizeEnum.default(25),
  // Phase 9: opt-in to seeing logically-cancelled DRAFTs in the list.
  // Default is to hide them (decision D-9.11). Used by admin/reports.
  include_cancelled: z.coerce.boolean().optional().default(false),
}).strict();

// ── createSchema  ───────────────────────────────────────────────────
// Anything submitted_by_* on the body is REJECTED — BR-JR-06. The .strict()
// catches a malicious payload that tries to spoof submitter identity.
//
// TWO-TIER VALIDATION (added 2026-05-18 after browser feedback):
//   • DRAFT  (submit_now=false)  ·  LOOSE — only job_category, job_type,
//                                          equipment_name and division_id
//                                          are required. Drafts are
//                                          intentionally permissive so
//                                          a user can save partial work.
//   • SUBMIT (submit_now=true)   ·  STRICT — complaint_description must be
//                                          ≥ 10 chars; tnc_accepted must be
//                                          true; all field-length caps apply.
//
// The base shape declares the LOOSE contract; .superRefine() upgrades it to
// STRICT when submit_now=true. Either way, the upper bounds (max-length,
// enum membership) ALWAYS apply — they exist to defeat malformed input
// regardless of intent.
const createSchema = z.object({
  job_category:           jobCategoryEnum,
  job_type:               jobTypeEnum,
  equipment_id:           z.number().int().positive().nullable().optional(),
  // Min(2) required even for drafts — a draft with a 1-char equipment name
  // is functionally indistinguishable from garbage. Drafts can omit
  // make/model/serial entirely though.
  equipment_name:         z.string().min(2).max(200),
  make:                   z.string().max(120).optional().or(z.literal('')),
  model_no:               z.string().max(120).optional().or(z.literal('')),
  serial_no:              z.string().max(120).optional().or(z.literal('')),
  equipment_type:         z.string().max(60).optional().or(z.literal('')),
  options_description:    z.string().max(2000).optional().or(z.literal('')),
  accessories:            z.array(accessorySchema).max(20).optional().default([]),
  lab_phone:              z.string().max(40).optional().or(z.literal('')),
  room_phone:             z.string().max(40).optional().or(z.literal('')),
  division_id:            z.number().int().positive(),
  subsystem:              z.string().max(120).optional().or(z.literal('')),
  project_name:           z.string().max(160).optional().or(z.literal('')),
  // LOOSE for drafts: complaint may be empty/short. STRICT (≥10) enforced
  // in the superRefine below when submit_now=true.
  complaint_description:  z.string().max(4000).optional().or(z.literal('')),
  remarks:                z.string().max(2000).optional().or(z.literal('')),
  equipment_sent_after_repair: z.boolean().optional().default(false),
  priority:               priorityEnum.optional().default('MEDIUM'),
  submit_now:             z.boolean().optional().default(false),
  tnc_accepted:           z.boolean().optional().default(false),
  tnc_version:            z.string().max(10).optional().default('v1'),
}).strict()
  .superRefine((v, ctx) => {
    // SUBMIT-only rules. Drafts skip every check in this block.
    if (!v.submit_now) return;

    if (!v.complaint_description || v.complaint_description.trim().length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['complaint_description'],
        message: 'Complaint description must be at least 10 characters before submitting',
      });
    }
    if (v.tnc_accepted !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tnc_accepted'],
        message: 'All terms and conditions must be accepted before submitting',
      });
    }
  });

// ── submitSchema (POST /:id/submit) ────────────────────────────────
const submitSchema = z.object({
  tnc_accepted: z.literal(true),
  tnc_version:  z.string().max(10).optional().default('v1'),
}).strict();

// ============================================================================
//                          PHASE 7 SLICE 2  ·  CONVERT / REJECT
// ============================================================================
//  These two schemas mirror the FE schemas in
//  `FE/src/lib/schemas/jobRequestSchemas.js` and are the BE-side authority
//  on what a Convert / Reject body must look like. Defence in depth — the
//  FE also validates, but the BE rejects anything malformed regardless.
// ============================================================================

// Workflow-type enum — six values, scoped by JR.job_type bucket (D-7.2.10).
// The service layer enforces the bucket constraint AFTER zod validation
// (it needs to know the JR's job_type to do so).
const workflowTypeEnum = z.enum([
  // Calibration bucket
  'CALIBRATION_STANDARD',
  'CALIBRATION_PRECISION',
  // Inspection (REPAIR) bucket
  'INSPECTION_ROUTINE',
  'INSPECTION_DETAILED',
  // Master Data Correction (REGISTRATION) bucket
  'MASTER_DATA_FIELD_UPDATE',
  'MASTER_DATA_REVISION',
]);

// Map every JR.job_type to its allowed workflow_type set. Used by service
// to enforce the bucket. Exported so tests can import the same source of
// truth.
const WORKFLOW_BUCKET = Object.freeze({
  CALIBRATION:  ['CALIBRATION_STANDARD', 'CALIBRATION_PRECISION'],
  REPAIR:       ['INSPECTION_ROUTINE',   'INSPECTION_DETAILED'],
  REGISTRATION: ['MASTER_DATA_FIELD_UPDATE', 'MASTER_DATA_REVISION'],
});

// Date format: YYYY-MM-DD (FE always sends ISO date strings, never Date
// objects, because JSON has no Date type). The regex blocks obvious junk
// before the date-math superRefine below.
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Date must be YYYY-MM-DD',
});

// ── convertSchema (POST /:id/convert) ──────────────────────────────
// .strict() — any extra key (engineer_id, e.g. snake-cased differently)
// is REJECTED. Forces the FE to speak the BE's exact vocabulary and
// catches accidental field-name drift.
const convertSchema = z.object({
  // The engineer is identified by employee_id (varchar 7) — that's the
  // shape stored in JM_ASSIGNED_ENGINEER + JR_ASSIGNED_ENGINEER. We
  // could also accept user_id (numeric) but mixing identifier shapes
  // across endpoints is a recipe for "which one is the right one" bugs.
  // D-7.2.9 — always employee_id.
  engineer_employee_id:      z.string().regex(/^[A-Z]{2}[0-9]{5}$/, {
    message: 'engineer_employee_id must match ^[A-Z]{2}[0-9]{5}$ (e.g. TE00225)',
  }),
  workflow_type:             workflowTypeEnum,
  equipment_received_date:   isoDate,
  planned_start_date:        isoDate,
  target_end_date:           isoDate,
  // 2000 char cap matches the JM_REQUIRED_RESOURCES column width.
  required_resources:        z.string().max(2000).optional().or(z.literal('')),
  special_instructions:      z.string().max(2000).optional().or(z.literal('')),
}).strict()
  .superRefine((v, ctx) => {
    // Cross-field date sanity:
    //   equipment_received_date  ≤  planned_start_date  ≤  target_end_date
    // We compare as strings — ISO 8601 dates are lexicographically ordered.
    if (v.planned_start_date < v.equipment_received_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['planned_start_date'],
        message: 'Planned start date cannot be before equipment received date',
      });
    }
    if (v.target_end_date < v.planned_start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['target_end_date'],
        message: 'Target end date cannot be before planned start date',
      });
    }
  });

// ── rejectSchema (POST /:id/reject) ─────────────────────────────────
// 10..500 chars — the lower bound forces a meaningful reason (no
// "no" / "x"), the upper bound matches JR_REJECTION_REASON column width.
const rejectSchema = z.object({
  reason: z.string().min(10, { message: 'Reason must be at least 10 characters' })
                    .max(500, { message: 'Reason cannot exceed 500 characters' }),
}).strict();

// ============================================================================
//                          PHASE 9  ·  EDIT DRAFT + CANCEL DRAFT
// ============================================================================

/**
 * Edit-DRAFT body schema. Same shape as createSchema's loose tier,
 * minus submit_now / tnc_* (DRAFT cannot become SUBMITTED via PATCH —
 * use the dedicated /submit endpoint for that).
 *
 * Every field is OPTIONAL — partial PATCH is the norm.
 * BR-JR-06: submitted_by_* NEVER accepted on this endpoint either.
 */
const editDraftSchema = z.object({
  job_category:           jobCategoryEnum.optional(),
  job_type:               jobTypeEnum.optional(),
  equipment_id:           z.number().int().positive().nullable().optional(),
  equipment_name:         z.string().min(2).max(200).optional(),
  make:                   z.string().max(120).optional().or(z.literal('')),
  model_no:               z.string().max(120).optional().or(z.literal('')),
  serial_no:              z.string().max(120).optional().or(z.literal('')),
  equipment_type:         z.string().max(60).optional().or(z.literal('')),
  options_description:    z.string().max(2000).optional().or(z.literal('')),
  lab_phone:              z.string().max(40).optional().or(z.literal('')),
  room_phone:             z.string().max(40).optional().or(z.literal('')),
  division_id:            z.number().int().positive().optional(),
  subsystem:              z.string().max(120).optional().or(z.literal('')),
  project_name:           z.string().max(160).optional().or(z.literal('')),
  complaint_description:  z.string().max(4000).optional().or(z.literal('')),
  remarks:                z.string().max(2000).optional().or(z.literal('')),
  equipment_sent_after_repair: z.boolean().optional(),
  priority:               priorityEnum.optional(),
}).strict();

/**
 * Cancel-DRAFT body schema. Reason is optional — a user may cancel
 * silently. If provided, must be 10..500 chars (same shape as reject
 * reason in Phase 7 Slice 2).
 */
const cancelDraftSchema = z.object({
  reason: z.string()
    .min(10, { message: 'If provided, reason must be at least 10 characters' })
    .max(500, { message: 'Reason cannot exceed 500 characters' })
    .optional()
    .or(z.literal('')),                  // accept empty string as "no reason"
}).strict();

module.exports = {
  listQuerySchema,
  createSchema,
  submitSchema,
  // Phase 7 Slice 2:
  convertSchema,
  rejectSchema,
  WORKFLOW_BUCKET,
  // Phase 9:
  editDraftSchema,
  cancelDraftSchema,
};
