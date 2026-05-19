// ============================================================================
// src/modules/jobRequests/jobRequests.controller.js  —  HTTP handlers
// ----------------------------------------------------------------------------
// Thin shims between Express and jobRequests.service. No SQL here, no
// business rules — pull req-shaped data, call the service, shape the
// response envelope { data: ... }, forward errors to next().
// ============================================================================

'use strict';

const service = require('./jobRequests.service');

/**
 * GET /api/v1/job-requests
 * Auth: authenticate → authorizeAny(read-all, read-own) → rowLevelScope
 */
async function list(req, res, next) {
  try {
    const result = await service.listJobRequests(req.query, req.scope);
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

/**
 * POST /api/v1/job-requests
 * Auth: authenticate → authorize('job_request:create')
 * Body: createSchema. submit_now=true triggers Save-then-Submit in one txn.
 */
async function create(req, res, next) {
  try {
    const result = await service.createJobRequest({
      body:      req.body,
      actor: {
        employeeId:  req.user.employeeId,
        role:        req.user.role,
        userId:      req.user.userId,
        permissions: req.user.permissions,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    return res.status(201).json({ data: result });
  } catch (e) { return next(e); }
}

/**
 * POST /api/v1/job-requests/:id/submit
 * Auth: authenticate → authorize('job_request:create') (ownership re-checked in service)
 */
async function submit(req, res, next) {
  try {
    const jrNo = parseInt(req.params.id, 10);
    if (!Number.isFinite(jrNo) || jrNo <= 0) {
      // Defensive — express params are strings; rejecting non-numeric
      // ids here gives a clean 400 instead of a vague 404 later.
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid job request id', details: null },
      });
    }
    const result = await service.submitJobRequest({
      jrNo,
      body:      req.body,
      actor: {
        employeeId:  req.user.employeeId,
        role:        req.user.role,
        userId:      req.user.userId,
        permissions: req.user.permissions,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

// ============================================================================
//                          PHASE 7 SLICE 2  ·  DETAIL / HISTORY
// ============================================================================

/**
 * GET /api/v1/job-requests/:id
 * Auth: authenticate → authorizeAny(read-own, read-all) → rowLevelScope
 *
 * Row-level scope is enforced by the repo (predicate on JR_SUBMITTEDBYID
 * when scope.canReadAll === false). A Normal user probing for another
 * user's JR id gets 404, not 403, so existence isn't leaked.
 */
async function getDetail(req, res, next) {
  try {
    const jrNo = parseInt(req.params.id, 10);
    if (!Number.isFinite(jrNo) || jrNo <= 0) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid job request id', details: null },
      });
    }
    const data = await service.getJobRequestDetail({
      jrNo,
      scope: req.scope,
      actor: {
        employeeId: req.user.employeeId,
        role:       req.user.role,
      },
    });
    return res.json({ data });
  } catch (e) { return next(e); }
}

/**
 * GET /api/v1/job-requests/:id/history
 * Same gate as detail; scope re-checked in service.
 */
async function getHistory(req, res, next) {
  try {
    const jrNo = parseInt(req.params.id, 10);
    if (!Number.isFinite(jrNo) || jrNo <= 0) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid job request id', details: null },
      });
    }
    const items = await service.getJobRequestHistory({ jrNo, scope: req.scope });
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

// ============================================================================
//                          PHASE 7 SLICE 2  ·  CONVERT / REJECT
// ============================================================================

/**
 * POST /api/v1/job-requests/:id/convert
 * Auth: authenticate
 *     → authorize('job_request:approve')
 *     → authorize('job_request:assign-engineer')   (AND — defence in depth)
 *     → validate(convertSchema)
 */
async function postConvert(req, res, next) {
  try {
    const jrNo = parseInt(req.params.id, 10);
    if (!Number.isFinite(jrNo) || jrNo <= 0) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid job request id', details: null },
      });
    }
    const data = await service.convertJobRequest({
      jrNo,
      body:      req.body,
      actor: {
        employeeId:  req.user.employeeId,
        role:        req.user.role,
        userId:      req.user.userId,
        permissions: req.user.permissions,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    return res.status(201).json({ data });
  } catch (e) { return next(e); }
}

/**
 * POST /api/v1/job-requests/:id/reject
 * Auth: authenticate → authorize('job_request:reject') → validate(rejectSchema)
 */
async function postReject(req, res, next) {
  try {
    const jrNo = parseInt(req.params.id, 10);
    if (!Number.isFinite(jrNo) || jrNo <= 0) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid job request id', details: null },
      });
    }
    const data = await service.rejectJobRequest({
      jrNo,
      body:      req.body,
      actor: {
        employeeId:  req.user.employeeId,
        role:        req.user.role,
        userId:      req.user.userId,
        permissions: req.user.permissions,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    return res.json({ data });
  } catch (e) { return next(e); }
}

module.exports = {
  list,
  create,
  submit,
  // Phase 7 Slice 2 additions:
  getDetail,
  getHistory,
  postConvert,
  postReject,
};
