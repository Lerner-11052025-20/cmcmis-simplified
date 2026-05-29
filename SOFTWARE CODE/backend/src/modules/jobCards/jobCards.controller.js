// ============================================================================
// src/modules/jobCards/jobCards.controller.js  —  HTTP handlers
// ----------------------------------------------------------------------------
// Phase 6 Slice 1 had `list` only. Phase 9 adds detail/history + tab
// patch + 4 transitions. Thin shims — pull req-shaped data, call the
// service, shape the response envelope, forward errors to next().
// ============================================================================

'use strict';

const service = require('./jobCards.service');

// ── Phase 6 ─────────────────────────────────────────────────────────
async function list(req, res, next) {
  try {
    const result = await service.listJobCards(req.query, req.scope);
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

// ── Phase 9: Detail + History ───────────────────────────────────────
async function getDetail(req, res, next) {
  try {
    const data = await service.getJobCardDetail({ sectionJobNo: req.params.id, scope: req.scope });
    return res.json({ data });
  } catch (e) { return next(e); }
}

async function getHistory(req, res, next) {
  try {
    const items = await service.getJobCardHistory({ sectionJobNo: req.params.id, scope: req.scope });
    return res.json({ data: { items } });
  } catch (e) { return next(e); }
}

// ── Phase 9: Tab PATCH (save data, no transition) ───────────────────
async function patchTab(req, res, next) {
  try {
    const data = await service.patchJobCardTab({
      sectionJobNo: req.params.id,
      body:         req.body,
      actor: {
        employeeId:  req.user.employeeId,
        role:        req.user.role,
        userId:      req.user.userId,
        permissions: req.user.permissions,
        laneScopes:  req.user.laneScopes || [],
      },
    });
    return res.json({ data });
  } catch (e) { return next(e); }
}

// ── Phase 9: Transitions ────────────────────────────────────────────
function makeTransitionHandler(serviceFn) {
  return async function transitionHandler(req, res, next) {
    try {
      const data = await serviceFn({
        sectionJobNo: req.params.id,
        body:         req.body || {},
        actor: {
          employeeId:  req.user.employeeId,
          role:        req.user.role,
          userId:      req.user.userId,
          permissions: req.user.permissions,
          laneScopes:  req.user.laneScopes || [],
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || '',
      });
      return res.json({ data });
    } catch (e) { return next(e); }
  };
}

const postStartWork   = makeTransitionHandler(service.startWorkJobCard);
const postMarkComplete = makeTransitionHandler(service.markCompleteJobCard);
const postVerifyClose = makeTransitionHandler(service.verifyCloseJobCard);
const postReopen      = makeTransitionHandler(service.reopenJobCard);

async function exportPdf(req, res, next) {
  try {
    const startId = Number(req.query.start_id || 0);
    const endId = Number(req.query.end_id || 500);
    const actor = {
      employeeId: req.user.employeeId,
      name: req.user.fullName || req.user.name || req.user.employeeId || '',
      role: req.user.role || '',
    };
    const { filename, render } = await service.prepareJobCardPdfExport({ startId, endId, actor });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    render(res);
  } catch (e) { next(e); }
}

module.exports = {
  list,
  getDetail,
  getHistory,
  patchTab,
  postStartWork,
  postMarkComplete,
  postVerifyClose,
  postReopen,
  exportPdf,
};
