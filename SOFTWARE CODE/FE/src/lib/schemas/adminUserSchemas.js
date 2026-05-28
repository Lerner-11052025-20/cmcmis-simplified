// ============================================================================
// src/lib/schemas/adminUserSchemas.js  —  FE zod mirror of BE validators
// ----------------------------------------------------------------------------
// Keep in lock-step with backend/src/modules/adminUsers/adminUsers.validators.js
// ============================================================================

import { z } from 'zod';

export const ROLE_CODES = [
  'SUPER_ADMIN',
  'LAB_IN_CHARGE',
  'LAB_ENGINEER',
  'NORMAL_USER',
  'VIEW_ONLY',
  'TME_REPAIR_LAB_IN_CHARGE',
  'TME_CAL_LAB_IN_CHARGE',
  'FPE_REPAIR_LAB_IN_CHARGE',
  'FPE_CAL_LAB_IN_CHARGE',
  'TME_REPAIR_LAB_ENG',
  'TME_CAL_LAB_ENG',
  'FPE_REPAIR_LAB_ENG',
  'FPE_CAL_LAB_ENG',
];

export const ROLE_LABELS = {
  SUPER_ADMIN:   'Super Admin',
  LAB_IN_CHARGE: 'Lab In-Charge',
  LAB_ENGINEER:  'Lab Engineer',
  NORMAL_USER:   'Normal User',
  VIEW_ONLY:     'View Only',
  TME_REPAIR_LAB_IN_CHARGE: 'TME Repair Lab In-Charge',
  TME_CAL_LAB_IN_CHARGE:    'TME Calibration Lab In-Charge',
  FPE_REPAIR_LAB_IN_CHARGE: 'FPE Repair Lab In-Charge',
  FPE_CAL_LAB_IN_CHARGE:    'FPE Calibration Lab In-Charge',
  TME_REPAIR_LAB_ENG:       'TME Repair Lab Engineer',
  TME_CAL_LAB_ENG:          'TME Calibration Lab Engineer',
  FPE_REPAIR_LAB_ENG:       'FPE Repair Lab Engineer',
  FPE_CAL_LAB_ENG:          'FPE Calibration Lab Engineer',
};

export const roleChangeSchema = z.object({
  role:   z.enum(ROLE_CODES),
  reason: z.string().max(500).optional().or(z.literal('')),
});

export const deactivateSchema = z.object({
  reason: z.string().min(5, 'Reason is required (min 5 characters)').max(500),
});

export const activateSchema = z.object({
  reason: z.string().max(500).optional().or(z.literal('')),
});

export const forceLogoutSchema = z.object({
  reason: z.string().max(500).optional().or(z.literal('')),
});
