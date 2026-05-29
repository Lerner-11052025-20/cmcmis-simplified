// ============================================================================
// src/modules/employees/employees.controller.js  —  HTTP handlers (thin)
// ----------------------------------------------------------------------------
// Doctrine 8 — controllers do nothing but marshalling.
// ============================================================================

'use strict';

const service = require('./employees.service');
const { errors } = require('../../middleware/errorHandler');

function actorFromReq(req) {
  return {
    employeeId: req.user.employeeId,
    userId:     req.user.userId,
    role:       req.user.role,
    permissions:req.user.permissions,
  };
}

async function list(req, res, next) {
  try {
    const result = await service.listEmployees(req.query);
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function detail(req, res, next) {
  try {
    const employee = await service.findEmployee(req.params.id);
    if (!employee) return next(errors.notFound(`Employee ${req.params.id} not found`));
    return res.json({ data: employee });
  } catch (e) { return next(e); }
}

async function create(req, res, next) {
  try {
    const result = await service.createEmployee({
      body: req.body,
      actor: actorFromReq(req),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    return res.status(201).json({ data: result });
  } catch (e) { return next(e); }
}

async function update(req, res, next) {
  try {
    const result = await service.updateEmployee({
      employeeId: req.params.id,
      body: req.body,
      actor: actorFromReq(req),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function softDelete(req, res, next) {
  try {
    const result = await service.softDeleteEmployee({
      employeeId: req.params.id,
      actor: actorFromReq(req),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function createAccount(req, res, next) {
  try {
    const result = await service.createAccount({
      employeeId: req.params.id,
      role: req.body.role,
      actor: actorFromReq(req),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    return res.status(201).json({ data: result });
  } catch (e) { return next(e); }
}

module.exports = { list, detail, create, update, softDelete, createAccount };
