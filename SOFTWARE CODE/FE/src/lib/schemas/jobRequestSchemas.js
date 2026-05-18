// ============================================================================
// src/lib/schemas/jobRequestSchemas.js  —  zod schemas for the JR form
// ----------------------------------------------------------------------------
// Mirrors the BE jobRequests.validators.js exactly. Two layers of validation
// (FE + BE) catch different bugs:
//   • FE: instant per-keystroke feedback, prevents pointless network roundtrips
//   • BE: defence in depth, blocks bypassed-FE / curl / malicious payloads
//
// Keep this file and the BE validators in lock-step.
// ============================================================================

import { z } from 'zod';

export const JOB_CATEGORIES = ['TME', 'FPE'];
export const JOB_TYPES = ['CALIBRATION', 'REPAIR', 'REGISTRATION'];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

export const accessorySchema = z.object({
  type: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  serial_no: z.string().max(120).optional(),
});

/**
 * Submitted to POST /api/v1/job-requests.
 * Note: submit_now=true requires tnc_accepted=true (FE button is gated,
 * BE re-checks defensively).
 */
export const jobRequestCreateSchema = z.object({
  job_category:           z.enum(['TME', 'FPE']),
  job_type:               z.enum(['CALIBRATION', 'REPAIR', 'REGISTRATION']),
  equipment_id:           z.number().int().positive().nullable().optional(),
  equipment_name:         z.string().min(2).max(200),
  make:                   z.string().max(120).optional().or(z.literal('')),
  model_no:               z.string().max(120).optional().or(z.literal('')),
  serial_no:              z.string().max(120).optional().or(z.literal('')),
  equipment_type:         z.string().max(60).optional().or(z.literal('')),
  options_description:    z.string().max(2000).optional().or(z.literal('')),
  accessories:            z.array(accessorySchema).max(20).optional().default([]),
  lab_phone:              z.string().max(40).optional().or(z.literal('')),
  room_phone:             z.string().max(40).optional().or(z.literal('')),
  division_id:            z.coerce.number().int().positive(),
  subsystem:              z.string().max(120).optional().or(z.literal('')),
  project_name:           z.string().max(160).optional().or(z.literal('')),
  complaint_description:  z.string().min(10, 'Please describe the issue (min 10 characters)').max(4000),
  remarks:                z.string().max(2000).optional().or(z.literal('')),
  equipment_sent_after_repair: z.boolean().optional().default(false),
  priority:               z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
  submit_now:             z.boolean().optional().default(false),
  tnc_accepted:           z.boolean().optional().default(false),
  tnc_version:            z.string().max(10).optional().default('v1'),
});
