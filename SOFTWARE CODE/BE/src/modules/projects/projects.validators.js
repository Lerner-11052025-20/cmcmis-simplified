// ============================================================================
// src/modules/projects/projects.validators.js  —  zod validation schemas
// ----------------------------------------------------------------------------
// Enforces strict shape definitions on inbound payload bodies and query parameters.
// ============================================================================

'use strict';

const { z } = require('zod');

const createQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
}).strict();

const createBodySchema = z.object({
  name: z.string().trim()
    .min(2, { message: 'Project name must be at least 2 characters long' })
    .max(50, { message: 'Project name cannot exceed 50 characters' }),
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
    .min(2, { message: 'Project name must be at least 2 characters long' })
    .max(50, { message: 'Project name cannot exceed 50 characters' })
    .optional(),
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
