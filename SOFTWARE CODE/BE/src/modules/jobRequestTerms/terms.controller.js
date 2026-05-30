// ============================================================================
// src/modules/jobRequestTerms/terms.controller.js  —  HTTP handlers
// ----------------------------------------------------------------------------
// Maps Express request/response pipelines to terms services.
// ============================================================================

'use strict';

const service = require('./terms.service');

/**
 * GET /api/v1/job-request-terms
 * Returns active terms and conditions.
 */
async function getActive(req, res, next) {
  try {
    const category = ['JR', 'EQM'].includes(req.query.category) ? req.query.category : 'JR';
    const items = await service.getActiveTerms(category);
    return res.json({ data: { items } });
  } catch (e) {
    return next(e);
  }
}

/**
 * GET /api/v1/job-request-terms/all
 * Returns all terms and conditions (admin CRUD list).
 */
async function getAll(req, res, next) {
  try {
    const category = ['JR', 'EQM'].includes(req.query.category) ? req.query.category : 'JR';
    const items = await service.getAllTerms(category);
    return res.json({ data: { items } });
  } catch (e) {
    return next(e);
  }
}

/**
 * POST /api/v1/job-request-terms
 * Creates a new terms and conditions item.
 */
async function create(req, res, next) {
  try {
    const item = await service.createTerm(req.body);
    return res.status(201).json({ data: item });
  } catch (e) {
    return next(e);
  }
}

/**
 * PUT /api/v1/job-request-terms/:id
 * Updates an existing terms and conditions item.
 */
async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid ID parameter', details: null },
      });
    }
    const item = await service.updateTerm(id, req.body);
    return res.json({ data: item });
  } catch (e) {
    return next(e);
  }
}

/**
 * DELETE /api/v1/job-request-terms/:id
 * Deletes a terms and conditions item.
 */
async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid ID parameter', details: null },
      });
    }
    const result = await service.deleteTerm(id);
    return res.json({ data: result });
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  getActive,
  getAll,
  create,
  update,
  delete: remove,
};
