// ============================================================================
// src/modules/employees/employees.validators.js  —  zod schemas
// ----------------------------------------------------------------------------
// Schemas for the employees master-data module.
//
//   listQuerySchema       GET    /admin/employees
//   createSchema          POST   /admin/employees
//   updateSchema          PATCH  /admin/employees/:id
//   createAccountSchema   POST   /admin/employees/:id/create-account
//
// Field widths match the legacy cmms_emp_mst table (SCHEMA_PHASE7.md §3).
// ============================================================================

'use strict';

const { z } = require('zod');
const { ALL_ROLE_CODES } = require('../../utils/lanes');

// ── Atoms ────────────────────────────────────────────────────────────
// Locked employee-id format from FINAL-DESC: ^[A-Z]{2}[0-9]{5}$ — two
// uppercase letters followed by five digits (e.g. SA79900, AC77777).
const EMP_ID_RE = /^[A-Z]{2}[0-9]{5}$/;

const pageSizeEnum = z.coerce.number().int().refine(
  (n) => [10, 25, 50, 100].includes(n),
  { message: 'page_size must be 10, 25, 50, or 100' },
);

const sortEnum = z.enum([
  'full_name', '-full_name',
  'employee_id', '-employee_id',
  '-created_at', 'created_at',
]);

const roleCodeEnum = z.enum([
  ...ALL_ROLE_CODES,
]);

// ── listQuerySchema ─────────────────────────────────────────────────
const listQuerySchema = z.object({
  q:            z.string().max(120).optional(),
  is_active:    z.enum(['0', '1', 'true', 'false']).optional(),
  division_id:  z.coerce.number().int().positive().optional(),
  has_account:  z.enum(['0', '1', 'true', 'false']).optional(),
  sort:         sortEnum.optional().default('full_name'),
  page:         z.coerce.number().int().min(1).max(10000).default(1),
  page_size:    pageSizeEnum.default(25),
}).strict();

// ── createSchema  (POST /admin/employees) ───────────────────────────
const createSchema = z.object({
  employee_id:       z.string().regex(EMP_ID_RE, 'employee_id must match ^[A-Z]{2}[0-9]{5}$'),
  full_name:         z.string().min(2).max(100),
  designation:       z.string().min(2).max(200),
  division_id:       z.coerce.number().int().positive(),
  email:             z.string().email().max(100).optional().or(z.literal('')),
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
}).strict();

// ── updateSchema  (PATCH /admin/employees/:id) ──────────────────────
// employee_id is NOT mutable — it's the PK. Make all other fields optional.
const updateSchema = createSchema.partial().omit({ employee_id: true });

// ── createAccountSchema  (POST /admin/employees/:id/create-account) ──
// Per Q-2: SA picks role at creation time. Default NORMAL_USER if omitted.
// Per Q-1: NO password in body — server generates a 12-char random and
// returns it ONCE in the response (the SA copies + shares offline).
const createAccountSchema = z.object({
  role:            roleCodeEnum.optional().default('NORMAL_USER'),
}).strict();

module.exports = {
  listQuerySchema,
  createSchema,
  updateSchema,
  createAccountSchema,
  EMP_ID_RE,
};
