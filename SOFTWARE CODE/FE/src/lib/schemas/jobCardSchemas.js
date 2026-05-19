// ============================================================================
// src/lib/schemas/jobCardSchemas.js  —  zod schemas for the JC detail page
// ----------------------------------------------------------------------------
// Mirrors BE/src/modules/jobCards/jobCards.validators.js exactly. Keep
// the two files in lock-step — drift produces "passes FE but BE returns
// 422" bugs that are hard to diagnose.
// ============================================================================

import { z } from 'zod';

// ── Shared atoms ────────────────────────────────────────────────────
export const JC_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED_CLOSED', 'REOPENED'];

export const JOB_TYPE_OPTIONS = ['IN_HOUSE', 'VENDOR'];
export const REPAIR_TYPE_OPTIONS = ['BREAK_DOWN', 'WARRANTY', 'PM', 'NEED_BASED'];
export const AWAITING_STATUS_OPTIONS = [
  'AWAITING_FOR_SPARES', 'AWAITING_FOR_VENDOR', 'AWAITING_FOR_CUSTOMER',
  'AWAITING_FOR_INFO', 'NONE',
];
export const JOB_STATUS_DISPLAY_OPTIONS = [
  'AWAITING_FOR_VENDOR', 'AWAITING_FOR_SPARES', 'IN_PROGRESS_NORMAL',
  'HOLD', 'RESUMED',
];

export const SPARE_SOURCE_OPTIONS = ['CASH_PURCHASE', 'VENDOR', 'STOCK', 'WARRANTY', 'OTHER'];
export const READING_TYPE_OPTIONS = ['PRE_CAL', 'POST_CAL', 'INSPECTION', 'OTHER'];
export const DOC_TYPE_OPTIONS = [
  'CALIBRATION_CERT', 'INSPECTION_REPORT', 'PHOTO_BEFORE', 'PHOTO_AFTER',
  'VENDOR_INVOICE', 'REQUIRED', 'OTHER',
];

// Friendly labels for the UI.
export const JOB_TYPE_LABELS = {
  IN_HOUSE: 'In-house Job',
  VENDOR:   'Vendor Job',
};
export const REPAIR_TYPE_LABELS = {
  BREAK_DOWN:  'Break Down',
  WARRANTY:    'Warranty',
  PM:          'PM',
  NEED_BASED:  'Need Based Repairs',
};
export const AWAITING_STATUS_LABELS = {
  AWAITING_FOR_SPARES:   'Awaiting For Spares',
  AWAITING_FOR_VENDOR:   'Awaiting For Vendor',
  AWAITING_FOR_CUSTOMER: 'Awaiting For Customer',
  AWAITING_FOR_INFO:     'Awaiting For Information',
  NONE:                  'None',
};
export const JOB_STATUS_DISPLAY_LABELS = {
  AWAITING_FOR_VENDOR:  'Awaiting For Vendor',
  AWAITING_FOR_SPARES:  'Awaiting For Spares',
  IN_PROGRESS_NORMAL:   'In Progress',
  HOLD:                 'Hold',
  RESUMED:              'Resumed',
};
export const DOC_TYPE_LABELS = {
  CALIBRATION_CERT:    'Calibration Certificate',
  INSPECTION_REPORT:   'Inspection Report',
  PHOTO_BEFORE:        'Photo · Before',
  PHOTO_AFTER:         'Photo · After',
  VENDOR_INVOICE:      'Vendor Invoice',
  REQUIRED:            'Required Document',
  OTHER:               'Other',
};

const isoDateOrEmpty     = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).optional();
const isoDateTimeOrEmpty = z.string()
  .regex(/^$|^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d{1,6})?([+-]\d{2}:?\d{2}|Z)?)?$/)
  .optional();
const moneyOrEmpty = z.union([
  z.number().nonnegative(),
  z.coerce.number().nonnegative(),
  z.literal(''),
  z.null(),
]).optional();

// ── Tab PATCH schema (covers all 9 data tabs) ───────────────────────
export const jobCardPatchTabSchema = z.object({
  plug_in_accessories:           z.string().max(8000).optional().or(z.literal('')),
  equipment_submitted_date:      isoDateTimeOrEmpty,
  submitted_by:                  z.string().max(255).optional().or(z.literal('')),
  equipment_received_date_actual: isoDateTimeOrEmpty,
  received_by:                   z.string().max(255).optional().or(z.literal('')),
  instrument_received_date:      isoDateOrEmpty,
  job_complete_planned_date:     isoDateOrEmpty,
  job_type:                      z.enum(JOB_TYPE_OPTIONS).optional(),
  repair_type:                   z.enum(REPAIR_TYPE_OPTIONS).optional(),
  job_request_remarks:           z.string().max(8000).optional().or(z.literal('')),
  equipments_used:               z.string().max(8000).optional().or(z.literal('')),
  awaiting_for:                  z.string().max(255).optional().or(z.literal('')),
  awaiting_status:               z.enum(AWAITING_STATUS_OPTIONS).optional(),
  supplier_name:                 z.string().max(255).optional().or(z.literal('')),
  awaiting_from_date:            isoDateOrEmpty,
  awaiting_clear_date:           isoDateOrEmpty,
  attended_by:                   z.string().max(255).optional().or(z.literal('')),
  indent_no:                     z.string().max(100).optional().or(z.literal('')),
  indent_date:                   isoDateOrEmpty,
  mirv_no:                       z.string().max(100).optional().or(z.literal('')),
  mirv_date:                     isoDateOrEmpty,
  po_no:                         z.string().max(100).optional().or(z.literal('')),
  po_date:                       isoDateOrEmpty,
  procurement_cost:              moneyOrEmpty,
  vendor_supplier_name:          z.string().max(255).optional().or(z.literal('')),
  intimation_sent_on:            isoDateOrEmpty,
  sent_to_vendor_date:           isoDateOrEmpty,
  received_from_vendor_date:     isoDateOrEmpty,
  gate_pass_no:                  z.string().max(100).optional().or(z.literal('')),
  gate_pass_issued_date:         isoDateOrEmpty,
  cost_of_component:             moneyOrEmpty,
  labour_charges:                moneyOrEmpty,
  invoice_no:                    z.string().max(100).optional().or(z.literal('')),
  invoice_recd_on:               isoDateOrEmpty,
  observations_text:             z.string().max(8000).optional().or(z.literal('')),
  job_status_display:            z.enum(JOB_STATUS_DISPLAY_OPTIONS).optional(),
});

// ── Mark Complete ───────────────────────────────────────────────────
export const jobCardMarkCompleteSchema = z.object({
  completion_summary:     z.string().min(20, 'At least 20 characters').max(8000),
  actual_completion_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  total_hours_spent:      z.coerce.number().nonnegative('Cannot be negative').max(99999),
});

// ── Verify Close ────────────────────────────────────────────────────
export const jobCardVerifyCloseSchema = z.object({
  reviewed_by:                    z.string().min(3, 'Reviewer name required').max(255),
  review_date:                    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  review_comments:                z.string().min(20, 'At least 20 characters').max(8000),
  equipment_received_by_customer: z.string().min(3, 'Customer rep name required').max(255),
  customer_received_date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  customer_acknowledged:          z.literal(true, {
    errorMap: () => ({ message: 'Customer must acknowledge satisfactory receipt' }),
  }),
  final_closure_notes:            z.string().max(2000).optional().or(z.literal('')),
});

// ── Reopen ──────────────────────────────────────────────────────────
export const jobCardReopenSchema = z.object({
  reason: z.string()
    .min(20, 'Reopen reason must be at least 20 characters')
    .max(1000, 'Reopen reason cannot exceed 1000 characters'),
});

// ── Maintenance Details row ─────────────────────────────────────────
export const maintenanceRowSchema = z.object({
  defect_description: z.string().min(3, 'At least 3 characters').max(8000),
  observation:        z.string().max(8000).optional().or(z.literal('')),
  action_taken:       z.string().max(8000).optional().or(z.literal('')),
  remarks:            z.string().max(8000).optional().or(z.literal('')),
});

// ── Spares Used row ─────────────────────────────────────────────────
export const spareRowSchema = z.object({
  spare_type:       z.string().max(120).optional().or(z.literal('')),
  source:           z.enum(SPARE_SOURCE_OPTIONS).optional(),
  part_no:          z.string().max(120).optional().or(z.literal('')),
  part_description: z.string().max(8000).optional().or(z.literal('')),
  quantity:         moneyOrEmpty,
  cost:             moneyOrEmpty,
});

// ── Add Task ────────────────────────────────────────────────────────
export const addTaskSchema = z.object({
  task_id:    z.number().int().positive().optional(),
  task_text:  z.string().max(500).optional(),
  is_custom:  z.boolean().optional(),
});

// ── Observation reading row ─────────────────────────────────────────
export const observationRowSchema = z.object({
  parameter:    z.string().min(1).max(255),
  value:        z.string().min(1).max(255),
  unit:         z.string().max(30).optional().or(z.literal('')),
  reading_type: z.enum(READING_TYPE_OPTIONS).optional(),
  notes:        z.string().max(8000).optional().or(z.literal('')),
});
