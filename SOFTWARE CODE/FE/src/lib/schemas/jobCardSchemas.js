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

export const CALIBRATION_STATUS_OPTIONS = [
  'VALID_CAL',
  'LIMITED_CAL',
  'PARTIAL_CAL',
  'NO_CAL',
];
export const EQUIPMENT_RECEIVED_STATUS_OPTIONS = [
  'OK',
  'NOT_OK',
  'DAMAGED',
  'NOT_WORKING',
  'ACCESSORIES_MISSING',
];
export const CALIBRATION_ADJUSTMENT_OPTIONS = [
  'ADJUSTMENT_DONE',
  'NO_ADJUSTMENT',
  'LIMITED_ADJUSTMENT',
  'NOT_APPLICABLE',
];
export const REPAIR_ACCESSORY_OPTIONS = [
  'POWER_CABLE',
  'USER_MANUAL',
  'CALIBRATION_CERTIFICATE',
  'TEST_PROBES',
  'CARRYING_CASE',
  'PROTECTIVE_COVER',
  'OTHER',
];
export const REPAIR_MAINTENANCE_TYPE_OPTIONS = [
  'CORRECTIVE_MAINTENANCE',
  'PREVENTIVE_MAINTENANCE',
  'BREAKDOWN_MAINTENANCE',
  'CONDITION_BASED_MAINTENANCE',
];
export const REPAIR_FAULT_CATEGORY_OPTIONS = [
  'HARDWARE_FAILURE',
  'SOFTWARE_ISSUE',
  'CALIBRATION_DRIFT',
  'COMPONENT_DAMAGE',
  'WEAR_AND_TEAR',
  'EXTERNAL_DAMAGE',
  'ENVIRONMENTAL',
];
export const REPAIR_FAULTY_SECTION_OPTIONS = [
  'POWER_SUPPLY',
  'DISPLAY_UNIT',
  'CONTROL_PANEL',
  'MAIN_BOARD',
  'SIGNAL_PROCESSING',
  'OUTPUT_STAGE',
  'INPUT_STAGE',
  'MECHANICAL_ASSEMBLY',
  'CONNECTORS_CABLES',
  'FIRMWARE_SOFTWARE',
  'OTHER',
];
export const REPAIR_STATUS_OPTIONS = [
  'REPAIRED',
  'PARTIALLY_REPAIRED',
  'NOT_REPAIRABLE',
  'SENT_TO_CAL_LAB',
  'AWAITING_SPARES',
];
export const REPAIR_NOT_REPAIRABLE_REASON_OPTIONS = [
  'SPARES_NOT_AVAILABLE',
  'OBSOLETE_COMPONENT',
  'PHYSICAL_DAMAGE',
  'ECONOMICALLY_NOT_REPAIRABLE',
  'VENDOR_NOT_SUPPORTED',
  'OTHER',
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
export const CALIBRATION_STATUS_LABELS = {
  VALID_CAL:   'Valid Cal (V)',
  LIMITED_CAL: 'Limited Cal (L)',
  PARTIAL_CAL: 'Partial Cal (P)',
  NO_CAL:      'No Cal (N)',
};
export const EQUIPMENT_RECEIVED_STATUS_LABELS = {
  OK:                  'OK / Working',
  NOT_OK:              'Not OK',
  DAMAGED:             'Damaged',
  NOT_WORKING:         'Not Working',
  ACCESSORIES_MISSING: 'Accessories Missing',
};
export const CALIBRATION_ADJUSTMENT_LABELS = {
  ADJUSTMENT_DONE:    'Adjustment Done',
  NO_ADJUSTMENT:      'No Adjustment',
  LIMITED_ADJUSTMENT: 'Limited Adjustment',
  NOT_APPLICABLE:     'Not Applicable',
};
export const REPAIR_ACCESSORY_LABELS = {
  POWER_CABLE: 'Power Cable',
  USER_MANUAL: 'User Manual',
  CALIBRATION_CERTIFICATE: 'Calibration Certificate',
  TEST_PROBES: 'Test Probes',
  CARRYING_CASE: 'Carrying Case',
  PROTECTIVE_COVER: 'Protective Cover',
  OTHER: 'OTHER',
};
export const REPAIR_MAINTENANCE_TYPE_LABELS = {
  CORRECTIVE_MAINTENANCE: 'Corrective Maintenance',
  PREVENTIVE_MAINTENANCE: 'Preventive Maintenance',
  BREAKDOWN_MAINTENANCE: 'Breakdown Maintenance',
  CONDITION_BASED_MAINTENANCE: 'Condition Based Maintenance',
};
export const REPAIR_FAULT_CATEGORY_LABELS = {
  HARDWARE_FAILURE: 'Hardware Failure',
  SOFTWARE_ISSUE: 'Software Issue',
  CALIBRATION_DRIFT: 'Calibration Drift',
  COMPONENT_DAMAGE: 'Component Damage',
  WEAR_AND_TEAR: 'Wear and Tear',
  EXTERNAL_DAMAGE: 'External Damage',
  ENVIRONMENTAL: 'Environmental',
};
export const REPAIR_FAULTY_SECTION_LABELS = {
  POWER_SUPPLY: 'Power Supply',
  DISPLAY_UNIT: 'Display Unit',
  CONTROL_PANEL: 'Control Panel',
  MAIN_BOARD: 'Main Board',
  SIGNAL_PROCESSING: 'Signal Processing',
  OUTPUT_STAGE: 'Output Stage',
  INPUT_STAGE: 'Input Stage',
  MECHANICAL_ASSEMBLY: 'Mechanical Assembly',
  CONNECTORS_CABLES: 'Connectors / Cables',
  FIRMWARE_SOFTWARE: 'Firmware / Software',
  OTHER: 'OTHER',
};
export const REPAIR_STATUS_LABELS = {
  REPAIRED: 'Repaired',
  PARTIALLY_REPAIRED: 'Partially Repaired',
  NOT_REPAIRABLE: 'Not Repairable',
  SENT_TO_CAL_LAB: 'Sent to Cal Lab',
  AWAITING_SPARES: 'Awaiting Spares',
};
export const REPAIR_NOT_REPAIRABLE_REASON_LABELS = {
  SPARES_NOT_AVAILABLE: 'Spares Not Available',
  OBSOLETE_COMPONENT: 'Obsolete Component',
  PHYSICAL_DAMAGE: 'Physical Damage',
  ECONOMICALLY_NOT_REPAIRABLE: 'Economically Not Repairable',
  VENDOR_NOT_SUPPORTED: 'Vendor Not Supported',
  OTHER: 'OTHER',
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
  cal_job_started_date:           isoDateOrEmpty,
  cal_job_completed_date:         isoDateOrEmpty,
  cal_calibration_status:         z.string().max(80).optional().or(z.literal('')),
  cal_temperature_c:              z.string().max(80).optional().or(z.literal('')),
  cal_relative_humidity:          z.string().max(80).optional().or(z.literal('')),
  cal_ref_no:                     z.string().max(120).optional().or(z.literal('')),
  cal_due_date:                   isoDateOrEmpty,
  calibrated_by_employee_id:      z.string().max(7).optional().or(z.literal('')),
  cal_equipment_received_status:  z.string().max(120).optional().or(z.literal('')),
  cal_repair_carried_out_by:      z.string().max(255).optional().or(z.literal('')),
  cal_sent_to_lab_date:           isoDateOrEmpty,
  cal_received_from_lab_date:     isoDateOrEmpty,
  cal_adjustment_status:          z.string().max(80).optional().or(z.literal('')),
  cal_limited_reason:             z.string().max(8000).optional().or(z.literal('')),
  cal_remarks:                    z.string().max(8000).optional().or(z.literal('')),
  cal_incharge_employee_id:       z.string().max(7).optional().or(z.literal('')),
  cal_incharge_date:              isoDateOrEmpty,
  repair_accessory_selected:       z.string().max(120).optional().or(z.literal('')),
  repair_job_received_date:        isoDateOrEmpty,
  repair_job_start_planned_date:   isoDateOrEmpty,
  repair_maintenance_type:         z.string().max(120).optional().or(z.literal('')),
  repair_faulty_section:           z.string().max(120).optional().or(z.literal('')),
  repair_fault_category:           z.string().max(120).optional().or(z.literal('')),
  repair_attended_by_employee_id:  z.string().max(7).optional().or(z.literal('')),
  repair_fault_description:        z.string().max(8000).optional().or(z.literal('')),
  repair_action_taken_description: z.string().max(8000).optional().or(z.literal('')),
  repair_sent_to_cal_lab_on:       isoDateOrEmpty,
  repair_equipment_received_from_cal_lab: isoDateOrEmpty,
  repair_job_complete_date:        isoDateOrEmpty,
  repair_status:                   z.string().max(80).optional().or(z.literal('')),
  repair_not_repairable_reason:    z.string().max(255).optional().or(z.literal('')),
  repair_remarks:                  z.string().max(8000).optional().or(z.literal('')),
  repair_sent_to_store_on:         isoDateOrEmpty,
  repair_store_ref_number:         z.string().max(120).optional().or(z.literal('')),
  repair_transport_charge:         moneyOrEmpty,
  repair_invoice_cleared_on:       isoDateOrEmpty,
  repair_fault_analysis_description: z.string().max(8000).optional().or(z.literal('')),
  repair_fault_analysis_action_taken: z.string().max(8000).optional().or(z.literal('')),
  repair_fault_analysis_sections:  z.string().max(8000).optional().or(z.literal('')),
  repair_fault_analysis_category:  z.string().max(120).optional().or(z.literal('')),
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

export const repairEquipmentRowSchema = z.object({
  equipment_id:   z.string().max(100).optional().or(z.literal('')),
  equipment_name: z.string().max(255).optional().or(z.literal('')),
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
