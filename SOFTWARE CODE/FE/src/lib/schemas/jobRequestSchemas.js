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
export const JOB_TYPES = ['CALIBRATION', 'REPAIR', 'REGISTRATION'];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

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
  job_type:               z.enum(['CALIBRATION', 'REPAIR', 'REGISTRATION']),
  equipment_id:           z.number().int().positive().nullable().optional(),
  equipment_name:         z.string().min(2, 'Equipment name is required').max(200),
  make:                   z.string().max(120).optional().or(z.literal('')),
  model_no:               z.string().max(120).optional().or(z.literal('')),
  serial_no:              z.string().max(120).optional().or(z.literal('')),
  equipment_type:         z.string().max(60).optional().or(z.literal('')),
  options_description:    z.string().max(2000).optional().or(z.literal('')),
  accessories:            z.array(accessorySchema).max(20).optional().default([]),
  lab_phone:              z.string().max(40).optional().or(z.literal('')),
  room_phone:             z.string().max(40).optional().or(z.literal('')),
  division_id:            z.coerce.number().int().positive({ message: 'Division is required' }),
  subsystem:              z.string().max(120).optional().or(z.literal('')),
  project_name:           z.string().max(160).optional().or(z.literal('')),
  // LOOSE for drafts: complaint may be empty/short. STRICT enforced separately.
  complaint_description:  z.string().max(4000).optional().or(z.literal('')),
  remarks:                z.string().max(2000).optional().or(z.literal('')),
  equipment_sent_after_repair: z.boolean().optional().default(false),
  priority:               z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
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
 * Use this schema for Submit Request. It adds the strict rules:
 *   • complaint_description ≥ 10 chars
 *   • tnc_accepted === true
 * Surfaces both as field-level issues so the FE can highlight them inline.
 */
export const jobRequestSubmitSchema = baseObject.superRefine((v, ctx) => {
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
