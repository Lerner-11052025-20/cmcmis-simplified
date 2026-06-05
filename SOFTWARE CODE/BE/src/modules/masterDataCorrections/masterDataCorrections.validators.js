'use strict';

const { z } = require('zod');

const employeeId = z.string().regex(/^[A-Z]{2}[0-9]{5}$/);

const listQuerySchema = z.object({
  status: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED']).optional(),
  q: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  page_size: z.coerce.number().int().refine((n) => [10, 25, 50, 100].includes(n)).default(25),
}).strict();

const contextQuerySchema = z.object({
  eqm_type: z.string().min(1).max(25),
  eqm_id: z.coerce.number().int().positive(),
}).strict();

const createSchema = z.object({
  eqm_type: z.string().min(1).max(25),
  eqm_id: z.number().int().positive(),
  proposed_division_id: z.number().int().positive(),
  lab_phone: z.string().max(60).optional().or(z.literal('')),
  room_phone: z.string().max(60).optional().or(z.literal('')),
  subsystem: z.string().max(120).optional().or(z.literal('')),
  reason: z.string().min(10).max(4000),
  sec_head_employee_id: employeeId.optional().nullable(),
  div_head_employee_id: employeeId.optional().nullable(),
  group_head_employee_id: employeeId.optional().nullable(),
  entity_head_employee_id: employeeId.optional().nullable(),
  centre_head_employee_id: employeeId.optional().nullable(),
}).strict();

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

const reviewSchema = z.object({
  notes: z.string().max(2000).optional().or(z.literal('')),
}).strict();

module.exports = {
  listQuerySchema,
  contextQuerySchema,
  createSchema,
  idParamSchema,
  reviewSchema,
};
