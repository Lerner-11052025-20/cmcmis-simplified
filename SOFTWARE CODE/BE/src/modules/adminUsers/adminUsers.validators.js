// ============================================================================
// src/modules/adminUsers/adminUsers.validators.js  —  zod schemas
// ----------------------------------------------------------------------------
// Schemas the validate() middleware runs against req.body and req.query.
//
//   listQuerySchema       GET   /admin/users
//   roleChangeSchema      PATCH /admin/users/:id/role
//   activateSchema        PATCH /admin/users/:id/activate
//   deactivateSchema      PATCH /admin/users/:id/deactivate
//   forceLogoutSchema     POST  /admin/users/:id/force-logout
//
// All five role codes are the same set Phase 3 seeded into `roles`:
//   SUPER_ADMIN | LAB_IN_CHARGE | LAB_ENGINEER | NORMAL_USER | VIEW_ONLY
// ============================================================================

'use strict';

const { z } = require('zod');
const { ALL_ROLE_CODES } = require('../../utils/lanes');

// ── Atoms ────────────────────────────────────────────────────────────
const roleCodeEnum = z.enum([
  ...ALL_ROLE_CODES,
]);

const pageSizeEnum = z.coerce.number().int().refine(
  (n) => [10, 25, 50, 100].includes(n),
  { message: 'page_size must be 10, 25, 50, or 100' },
);

const sortEnum = z.enum([
  '-created_at', 'created_at',
  'employee_id', '-employee_id',
  'full_name',   '-full_name',
]);

// ── listQuerySchema ─────────────────────────────────────────────────
const listQuerySchema = z.object({
  q:           z.string().max(120).optional(),
  role:        roleCodeEnum.optional(),
  is_active:   z.enum(['0', '1', 'true', 'false']).optional(),
  division_id: z.coerce.number().int().positive().optional(),
  sort:        sortEnum.optional().default('-created_at'),
  page:        z.coerce.number().int().min(1).max(10000).default(1),
  page_size:   pageSizeEnum.default(25),
}).strict();

// ── roleChangeSchema ────────────────────────────────────────────────
// Reason is optional (Q-4) but recorded into user_role_history when given.
const roleChangeSchema = z.object({
  role:   roleCodeEnum,
  reason: z.string().max(500).optional().or(z.literal('')),
}).strict();

// ── activateSchema ──────────────────────────────────────────────────
// Reason optional on activate — the act of re-enabling a user is benign.
const activateSchema = z.object({
  reason: z.string().max(500).optional().or(z.literal('')),
}).strict();

// ── deactivateSchema ────────────────────────────────────────────────
// Reason REQUIRED ≥5 chars (Q-3). Audit-grade.
const deactivateSchema = z.object({
  reason: z.string().min(5, 'Deactivation reason is required (min 5 characters)').max(500),
}).strict();

// ── forceLogoutSchema ───────────────────────────────────────────────
// Reason recommended (e.g. "suspected credential compromise") but optional.
const forceLogoutSchema = z.object({
  reason: z.string().max(500).optional().or(z.literal('')),
}).strict();

module.exports = {
  listQuerySchema,
  roleChangeSchema,
  activateSchema,
  deactivateSchema,
  forceLogoutSchema,
};
