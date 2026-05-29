// ============================================================================
// src/modules/adminUsers/adminUsers.controller.js  —  HTTP handlers
// ----------------------------------------------------------------------------
// Doctrine 8 — thin controllers. Read req, call exactly one service
// method, shape the response, forward errors. No SQL, no business rules.
// ============================================================================

'use strict';

const service = require('./adminUsers.service');
const { errors } = require('../../middleware/errorHandler');

function actorFromReq(req) {
  return {
    employeeId: req.user.employeeId,
    userId:     req.user.userId,
    role:       req.user.role,
    permissions:req.user.permissions,
  };
}

function parseId(req) {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw errors.badRequest('Invalid user id');
  }
  return id;
}

async function list(req, res, next) {
  try {
    const result = await service.listUsers(req.query);
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function detail(req, res, next) {
  try {
    const id = parseId(req);
    const user = await service.findUser(id);
    if (!user) return next(errors.notFound(`User ${id} not found`));
    return res.json({ data: user });
  } catch (e) { return next(e); }
}

async function changeRole(req, res, next) {
  try {
    const id = parseId(req);
    const result = await service.changeRole({
      targetUserId: id,
      newRole:      req.body.role,
      reason:       req.body.reason || null,
      actor:        actorFromReq(req),
      ipAddress:    req.ip,
      userAgent:    req.headers['user-agent'] || '',
    });
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function activate(req, res, next) {
  try {
    const id = parseId(req);
    const result = await service.activateUser({
      targetUserId: id,
      reason:       req.body.reason || null,
      actor:        actorFromReq(req),
      ipAddress:    req.ip,
      userAgent:    req.headers['user-agent'] || '',
    });
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function deactivate(req, res, next) {
  try {
    const id = parseId(req);
    const result = await service.deactivateUser({
      targetUserId: id,
      reason:       req.body.reason,
      actor:        actorFromReq(req),
      ipAddress:    req.ip,
      userAgent:    req.headers['user-agent'] || '',
    });
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function forceLogout(req, res, next) {
  try {
    const id = parseId(req);
    const result = await service.forceLogout({
      targetUserId: id,
      reason:       req.body.reason || null,
      actor:        actorFromReq(req),
      ipAddress:    req.ip,
      userAgent:    req.headers['user-agent'] || '',
    });
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function history(req, res, next) {
  try {
    const id = parseId(req);
    const items = await service.listHistory(id, req.query.limit);
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

module.exports = {
  list, detail, changeRole, activate, deactivate, forceLogout, history,
};
