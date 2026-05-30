// ============================================================================
// src/modules/tasks/tasks.validators.js  —  zod validation schemas
// ----------------------------------------------------------------------------
// Enforces strict shape definitions on inbound payload bodies and query parameters.
// ============================================================================

'use strict';

const { z } = require('zod');

const createQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  page_size: z.coerce.number().int().min(1).max(10000).default(25),
  q: z.string().trim().max(100).optional(),
  type: z.string().trim().max(50).optional(),
}).strict();

const createBodySchema = z.object({
  name: z.string().trim()
    .min(2, { message: 'Task name must be at least 2 characters long' })
    .max(100, { message: 'Task name cannot exceed 100 characters' }),
  type: z.string().trim()
    .min(2, { message: 'Task type must be at least 2 characters long' })
    .max(50, { message: 'Task type cannot exceed 50 characters' }),
  desc: z.string().trim().max(200).optional().nullable(),
  est_hour: z.coerce.number().nonnegative().optional().nullable(),
  is_active: z.preprocess(
    (val) => {
      if (val === 'true' || val === 1 || val === true) return true;
      if (val === 'false' || val === 0 || val === false) return false;
      return val;
    },
    z.boolean()
  ).optional().default(true),
}).strict();

const updateBodySchema = z.object({
  name: z.string().trim()
    .min(2, { message: 'Task name must be at least 2 characters long' })
    .max(100, { message: 'Task name cannot exceed 100 characters' })
    .optional(),
  type: z.string().trim()
    .min(2, { message: 'Task type must be at least 2 characters long' })
    .max(50, { message: 'Task type cannot exceed 50 characters' })
    .optional(),
  desc: z.string().trim().max(200).optional().nullable(),
  est_hour: z.coerce.number().nonnegative().optional().nullable(),
  is_active: z.preprocess(
    (val) => {
      if (val === 'true' || val === 1 || val === true) return true;
      if (val === 'false' || val === 0 || val === false) return false;
      return val;
    },
    z.boolean()
  ).optional(),
}).strict();

module.exports = {
  createQuerySchema,
  createBodySchema,
  updateBodySchema,
};
