// ============================================================================
// src/modules/jobRequestTerms/terms.validators.js  —  zod schemas
// ----------------------------------------------------------------------------
// Validation filters to intercept malformed body payloads on CRUD endpoints.
// ============================================================================

'use strict';

const { z } = require('zod');

const createSchema = z.object({
  text: z.string().trim()
    .min(10, { message: 'Terms text must be at least 10 characters long' })
    .max(500, { message: 'Terms text cannot exceed 500 characters' }),
  index_no: z.coerce.number().int().positive({ message: 'Index number must be a positive integer' }),
  is_active: z.preprocess(
    (val) => {
      if (val === 'true' || val === 1 || val === true) return true;
      if (val === 'false' || val === 0 || val === false) return false;
      return val;
    },
    z.boolean()
  ).optional().default(true),
  category: z.enum(['JR', 'EQM']).optional().default('JR'),
}).strict();

const updateSchema = z.object({
  text: z.string().trim()
    .min(10, { message: 'Terms text must be at least 10 characters long' })
    .max(500, { message: 'Terms text cannot exceed 500 characters' })
    .optional(),
  index_no: z.coerce.number().int().positive({ message: 'Index number must be a positive integer' }).optional(),
  is_active: z.preprocess(
    (val) => {
      if (val === 'true' || val === 1 || val === true) return true;
      if (val === 'false' || val === 0 || val === false) return false;
      return val;
    },
    z.boolean()
  ).optional(),
  category: z.enum(['JR', 'EQM']).optional(),
}).strict();

module.exports = {
  createSchema,
  updateSchema,
};
