// ============================================================================
// src/modules/notifications/notifications.routes.js  —  URL wiring
// ----------------------------------------------------------------------------
// PHASE 12 — Notifications
//
// Mounted at `${env.API_BASE_PATH}/notifications` (= '/api/v1/notifications').
//
//   GET   /                  authenticate → authorize('notifications:read-own')
//   GET   /unread-count      same gate
//   PATCH /read-all          authenticate → authorize('notifications:mark-own')
//   PATCH /:id/read          authenticate → authorize('notifications:mark-own')
//
// PIPELINE NOTE — order matters: the `/:id/read` route is registered AFTER
// `/read-all` so Express doesn't accidentally interpret "read-all" as an
// :id param.
// ============================================================================

'use strict';

const express = require('express');

const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const validate     = require('../../middleware/validate');

const v    = require('./notifications.validators');
const ctrl = require('./notifications.controller');

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize('notifications:read-own'),
  validate(v.listQuerySchema, 'query'),
  ctrl.list,
);

router.get(
  '/unread-count',
  authenticate,
  authorize('notifications:read-own'),
  ctrl.unreadCount,
);

router.patch(
  '/read-all',
  authenticate,
  authorize('notifications:mark-own'),
  validate(v.emptyBodySchema, 'body'),
  ctrl.markAllRead,
);

router.patch(
  '/:id/read',
  authenticate,
  authorize('notifications:mark-own'),
  validate(v.idParamSchema, 'params'),
  ctrl.markRead,
);

module.exports = router;
