'use strict';

const { z } = require('zod');

const taskSchema = z.object({
  task_id: z.coerce.number().int().positive().optional().nullable(),
  task_text: z.string().trim().min(3).max(500),
  task_type: z.enum(['NABL', 'NON-NABL', 'BOTH']).default('NABL'),
  is_custom: z.boolean().optional().default(false),
}).strict();

const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
}).strict();

const taskQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
  limit: z.coerce.number().int().min(1).max(5000).optional().default(2000),
}).strict();

const equipmentQuerySchema = z.object({
  code: z.string().trim().min(1).max(50),
}).strict();

const forEquipmentQuerySchema = z.object({
  equipment_type: z.string().trim().min(1).max(15),
  equipment_id: z.coerce.number().int().positive(),
}).strict();

const createBodySchema = z.object({
  equipment_code: z.string().trim().min(1).max(50),
  checklist_name: z.string().trim().min(3).max(150),
  tasks: z.array(taskSchema).min(1).max(300),
  is_active: z.boolean().optional().default(true),
}).strict();

const updateBodySchema = createBodySchema;

const applyBodySchema = z.object({
  checklist_id: z.coerce.number().int().positive(),
}).strict();

module.exports = {
  listQuerySchema,
  taskQuerySchema,
  equipmentQuerySchema,
  forEquipmentQuerySchema,
  createBodySchema,
  updateBodySchema,
  applyBodySchema,
};
