// ============================================================================
// src/modules/jobCards/jobCards.controller.js  —  HTTP handlers
// ----------------------------------------------------------------------------
// Slice 1: list only. Body-less, query-only.
// ============================================================================

'use strict';

const service = require('./jobCards.service');

async function list(req, res, next) {
  try {
    const result = await service.listJobCards(req.query);
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

module.exports = { list };
