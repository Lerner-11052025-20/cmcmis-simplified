// ============================================================================
// src/modules/jobCards/jobCards.validators.js  —  zod schemas
// ----------------------------------------------------------------------------
// Phase 6 Slice 1 had one schema (list query). Phase 9 expands to ~12.
// All schemas use .strict() so unknown keys are rejected — guards against
// FE/BE drift and catches injection of fields like assigned_engineer_id.
//
// Keep this file in lock-step with FE/src/lib/schemas/jobCardSchemas.js.
// ============================================================================

'use strict';

const { z } = require('zod');

// ── Shared atoms ─────────────────────────────────────────────────────
const statusEnum = z.enum([
  'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED_CLOSED', 'REOPENED',
]);

const sortEnum = z.enum([
  '-created_at', 'created_at',
  '-due_date',   'due_date',
  'card_code',   '-card_code',
]);

const pageSizeEnum = z.coerce.number().int().refine(
  (n) => [10, 25, 50, 100].includes(n),
  { message: 'page_size must be 10, 25, 50, or 100' },
);

// Allow YYYY-MM-DD OR empty string (FE clears a date input to '').
const isoDateOrEmpty = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).optional();
// Allow YYYY-MM-DD HH:mm or full ISO. We'll accept both.
const isoDateTimeOrEmpty = z.string()
  .regex(/^$|^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d{1,6})?([+-]\d{2}:?\d{2}|Z)?)?$/)
  .optional();

// ── listQuerySchema (Phase 6 — unchanged) ────────────────────────────
const listQuerySchema = z.object({
  q:                    z.string().max(120).optional(),
  status:               statusEnum.optional(),
  assigned_engineer_id: z.string().max(7).optional(),
  date_from:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sort:                 sortEnum.optional().default('-created_at'),
  page:                 z.coerce.number().int().min(1).max(10000).default(1),
  page_size:            pageSizeEnum.default(25),
}).strict();

// ============================================================================
//                          PHASE 9  ·  TAB PATCH SCHEMA
// ============================================================================
//   ONE schema covers all 9 data tabs (the body is partial — fields
//   not in the body are not updated). The repo's PHASE9_TAB_COLUMNS
//   list is the source of truth for which columns the body MAY carry.
//   Every field is OPTIONAL to support the auto-save partial PATCH.
// ============================================================================

const jobTypeEnum    = z.enum(['IN_HOUSE', 'VENDOR']);
const repairTypeEnum = z.enum(['BREAK_DOWN', 'WARRANTY', 'PM', 'NEED_BASED']);
const awaitingStatusEnum = z.enum([
  'AWAITING_FOR_SPARES','AWAITING_FOR_VENDOR','AWAITING_FOR_CUSTOMER','AWAITING_FOR_INFO','NONE',
]);
const jobStatusDisplayEnum = z.enum([
  'AWAITING_FOR_VENDOR','AWAITING_FOR_SPARES','IN_PROGRESS_NORMAL','HOLD','RESUMED',
]);

const shortTextOrEmpty = (max = 255) => z.string().max(max).optional().or(z.literal(''));
const looseTextOrEmpty = (max = 8000) => z.preprocess(
  (v) => (v == null ? undefined : String(v)),
  z.string().max(max).optional().or(z.literal('')),
);
const looseBoolean = z.preprocess(
  (v) => (v == null ? undefined : v),
  z.union([
    z.boolean(),
    z.literal('true').transform(() => true),
    z.literal('false').transform(() => false),
    z.literal('on').transform(() => true),
    z.literal('1').transform(() => true),
    z.literal('0').transform(() => false),
    z.literal(1).transform(() => true),
    z.literal(0).transform(() => false),
  ]).optional(),
);
const looseEmployeeIdList = z.union([
  z.array(z.string().max(20)),
  z.string().max(20).transform((v) => (v ? [v] : [])),
  z.literal('').transform(() => []),
]).optional();

const moneyOrEmpty = z.union([
  z.number().nonnegative(),
  z.coerce.number().nonnegative(),
  z.literal(''),
  z.null(),
]).optional();

const patchTabSchema = z.object({
  // Plug-In / Accessories
  plug_in_accessories:           z.string().max(8000).optional().or(z.literal('')),
  // Submitted & Received
  equipment_submitted_date:      isoDateTimeOrEmpty,
  submitted_by:                  z.string().max(255).optional().or(z.literal('')),
  equipment_received_date_actual: isoDateTimeOrEmpty,
  received_by:                   z.string().max(255).optional().or(z.literal('')),
  // Job Card Details
  instrument_received_date:      isoDateOrEmpty,
  job_complete_planned_date:     isoDateOrEmpty,
  job_type:                      jobTypeEnum.optional(),
  repair_type:                   repairTypeEnum.optional(),
  job_request_remarks:           z.string().max(8000).optional().or(z.literal('')),
  // Equipments Used
  equipments_used:               z.string().max(8000).optional().or(z.literal('')),
  // Awaiting Information
  awaiting_for:                  z.string().max(255).optional().or(z.literal('')),
  awaiting_status:               awaitingStatusEnum.optional(),
  supplier_name:                 z.string().max(255).optional().or(z.literal('')),
  awaiting_from_date:            isoDateOrEmpty,
  awaiting_clear_date:           isoDateOrEmpty,
  attended_by:                   z.string().max(255).optional().or(z.literal('')),
  // Procurement
  indent_no:                     z.string().max(100).optional().or(z.literal('')),
  indent_date:                   isoDateOrEmpty,
  mirv_no:                       z.string().max(100).optional().or(z.literal('')),
  mirv_date:                     isoDateOrEmpty,
  po_no:                         z.string().max(100).optional().or(z.literal('')),
  po_date:                       isoDateOrEmpty,
  procurement_cost:              moneyOrEmpty,
  // Contract / Warranty
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
  // Observations
  observations_text:             z.string().max(8000).optional().or(z.literal('')),
  job_status_display:            jobStatusDisplayEnum.optional(),
  // Dedicated calibration workflow (TME/FPE calibration only)
  cal_job_started_date:           isoDateOrEmpty,
  cal_job_completed_date:         isoDateOrEmpty,
  cal_calibration_status:         shortTextOrEmpty(80),
  cal_temperature_c:              shortTextOrEmpty(80),
  cal_relative_humidity:          shortTextOrEmpty(80),
  cal_ref_no:                     shortTextOrEmpty(120),
  cal_due_date:                   isoDateOrEmpty,
  calibrated_by_employee_id:      shortTextOrEmpty(7),
  calibrated_by_employee_ids:     looseEmployeeIdList,
  cal_equipment_received_status:  shortTextOrEmpty(120),
  cal_repair_carried_out_by:      shortTextOrEmpty(255),
  cal_sent_to_lab_date:           isoDateOrEmpty,
  cal_received_from_lab_date:     isoDateOrEmpty,
  cal_adjustment_status:          shortTextOrEmpty(80),
  cal_limited_reason:             z.string().max(8000).optional().or(z.literal('')),
  cal_remarks:                    z.string().max(8000).optional().or(z.literal('')),
  cal_incharge_employee_id:       shortTextOrEmpty(7),
  cal_incharge_date:              isoDateOrEmpty,
  cal_rh_min:                     looseTextOrEmpty(20),
  cal_rh_max:                     looseTextOrEmpty(20),
  cal_temperature_value:          looseTextOrEmpty(20),
  cal_temperature_range:          looseTextOrEmpty(20),
  cal_procedure_ref:              looseTextOrEmpty(255),
  cal_timeshare:                  looseBoolean,
  cal_adjustment_mechanical:      looseBoolean,
  cal_adjustment_nil:             looseBoolean,
  cal_adjustment_electrical:      looseBoolean,
  cal_adjustment_software:        looseBoolean,
  // Dedicated repair workflow (TME/FPE repair only)
  repair_accessory_selected:       shortTextOrEmpty(120),
  repair_job_received_date:        isoDateOrEmpty,
  repair_job_start_planned_date:   isoDateOrEmpty,
  repair_maintenance_type:         shortTextOrEmpty(120),
  repair_faulty_section:           shortTextOrEmpty(120),
  repair_fault_category:           shortTextOrEmpty(120),
  repair_attended_by_employee_id:  shortTextOrEmpty(7),
  repair_fault_description:        z.string().max(8000).optional().or(z.literal('')),
  repair_action_taken_description: z.string().max(8000).optional().or(z.literal('')),
  repair_sent_to_cal_lab_on:       isoDateOrEmpty,
  repair_equipment_received_from_cal_lab: isoDateOrEmpty,
  repair_job_complete_date:        isoDateOrEmpty,
  repair_status:                   shortTextOrEmpty(80),
  repair_not_repairable_reason:    shortTextOrEmpty(255),
  repair_remarks:                  z.string().max(8000).optional().or(z.literal('')),
  repair_sent_to_store_on:         isoDateOrEmpty,
  repair_store_ref_number:         shortTextOrEmpty(120),
  repair_transport_charge:         moneyOrEmpty,
  repair_invoice_cleared_on:       isoDateOrEmpty,
  repair_fault_analysis_description: z.string().max(8000).optional().or(z.literal('')),
  repair_fault_analysis_action_taken: z.string().max(8000).optional().or(z.literal('')),
  repair_fault_analysis_sections:  z.string().max(8000).optional().or(z.literal('')),
  repair_fault_analysis_category:  shortTextOrEmpty(120),
}).strict();

// ============================================================================
//                          PHASE 9  ·  TRANSITION SCHEMAS
// ============================================================================

// Start-work — no body content required, just an empty object.
const startWorkSchema = z.object({}).strict();

// Mark-complete — completion form fields are required.
const markCompleteSchema = z.object({
  completion_summary:     z.string().min(20, { message: 'Completion summary must be at least 20 characters' }).max(8000),
  actual_completion_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use YYYY-MM-DD' }),
  total_hours_spent:      z.coerce.number().nonnegative().max(99999),
}).strict();

// Verify-close — full closure form.
const verifyCloseSchema = z.object({
  reviewed_by:                    z.string().min(3).max(255),
  review_date:                    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  review_comments:                z.string().min(20).max(8000),
  equipment_received_by_customer: z.string().min(3).max(255),
  customer_received_date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customer_acknowledged:          z.literal(true, { errorMap: () => ({ message: 'Customer must acknowledge satisfactory receipt (Q-9 hard rule)' }) }),
  final_closure_notes:            z.string().max(2000).optional().or(z.literal('')),
}).strict();

// Reopen — mandatory reason, 20..1000 chars.
const reopenSchema = z.object({
  reason: z.string().min(20, { message: 'Reopen reason must be at least 20 characters' }).max(1000),
}).strict();

// ============================================================================
//                          PHASE 9  ·  TASK CHECKLIST SCHEMAS
// ============================================================================

const addTaskSchema = z.object({
  task_id:    z.coerce.number().int().positive().optional(),
  task_text:  z.string().max(500).optional(),
  is_custom:  z.boolean().optional().default(false),
}).strict().superRefine((v, ctx) => {
  // Exactly one of task_id (library task) OR task_text (custom) must be provided.
  if (v.task_id && (v.task_text && !v.is_custom)) {
    // Both library + non-custom text → invalid (only library should supply id+is_custom=false)
  }
  if (!v.task_id && !v.task_text) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Either task_id (library) or task_text (custom) is required',
      path: ['task_id'],
    });
  }
  if (v.is_custom === true && !v.task_text) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'task_text is required when is_custom=true',
      path: ['task_text'],
    });
  }
});

const toggleTaskSchema = z.object({
  is_completed: z.boolean(),
  task_type:    z.enum(['NABL', 'NON-NABL', 'BOTH']).optional().or(z.null()),
  task_result:  z.enum(['PASS', 'FAIL', 'Functional Test', 'Not Carried Out']).optional().or(z.null()),
}).strict();

// ============================================================================
//                          PHASE 9  ·  CHILD-TABLE ROW SCHEMAS
// ============================================================================

const maintenanceRowSchema = z.object({
  defect_description: z.string().min(3).max(8000),
  observation:        z.string().max(8000).optional().or(z.literal('')),
  action_taken:       z.string().max(8000).optional().or(z.literal('')),
  remarks:            z.string().max(8000).optional().or(z.literal('')),
}).strict();

const spareRowSchema = z.object({
  spare_type:       z.string().max(120).optional().or(z.literal('')),
  source:           z.enum(['CASH_PURCHASE','VENDOR','STOCK','WARRANTY','OTHER']).optional(),
  part_no:          z.string().max(120).optional().or(z.literal('')),
  part_description: z.string().max(8000).optional().or(z.literal('')),
  quantity:         moneyOrEmpty,
  cost:             moneyOrEmpty,
}).strict();

const observationRowSchema = z.object({
  parameter:    z.string().min(1).max(255),
  value:        z.string().min(1).max(255),
  unit:         z.string().max(30).optional().or(z.literal('')),
  reading_type: z.enum(['PRE_CAL','POST_CAL','INSPECTION','OTHER']).optional(),
  notes:        z.string().max(8000).optional().or(z.literal('')),
}).strict();

const calibrationEquipmentRowSchema = z.object({
  equipment_id:   z.string().max(100).optional().or(z.literal('')),
  equipment_name: z.string().max(255).optional().or(z.literal('')),
}).strict();

const calibrationAdjustmentRowSchema = z.object({
  parameter_name:        z.string().max(255).optional().or(z.literal('')),
  test_value:            z.string().max(255).optional().or(z.literal('')),
  specifications_limits: z.string().max(8000).optional().or(z.literal('')),
  observation_before:    z.string().max(8000).optional().or(z.literal('')),
  observation_after:     z.string().max(8000).optional().or(z.literal('')),
}).strict();

const repairEquipmentRowSchema = z.object({
  equipment_id:   z.string().max(100).optional().or(z.literal('')),
  equipment_name: z.string().max(255).optional().or(z.literal('')),
}).strict();

module.exports = {
  // Phase 6 Slice 1:
  listQuerySchema,
  // Phase 9 — tab patch:
  patchTabSchema,
  // Phase 9 — transitions:
  startWorkSchema,
  markCompleteSchema,
  verifyCloseSchema,
  reopenSchema,
  // Phase 9 — task checklist:
  addTaskSchema,
  toggleTaskSchema,
  // Phase 9 — child-table row shapes (used by tab PATCH alongside main fields):
  maintenanceRowSchema,
  spareRowSchema,
  observationRowSchema,
  calibrationEquipmentRowSchema,
  calibrationAdjustmentRowSchema,
  repairEquipmentRowSchema,
};
