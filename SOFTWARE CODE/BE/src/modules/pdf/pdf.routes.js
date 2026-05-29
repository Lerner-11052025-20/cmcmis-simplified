// ============================================================================
// src/modules/pdf/pdf.routes.js  —  URL wiring
// ----------------------------------------------------------------------------
// PHASE 11 — PDF Generation
//
// The PDF routes attach to existing module path prefixes (job-cards and
// job-requests) rather than getting their own /pdf prefix. This keeps the
// URLs readable + lets the FE call them straight from the JC / JR detail
// pages without a new base path:
//
//   GET /api/v1/job-cards/:id/certificate.pdf    job_card:download-certificate
//   GET /api/v1/job-cards/:id/details.pdf        job_card:download-details
//   GET /api/v1/job-requests/:id/details.pdf     job_request:download-details
//
// Pipeline (per route):
//   authenticate → authorize(<perm>) → validate(:id) → controller
//
// We expose TWO separate Express routers (jobCardPdfRouter,
// jobRequestPdfRouter) so they can mount under the existing /job-cards
// and /job-requests roots respectively. Both export the same kind of
// router (no shared state).
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const validate     = require('../../middleware/validate');

const v    = require('./pdf.validators');
const ctrl = require('./pdf.controller');

// ── Job Card PDF endpoints (certificate + details) ─────────────────────
// mergeParams:true so the :id param flows through if mounted under a
// parent router that already declared :id (defensive; we mount at the
// /job-cards root via server.js so this is informational).
const jobCardPdfRouter = express.Router({ mergeParams: true });

jobCardPdfRouter.get(
  '/:id/certificate.pdf',
  authenticate,
  authorize('job_card:download-certificate'),
  validate(v.sectionJobNoSchema, 'params'),
  ctrl.jobCardCertificate,
);

jobCardPdfRouter.get(
  '/:id/details.pdf',
  authenticate,
  authorize('job_card:download-details'),
  validate(v.sectionJobNoSchema, 'params'),
  ctrl.jobCardDetails,
);


// ── Job Request PDF endpoint (details) ─────────────────────────────────
const jobRequestPdfRouter = express.Router({ mergeParams: true });

jobRequestPdfRouter.get(
  '/:id/details.pdf',
  authenticate,
  authorize('job_request:download-details'),
  validate(v.jobRequestNoSchema, 'params'),
  ctrl.jobRequestDetails,
);


module.exports = {
  jobCardPdfRouter,
  jobRequestPdfRouter,
};
