// ============================================================================
// src/modules/notifications/notifications.controller.js  —  HTTP shims
// ----------------------------------------------------------------------------
// PHASE 12 — Notifications
//
// One handler per route. Pulls the actor's employeeId from req.user.
// All recipient-scoping happens at the repo layer; controllers are
// intentionally trivial.
// ============================================================================

'use strict';

const service = require('./notifications.service');

/** GET /notifications?unreadOnly=&page=&page_size= */
async function list(req, res, next) {
  try {
    const result = await service.listForUser(req.user.employeeId, req.query);
    res.json({ data: result });
  } catch (e) { next(e); }
}

/** GET /notifications/unread-count */
async function unreadCount(req, res, next) {
  try {
    const result = await service.countUnread(req.user.employeeId);
    res.json({ data: result });
  } catch (e) { next(e); }
}

/** PATCH /notifications/:id/read */
async function markRead(req, res, next) {
  try {
    const result = await service.markRead(req.params.id, req.user.employeeId);
    res.json({ data: result });
  } catch (e) { next(e); }
}

/** PATCH /notifications/read-all */
async function markAllRead(req, res, next) {
  try {
    const result = await service.markAllRead(req.user.employeeId);
    res.json({ data: result });
  } catch (e) { next(e); }
}

module.exports = { list, unreadCount, markRead, markAllRead };
