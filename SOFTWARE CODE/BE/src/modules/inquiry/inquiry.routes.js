// ============================================================================
// src/modules/inquiry/inquiry.routes.js  —  URL wiring (4 tabs)
// ----------------------------------------------------------------------------
// Mounted at `${env.API_BASE_PATH}/inquiry` (= '/api/v1/inquiry').
//
//   GET /vendors      → authenticate → authorize('inquiry:search-vendors')
//   GET /products     → authenticate → authorize('inquiry:search-products')
//   GET /job-cards    → authenticate → authorize('inquiry:search-job-cards')   ← NOT Normal
//   GET /instruments  → authenticate → authorize('inquiry:search-instruments')
//
// Each route runs its own zod schema validator over req.query — bad
// params return 400 before any DB call.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');

const v = require('./inquiry.validators');
const ctrl = require('./inquiry.controller');

const router = express.Router();

// Vendor tab
router.get(
  '/vendors',
  authenticate,
  authorize('inquiry:search-vendors'),
  validate(v.vendorsQuerySchema, 'query'),
  ctrl.vendors,
);

// Product tab
router.get(
  '/products',
  authenticate,
  authorize('inquiry:search-products'),
  validate(v.productsQuerySchema, 'query'),
  ctrl.products,
);

// Job Card Status tab — NORMAL_USER is denied by authorize() (§6.6 matrix).
router.get(
  '/job-cards',
  authenticate,
  authorize('inquiry:search-job-cards'),
  validate(v.jobCardsQuerySchema, 'query'),
  ctrl.jobCards,
);

// Instrument Lookup tab
router.get(
  '/instruments',
  authenticate,
  authorize('inquiry:search-instruments'),
  validate(v.instrumentsQuerySchema, 'query'),
  ctrl.instruments,
);

module.exports = router;
