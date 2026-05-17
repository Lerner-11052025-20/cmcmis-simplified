// ============================================================================
// src/modules/users/users.routes.js  —  URL wiring for the users module
// ----------------------------------------------------------------------------
// Mounted at `${env.API_BASE_PATH}` in server.js — so the URL is
//   GET /api/v1/me
//
// We mount this router at the *base* path (not at /users) because /me
// is a top-level resource representing "the holder of the current
// token", not a row in a `users` collection. List/CRUD endpoints for
// the users collection (e.g. /admin/users) will be added in Phase 8.
//
// ROUTE TABLE
//   GET /me  → authenticate ─ getMe
// ============================================================================

'use strict';

const express = require('express');
const authenticate = require('../../middleware/authenticate');
const { getMe } = require('./users.controller');

const router = express.Router();

// GET /api/v1/me — requires a valid access token; returns identity + perms
router.get('/me', authenticate, getMe);

module.exports = router;
