// ============================================================================
// src/modules/pdf/pdf.validators.js  —  Zod schemas for PDF endpoints
// ----------------------------------------------------------------------------
// PHASE 11 — PDF Generation
//
// All three PDF endpoints take their target identifier from the URL `:id`
// param. We validate the param shape here so the route can fail fast
// before hitting the repo:
//
//   /api/v1/job-cards/:id/certificate.pdf   — :id = JM_SectionJobNo (varchar(9), e.g. 'J00024219')
//   /api/v1/job-cards/:id/details.pdf       — :id = JM_SectionJobNo
//   /api/v1/job-requests/:id/details.pdf    — :id = JR_JOBREQUESTNO (positive int)
//
// SECURITY NOTES
//   • :id values flow into parameterised SQL via `?` placeholders, so even
//     malicious input is bound, never interpolated. The regex below is
//     defence-in-depth, not the primary protection.
//   • Section job numbers in this codebase come in TWO flavours:
//       - new MVP format "J" + 8 digits (e.g. "J00024219")    — Phase 7 Slice 2
//       - legacy format like "62026043" or "01/24/001"        — pre-MVP rows
//     We accept letters, digits, and "/" so legacy rows can still be opened
//     in the UI. Max length 9 (legacy `JM_SectionJobNo VARCHAR(9)`).
// ============================================================================

'use strict';

const { z } = require('zod');

// ── Section Job No (job card identifier) ────────────────────────────────
// VARCHAR(9). Allow uppercase letters, digits and forward slash (legacy
// rows like "01/24/001"). NO spaces, NO injection-friendly characters.
const sectionJobNoSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, 'Job card id is required')
    .max(9, 'Job card id must be ≤ 9 characters')
    .regex(/^[A-Za-z0-9/]+$/, 'Job card id must contain only letters, digits or /'),
}).strict();

// ── Job Request No (job request identifier) ─────────────────────────────
// JR_JOBREQUESTNO is an INT manual-sequenced primary key. Always positive.
const jobRequestNoSchema = z.object({
  id: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? Number(v) : v))
    .refine((n) => Number.isInteger(n) && n > 0 && n <= 2147483647,
            'Job request id must be a positive integer'),
}).strict();

module.exports = {
  sectionJobNoSchema,
  jobRequestNoSchema,
};
