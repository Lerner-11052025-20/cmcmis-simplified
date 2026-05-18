// ============================================================================
// src/lib/schemas/adminUserSchemas.js  —  FE zod mirror of BE validators
// ----------------------------------------------------------------------------
// Keep in lock-step with backend/src/modules/adminUsers/adminUsers.validators.js
// ============================================================================

import { z } from 'zod';

export const ROLE_CODES = [
  'SUPER_ADMIN', 'LAB_IN_CHARGE', 'LAB_ENGINEER', 'NORMAL_USER', 'VIEW_ONLY',
];

export const ROLE_LABELS = {
  SUPER_ADMIN:   'Super Admin',
  LAB_IN_CHARGE: 'Lab In-Charge',
  LAB_ENGINEER:  'Lab Engineer',
  NORMAL_USER:   'Normal User',
  VIEW_ONLY:     'View Only',
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
