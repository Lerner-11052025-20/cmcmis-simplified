// ============================================================================
// src/lib/schemas/equipmentSchema.js  —  Mirror of BE create schema
// ----------------------------------------------------------------------------
// Same shape as BE/src/modules/equipment/equipment.validators.js
// `createEquipmentSchema`. Used by react-hook-form on the Equipment Form
// to reject malformed payloads before they hit the network. The BE
// re-validates with the identical schema — never trust a client.
//
// Keep these in lock-step. Any field added to the BE schema must also
// be added here.
// ============================================================================

import { z } from 'zod';

export const JOB_CATEGORIES = ['T&ME', 'F&PE'];
export const COST_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const equipmentSchema = z.object({
  job_category: z.enum(['T&ME', 'F&PE'], { required_error: 'Job Category is required' }),
  job_type: z.literal('Registration'),

  // §2
  name: z.string().trim().min(2, 'Required').max(100),
  make_id: z.coerce.number({ invalid_type_error: 'Required' }).int().positive('Required'),
  model_no: z.string().trim().max(50).optional().default(''),
  mfg_model_name: z.string().trim().max(100).optional().default(''),
  serial_no: z.string().trim().min(1, 'Required').max(50),
  equipment_type_id: z.coerce.number().int().positive().nullish(),
  options_description: z.string().trim().max(250).optional().default(''),

  // §3 — Phase-6 park; FE keeps state, BE accepts but persists only to audit_log.
  accessories: z
    .array(
      z.object({
        accessory_type: z.string().trim().max(40),
        accessory_name: z.string().trim().min(1).max(120),
        serial_no: z.string().trim().max(80).optional().default(''),
      }),
    )
    .max(20)
    .default([]),

  // §4
  po_number: z.string().trim().min(1, 'Required').max(50),
  po_date: z.string().regex(ISO_DATE, 'Use YYYY-MM-DD'),
  mivr_number: z.string().trim().min(1, 'Required').max(40),
  mivr_date: z.string().regex(ISO_DATE, 'Use YYYY-MM-DD'),
  line_item_code: z.string().trim().min(1, 'Required').max(40),
  cost: z.coerce.number({ invalid_type_error: 'Required' }).nonnegative('Must be ≥ 0'),
  cost_currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).default('INR'),
  warranty_months: z.coerce.number().int().nonnegative().max(600).optional().default(0),

  // §5
  lab_phone: z.string().trim().max(20).optional().default(''),
  room_phone: z.string().trim().max(20).optional().default(''),
  division_id: z.coerce.number({ invalid_type_error: 'Required' }).int().positive('Required'),
  subsystem: z.string().trim().max(80).optional().default(''),
  project: z.string().trim().max(120).optional().default(''),
  complaint_description: z.string().trim().min(5, 'At least 5 characters').max(2000),
  remarks: z.string().trim().max(500).optional().default(''),

  // §6 — all six MUST be true
  tc_accepted: z.object({
    tc_1: z.literal(true, { errorMap: () => ({ message: 'Required' }) }),
    tc_2: z.literal(true, { errorMap: () => ({ message: 'Required' }) }),
    tc_3: z.literal(true, { errorMap: () => ({ message: 'Required' }) }),
    tc_4: z.literal(true, { errorMap: () => ({ message: 'Required' }) }),
    tc_5: z.literal(true, { errorMap: () => ({ message: 'Required' }) }),
    tc_6: z.literal(true, { errorMap: () => ({ message: 'Required' }) }),
  }),
});
