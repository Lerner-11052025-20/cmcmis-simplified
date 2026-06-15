// ============================================================================
// src/modules/equipment/equipment.routes.js  —  URL wiring
// ----------------------------------------------------------------------------
// Mounted at `${env.API_BASE_PATH}/equipment` (= '/api/v1/equipment').
//
// ROUTE TABLE
//
//   GET    /equipment              → authenticate → authorize('equipment:read-list')
//                                     → validate(listQuerySchema, 'query') → getList
//   POST   /equipment              → authenticate → authorize('equipment:create')
//                                     → validate(createEquipmentSchema)   → postCreate
//
//   GET    /equipment/types        → authenticate → authorize('equipment:read-list')
//                                     → getTypes   (FE dropdown helper)
//   GET    /equipment/makes        → authenticate → authorize('equipment:read-list')
//                                     → getMakes   (FE dropdown helper)
//   GET    /equipment/divisions    → authenticate → authorize('equipment:read-list')
//                                     → getDivisions (FE dropdown helper)
//
//   GET    /equipment/:id          → STUB → 404 "Ships in Phase 6"
//   PATCH  /equipment/:id          → STUB → 404 "Ships in Phase 6"
//   POST   /equipment/:id/verify   → STUB → 404 "Ships in Phase 6"
//   POST   /equipment/:id/condemn  → STUB → 404 "Ships in Phase 6"
//   DELETE /equipment/:id          → STUB → 404 "Ships in Phase 6"
//
// IMPORTANT ORDER:
//   The helper sub-routes (/types, /makes, /divisions) MUST be declared
//   BEFORE the `/:id` stub — otherwise Express would route them as ids.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { errors } = require('../../middleware/errorHandler');

const { listQuerySchema, createEquipmentSchema, updateEquipmentSchema } = require('./equipment.validators');
const ctrl = require('./equipment.controller');

const router = express.Router();

function requireSuperAdmin(req, _res, next) {
  if (req.user?.role !== 'SUPER_ADMIN') {
    req.log?.warn?.(
      {
        employeeId: req.user?.employeeId,
        role: req.user?.role,
        path: req.originalUrl,
      },
      'Equipment verification denied: SUPER_ADMIN role required',
    );
    return next(errors.forbidden('SUPER_ADMIN access required'));
  }

  return next();
}

// ── Helpers MUST come before /:id to win the match race ───────────────
router.get('/types', authenticate, authorize('equipment:read-list'), ctrl.getTypes);
router.get('/makes', authenticate, authorize('equipment:read-list'), ctrl.getMakes);
router.get('/divisions', authenticate, authorize('equipment:read-list'), ctrl.getDivisions);
router.get('/projects', authenticate, authorize('equipment:read-list'), ctrl.getProjects);
router.get('/export-pdf', authenticate, authorize('equipment:read-list'), ctrl.exportPdf);

// ── List + Create (implemented this phase) ────────────────────────────
router.get('/',
  authenticate,
  authorize('equipment:read-list'),
  validate(listQuerySchema, 'query'),
  ctrl.getList,
);

router.post('/',
  authenticate,
  authorize('equipment:create'),
  validate(createEquipmentSchema, 'body'),
  ctrl.postCreate,
);

// ── PHASE 15  ·  BULK CALIBRATION DONE ───────────────────────────────
// Placed BEFORE /:id stubs — Express would otherwise swallow the static
// segment "bulk-cal-done" as the :id parameter.

router.post('/bulk-cal-done',
  authenticate,
  authorize('equipment:bulk-cal-done'),
  ctrl.postBulkCalibrationDone,
);

// ── Phase-6 stubs (lock the URL surface + permission gates now) ───────
router.get('/:id',
  authenticate, authorize('equipment:read-detail'), ctrl.getDetail);

const PHASE6 = (_req, _res, next) => next(errors.notFound('Ships in Phase 6'));

router.patch('/:id',
  authenticate,
  authorize('equipment:update'),
  validate(updateEquipmentSchema, 'body'),
  ctrl.patchEquipment);
router.post('/:id/verify',
  authenticate, authorize('equipment:verify'),      requireSuperAdmin, ctrl.postVerify);
router.post('/:id/condemn',
  authenticate, authorize('equipment:condemn'),     PHASE6);
router.delete('/:id',
  authenticate, authorize('equipment:delete'),      ctrl.deleteEquipment);

module.exports = router;
