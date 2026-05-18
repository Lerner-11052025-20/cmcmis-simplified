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
// Anything submitted_by_* on the body is REJECTED — BR-JR-06.
// Note: optional fields default to undefined / null in the service so
// the repo writes a NULL rather than '' for genuinely-absent inputs.
const createSchema = z.object({
  job_category:           jobCategoryEnum,
  job_type:               jobTypeEnum,
  equipment_id:           z.number().int().positive().nullable().optional(),
  equipment_name:         z.string().min(2).max(200),
  make:                   z.string().max(120).optional(),
  model_no:               z.string().max(120).optional(),
  serial_no:              z.string().max(120).optional(),
  equipment_type:         z.string().max(60).optional(),
  options_description:    z.string().max(2000).optional(),
  accessories:            z.array(accessorySchema).max(20).optional().default([]),
  lab_phone:              z.string().max(40).optional(),
  room_phone:             z.string().max(40).optional(),
  division_id:            z.number().int().positive(),
  subsystem:              z.string().max(120).optional(),
  project_name:           z.string().max(160).optional(),
  complaint_description:  z.string().min(10).max(4000),
  remarks:                z.string().max(2000).optional(),
  equipment_sent_after_repair: z.boolean().optional().default(false),
  priority:               priorityEnum.optional().default('MEDIUM'),
  // If true, the create endpoint treats this as Submit-now rather than
  // Save-as-Draft. Defaults to false (Save-as-Draft).
  submit_now:             z.boolean().optional().default(false),
  // T&C — REQUIRED when submit_now=true. Server re-checks regardless of
  // FE state (defence in depth).
  tnc_accepted:           z.boolean().optional().default(false),
  tnc_version:            z.string().max(10).optional().default('v1'),
}).strict()
  // Cross-field rule: if submit_now=true, tnc_accepted MUST be true.
  // Returning a path lets the FE highlight the right field.
  .refine(
    (v) => !v.submit_now || v.tnc_accepted === true,
    { message: 'All terms and conditions must be accepted before submitting',
      path: ['tnc_accepted'] },
  );

// ── submitSchema (POST /:id/submit) ────────────────────────────────
const submitSchema = z.object({
  tnc_accepted: z.literal(true),
  tnc_version:  z.string().max(10).optional().default('v1'),
}).strict();

module.exports = { listQuerySchema, createSchema, submitSchema };
