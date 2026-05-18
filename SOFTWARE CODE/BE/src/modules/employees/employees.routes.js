// ============================================================================
// src/modules/employees/employees.routes.js  —  URL wiring
// ----------------------------------------------------------------------------
// Mounted at `${env.API_BASE_PATH}/admin/employees`.
//
//   GET    /                         → list             (master:employees:manage)
//   GET    /:id                      → detail           (same)
//   POST   /                         → create           (same)
//   PATCH  /:id                      → update           (same)
//   DELETE /:id                      → softDelete       (same, I-5 guard)
//   POST   /:id/create-account       → createAccount    (same, gens pw once)
//
// All gated by the single permission `master:employees:manage` (SA-only).
// ============================================================================

'use strict';

const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const v = require('./employees.validators');
const ctrl = require('./employees.controller');

const router = express.Router();

router.get('/',
  authenticate,
  authorize('master:employees:manage'),
  validate(v.listQuerySchema, 'query'),
  ctrl.list,
);

router.get('/:id',
  authenticate,
  authorize('master:employees:manage'),
  ctrl.detail,
);

router.post('/',
  authenticate,
  authorize('master:employees:manage'),
  validate(v.createSchema, 'body'),
  ctrl.create,
);

router.patch('/:id',
  authenticate,
  authorize('master:employees:manage'),
  validate(v.updateSchema, 'body'),
  ctrl.update,
);

router.delete('/:id',
  authenticate,
  authorize('master:employees:manage'),
  ctrl.softDelete,
);

router.post('/:id/create-account',
  authenticate,
  authorize('master:employees:manage'),
  validate(v.createAccountSchema, 'body'),
  ctrl.createAccount,
);

module.exports = router;
