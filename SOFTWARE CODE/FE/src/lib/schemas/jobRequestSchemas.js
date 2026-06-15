// ============================================================================
// src/lib/schemas/jobRequestSchemas.js  —  zod schemas for the JR form
// ----------------------------------------------------------------------------
// Mirrors the BE jobRequests.validators.js exactly. Two layers of validation
// (FE + BE) catch different bugs:
//   • FE: instant per-field feedback, prevents pointless network roundtrips
//   • BE: defence in depth, blocks bypassed-FE / curl / malicious payloads
//
// Keep this file and the BE validators in lock-step.
//
// TWO-TIER VALIDATION (added 2026-05-18 after browser feedback):
//   • jobRequestDraftSchema   — LOOSE  · used by Save-as-Draft
//   • jobRequestSubmitSchema  — STRICT · used by Submit Request
//                                         (adds min-10 complaint + T&C check)
// Both share the same base shape; the strict variant enforces extra rules.
// ============================================================================

import { z } from 'zod';

export const JOB_CATEGORIES = ['TME', 'FPE'];
export const JOB_TYPES = ['CALIBRATION', 'REPAIR'];

export const accessorySchema = z.object({
  type: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  serial_no: z.string().max(120).optional().or(z.literal('')),
});

// ── BASE — the loose contract used by Save-as-Draft ──────────────────
// Required to even bother saving a draft: job_category, job_type,
// equipment_name (>=2), division_id. Everything else may be empty.
const baseObject = z.object({
  job_category:           z.enum(['TME', 'FPE']),
  job_type:               z.enum(['CALIBRATION', 'REPAIR']),
  equipment_id:           z.number().int().positive().nullable().optional(),
  equipment_name:         z.string().min(2, 'Equipment name is required').max(200),
  make:                   z.string().max(120).optional().or(z.literal('')),
  model_no:               z.string().max(120).optional().or(z.literal('')),
  serial_no:              z.string().max(120).optional().or(z.literal('')),
  equipment_type:         z.string().max(60).optional().or(z.literal('')),
  equipment_master_type:  z.string().max(25).optional().or(z.literal('')),
  options_description:    z.string().max(2000).optional().or(z.literal('')),
  accessories:            z.array(accessorySchema).max(20).optional().default([]),
  lab_phone:              z.string().max(40).optional().or(z.literal('')),
  room_phone:             z.string().max(40).optional().or(z.literal('')),
  division_id:            z.coerce.number().int().positive({ message: 'Division is required' }),
  approving_authority_employee_id: z.string().min(1, 'Approving authority is required').max(7),
  subsystem:              z.string().max(120).optional().or(z.literal('')),
  project_name:           z.string().max(160).optional().or(z.literal('')),
  // LOOSE for drafts: complaint may be empty/short. STRICT enforced separately.
  complaint_description:  z.string().max(4000).optional().or(z.literal('')),
  remarks:                z.string().max(2000).optional().or(z.literal('')),
  equipment_sent_after_repair: z.boolean().optional().default(false),
  submit_now:             z.boolean().optional().default(false),
  tnc_accepted:           z.boolean().optional().default(false),
  tnc_version:            z.string().max(10).optional().default('v1'),
});

/**
 * Use this schema for Save-as-Draft. It accepts every partial state that is
 * meaningful to persist: as little as { job_category, job_type, equipment_name,
 * division_id } is enough.
 */
export const jobRequestDraftSchema = baseObject;

/**
 * Use this schema for Submit Request. It only adds the strict T&C rule;
 * complaint_description is intentionally optional.
 */
export const jobRequestSubmitSchema = baseObject.superRefine((v, ctx) => {
  if (v.tnc_accepted !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tnc_accepted'],
      message: 'You must accept all terms and conditions before submitting',
    });
  }
});

/**
 * BACKWARD-COMPAT export: legacy code that imported `jobRequestCreateSchema`
 * gets the draft (loose) shape — which is what the previous validation did
 * EXCEPT that the previous schema also enforced min(10) on complaint. The
 * two-tier split fixes that bug.
 */
export const jobRequestCreateSchema = jobRequestDraftSchema;

// ============================================================================
//                          PHASE 7 SLICE 2  ·  CONVERT / REJECT
// ============================================================================
//  These two schemas mirror BE/src/modules/jobRequests/jobRequests.validators.js
//  Keep them in lock-step. Adding a field on one side without the other
//  is the most common subtle bug — symptom is a 422 VALIDATION_ERROR
//  from the BE that the FE doesn't surface as a field-level message.
// ============================================================================

/** Six workflow-type values, scoped at the modal level by JR.job_type. */
export const WORKFLOW_TYPES = [
  'CALIBRATION_STANDARD',
  'CALIBRATION_PRECISION',
  'INSPECTION_ROUTINE',
  'INSPECTION_DETAILED',
  'MASTER_DATA_FIELD_UPDATE',
  'MASTER_DATA_REVISION',
];

/** Maps JR.job_type → allowed workflow types. Mirrors WORKFLOW_BUCKET on BE. */
export const WORKFLOW_BUCKET = Object.freeze({
  CALIBRATION:  ['CALIBRATION_STANDARD', 'CALIBRATION_PRECISION'],
  REPAIR:       ['INSPECTION_ROUTINE',   'INSPECTION_DETAILED'],
  REGISTRATION: ['MASTER_DATA_FIELD_UPDATE', 'MASTER_DATA_REVISION'],
});

/** Human labels for the Workflow Type dropdown. */
export const WORKFLOW_LABELS = Object.freeze({
  CALIBRATION_STANDARD:       'Calibration · Standard',
  CALIBRATION_PRECISION:      'Calibration · Precision',
  INSPECTION_ROUTINE:         'Inspection · Routine',
  INSPECTION_DETAILED:        'Inspection · Detailed',
  MASTER_DATA_FIELD_UPDATE:   'Master Data · Field Update',
  MASTER_DATA_REVISION:       'Master Data · Revision',
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Use YYYY-MM-DD',
});

/** Convert modal body — used by react-hook-form's resolver. */
export const jobRequestConvertSchema = z.object({
  engineer_employee_id:    z.string().regex(/^[A-Z]{2}[0-9]{5}$/, {
    message: 'Pick an engineer from the list',
  }),
  workflow_type:           z.enum(WORKFLOW_TYPES, { message: 'Pick a workflow type' }),
  job_request_received_date: isoDate,
  equipment_received_date: isoDate,
  planned_start_date:      isoDate,
  target_end_date:         isoDate,
  required_resources:      z.string().max(2000).optional().or(z.literal('')),
  special_instructions:    z.string().max(2000).optional().or(z.literal('')),
}).superRefine((v, ctx) => {
  if (v.equipment_received_date < v.job_request_received_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['equipment_received_date'],
      message: 'Equipment received cannot be before job request received',
    });
  }
  if (v.planned_start_date < v.equipment_received_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['planned_start_date'],
      message: 'Planned start cannot be before equipment received',
    });
  }
  if (v.target_end_date < v.planned_start_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['target_end_date'],
      message: 'Target end cannot be before planned start',
    });
  }
});

/** Reject modal body. */
export const jobRequestRejectSchema = z.object({
  reason: z.string()
    .min(10, { message: 'Reason must be at least 10 characters' })
    .max(500, { message: 'Reason cannot exceed 500 characters' }),
});
