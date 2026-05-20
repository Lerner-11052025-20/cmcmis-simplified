// ============================================================================
// src/modules/procurement/procurement.routes.js  —  URL wiring
// ----------------------------------------------------------------------------
// PHASE 13 — Procurement sub-module
//
// Mounted at `${env.API_BASE_PATH}/procurement` (= '/api/v1/procurement').
//
// ROUTE TABLE
//
//   PURCHASE ORDERS
//     GET    /purchase-orders                          procurement:read-list
//     GET    /purchase-orders/export                   procurement:export
//     POST   /purchase-orders                          procurement:po-create
//     GET    /purchase-orders/:id                      procurement:read-list
//     PATCH  /purchase-orders/:id                      procurement:po-update
//
//   SPARE PARTS
//     GET    /spare-parts                              procurement:read-list
//     GET    /spare-parts/export                       procurement:export
//     POST   /spare-parts                              procurement:spare-create
//     GET    /spare-parts/:id                          procurement:read-list
//     PATCH  /spare-parts/:id                          procurement:spare-update
//     POST   /spare-parts/:id/order                    procurement:order
//
// PIPELINE NOTE — `/export` is registered BEFORE the matching `/:id` so
// Express does not interpret "export" as an :id param.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const validate     = require('../../middleware/validate');

const v    = require('./procurement.validators');
const ctrl = require('./procurement.controller');

const router = express.Router();

// ════════════════════════════════════════════════════════════════════
//  PURCHASE ORDERS
// ════════════════════════════════════════════════════════════════════

router.get('/purchase-orders',
  authenticate,
  authorize('procurement:read-list'),
  validate(v.poListQuerySchema, 'query'),
  ctrl.listPo,
);

router.get('/purchase-orders/export',
  authenticate,
  authorize('procurement:export'),
  validate(v.exportQuerySchema, 'query'),
  ctrl.exportPo,
);

router.post('/purchase-orders',
  authenticate,
  authorize('procurement:po-create'),
  validate(v.poCreateSchema, 'body'),
  ctrl.createPo,
);

router.get('/purchase-orders/:id',
  authenticate,
  authorize('procurement:read-list'),
  validate(v.idParamSchema, 'params'),
  ctrl.detailPo,
);

router.patch('/purchase-orders/:id',
  authenticate,
  authorize('procurement:po-update'),
  validate(v.idParamSchema, 'params'),
  validate(v.poEditSchema, 'body'),
  ctrl.editPo,
);


// ════════════════════════════════════════════════════════════════════
//  SPARE PARTS
// ════════════════════════════════════════════════════════════════════

router.get('/spare-parts',
  authenticate,
  authorize('procurement:read-list'),
  validate(v.spareListQuerySchema, 'query'),
  ctrl.listSpare,
);

router.get('/spare-parts/export',
  authenticate,
  authorize('procurement:export'),
  validate(v.exportQuerySchema, 'query'),
  ctrl.exportSpare,
);

router.post('/spare-parts',
  authenticate,
  authorize('procurement:spare-create'),
  validate(v.spareCreateSchema, 'body'),
  ctrl.createSpare,
);

router.get('/spare-parts/:id',
  authenticate,
  authorize('procurement:read-list'),
  validate(v.idParamSchema, 'params'),
  ctrl.detailSpare,
);

router.patch('/spare-parts/:id',
  authenticate,
  authorize('procurement:spare-update'),
  validate(v.idParamSchema, 'params'),
  validate(v.spareEditSchema, 'body'),
  ctrl.editSpare,
);

router.post('/spare-parts/:id/order',
  authenticate,
  authorize('procurement:order'),
  validate(v.idParamSchema, 'params'),
  validate(v.spareOrderSchema, 'body'),
  ctrl.orderSpare,
);

module.exports = router;
