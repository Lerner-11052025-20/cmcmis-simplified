// ============================================================================
// src/modules/jobCards/jobCards.validators.js  —  zod schemas
// ----------------------------------------------------------------------------
// Slice 1 = list only. Single schema for GET /job-cards query params.
// ============================================================================

'use strict';

const { z } = require('zod');

const statusEnum = z.enum([
  'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED_CLOSED', 'REOPENED',
]);

const sortEnum = z.enum([
  '-created_at', 'created_at',
  '-due_date',   'due_date',
  'card_code',   '-card_code',
]);

const pageSizeEnum = z.coerce.number().int().refine(
  (n) => [10, 25, 50, 100].includes(n),
  { message: 'page_size must be 10, 25, 50, or 100' },
);

const listQuerySchema = z.object({
  q:                    z.string().max(120).optional(),
  status:               statusEnum.optional(),
  assigned_engineer_id: z.string().max(7).optional(),
  date_from:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sort:                 sortEnum.optional().default('-created_at'),
  page:                 z.coerce.number().int().min(1).max(10000).default(1),
  page_size:            pageSizeEnum.default(25),
}).strict();

module.exports = { listQuerySchema };
