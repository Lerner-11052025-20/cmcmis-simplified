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
  make_id: z.preprocess((val) => {
    if (val === 'other') return 'other';
    if (!val || val === '') return undefined;
    return Number(val);
  }, z.union([z.number().int().positive(), z.literal('other')], { required_error: 'Required' })),
  model_no: z.string().trim().max(50).optional().default(''),
  mfg_model_name: z.string().trim().max(100).optional().default(''),
  serial_no: z.string().trim().min(1, 'Required').max(50),
  equipment_type_id: z.preprocess((val) => {
    if (val === 'other') return 'other';
    if (!val || val === '') return null;
    return Number(val);
  }, z.union([z.number().int().positive(), z.literal('other')]).nullable().optional()),
  other_equipment_type: z.string().trim().max(100).optional().default(''),
  options_description: z.string().trim().max(250).optional().default(''),

  // §3 — Phase-6 park; FE keeps state, BE accepts but persists only to audit_log.
  accessories: z
    .array(
      z.object({
        accessory_type: z.string().trim().max(40),
        accessory_name: z.string().trim().min(1, 'Required').max(120),
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

  // §6 — Dynamic T&C checkboxes, all must be true
  tc_accepted: z.record(z.literal(true, { errorMap: () => ({ message: 'Required' }) })),
}).superRefine((data, ctx) => {
  if (data.make_id === 'other' && (!data.mfg_model_name || data.mfg_model_name.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Manufacturer Name is required',
      path: ['mfg_model_name'],
    });
  }
  if (data.equipment_type_id === 'other' && (!data.other_equipment_type || data.other_equipment_type.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Equipment Type is required',
      path: ['other_equipment_type'],
    });
  }
});
