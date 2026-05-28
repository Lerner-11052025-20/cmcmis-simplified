// ============================================================================
// src/modules/equipment/equipment.controller.js  —  HTTP handlers
// ----------------------------------------------------------------------------
// Thin shims between Express and equipment.service. No SQL here, no
// business rules — just pull req-shaped data, call the service, shape
// the response envelope { data: ... }, forward errors to next().
// ============================================================================

'use strict';

const service = require('./equipment.service');

async function getList(req, res, next) {
  try {
    const result = await service.listEquipment(req.query);
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function getDetail(req, res, next) {
  try {
    const result = await service.getEquipmentDetail(req.params.id);
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function postCreate(req, res, next) {
  try {
    const result = await service.createEquipment({
      body: req.body,
      actor: {
        employeeId: req.user.employeeId,
        role: req.user.role,
        userId: req.user.userId,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    return res.status(201).json({ data: result });
  } catch (e) { return next(e); }
}

async function getTypes(req, res, next) {
  try {
    const items = await service.listTypes();
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

async function getMakes(req, res, next) {
  try {
    const items = await service.listMakes();
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

async function getDivisions(req, res, next) {
  try {
    const items = await service.listDivisions();
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

// ============================================================================
//                     PHASE 15  ·  BULK CALIBRATION DONE
// ============================================================================

/**
 * POST /api/v1/equipment/bulk-cal-done
 * Auth: authenticate → authorize('equipment:bulk-cal-done')  [SUPER_ADMIN only]
 *
 * No body required. Returns { updated_count: number }.
 */
async function postBulkCalibrationDone(req, res, next) {
  try {
    const result = await service.bulkMarkCalibrationDone({
      actor: {
        employeeId: req.user.employeeId,
        role:       req.user.role,
        userId:     req.user.userId,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function postVerify(req, res, next) {
  try {
    const result = await service.verifyEquipment({
      id: req.params.id,
      actor: {
        employeeId: req.user.employeeId,
        role:       req.user.role,
        userId:     req.user.userId,
      },
    });
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

module.exports = { getList, getDetail, postCreate, getTypes, getMakes, getDivisions, postBulkCalibrationDone, postVerify };
