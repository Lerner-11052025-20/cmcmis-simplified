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

module.exports = { listQuerySchema, createSchema, submitSchema };
