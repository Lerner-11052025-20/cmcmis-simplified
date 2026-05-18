// ============================================================================
// src/lib/schemas/employeeSchemas.js  —  FE zod mirror of BE validators
// ----------------------------------------------------------------------------

import { z } from 'zod';

// Locked format from FINAL-DESC: ^[A-Z]{2}[0-9]{5}$
export const EMP_ID_RE = /^[A-Z]{2}[0-9]{5}$/;

export const employeeCreateSchema = z.object({
  employee_id:       z.string().regex(EMP_ID_RE, 'Employee ID must match ^[A-Z]{2}[0-9]{5}$ (e.g. AC12345)'),
  full_name:         z.string().min(2, 'Full name is required').max(100),
  designation:       z.string().min(2, 'Designation is required').max(200),
  division_id:       z.coerce.number().int().positive({ message: 'Division is required' }),
  email:             z.string().email('Invalid email').max(100).optional().or(z.literal('')),
  mobile:            z.string().max(100).optional().or(z.literal('')),
  lab_phone:         z.string().max(100).optional().or(z.literal('')),
  room_phone:        z.string().max(100).optional().or(z.literal('')),
  blood_group:       z.string().max(50).optional().or(z.literal('')),
  date_of_birth:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  date_of_joining:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  address:           z.string().max(200).optional().or(z.literal('')),
  city:              z.string().max(100).optional().or(z.literal('')),
  state:             z.string().max(100).optional().or(z.literal('')),
  zip:               z.string().max(100).optional().or(z.literal('')),
  remarks:           z.string().max(500).optional().or(z.literal('')),
});

// Edit form: same shape minus the locked employee_id field.
export const employeeUpdateSchema = employeeCreateSchema.partial().omit({ employee_id: true });
