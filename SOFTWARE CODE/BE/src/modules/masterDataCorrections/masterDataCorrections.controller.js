'use strict';

const service = require('./masterDataCorrections.service');

function actorFromReq(req) {
  return {
    employeeId: req.user.employeeId,
    role: req.user.role,
    userId: req.user.userId,
    authSource: req.user.authSource || 'PASSWORD',
    permissions: req.user.permissions || [],
    laneScopes: req.user.laneScopes || [],
  };
}

async function context(req, res, next) {
  try {
    const result = await service.getContext({
      actor: actorFromReq(req),
      query: req.query,
    });
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function create(req, res, next) {
  try {
    const result = await service.createRequest({
      body: req.body,
      actor: actorFromReq(req),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    return res.status(201).json({ data: result });
  } catch (e) { return next(e); }
}

async function list(req, res, next) {
  try {
    const result = await service.listRequests(req.query);
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function approve(req, res, next) {
  try {
    const result = await service.approveRequest({
      requestId: req.params.id,
      body: req.body,
      actor: actorFromReq(req),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function reject(req, res, next) {
  try {
    const result = await service.rejectRequest({
      requestId: req.params.id,
      body: req.body,
      actor: actorFromReq(req),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

module.exports = {
  context,
  create,
  list,
  approve,
  reject,
};
