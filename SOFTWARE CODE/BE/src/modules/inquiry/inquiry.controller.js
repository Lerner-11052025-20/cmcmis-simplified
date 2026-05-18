// ============================================================================
// src/modules/inquiry/inquiry.controller.js  —  Four thin HTTP handlers
// ----------------------------------------------------------------------------
// One handler per tab. Each handler:
//   1. Receives req.query already validated + coerced by the route's
//      `validate(schema)` middleware.
//   2. Calls exactly one service method.
//   3. Wraps the result in the `{ data: { items, pagination, applied_filters } }`
//      envelope used by every other list endpoint in the project.
//
// No SQL, no business rules — Doctrine 8.
// ============================================================================

'use strict';

const service = require('./inquiry.service');

async function vendors(req, res, next) {
  try {
    const result = await service.listVendors(req.query);
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function products(req, res, next) {
  try {
    const result = await service.listProducts(req.query);
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function jobCards(req, res, next) {
  try {
    const result = await service.listJobCards(req.query);
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

async function instruments(req, res, next) {
  try {
    const result = await service.listInstruments(req.query);
    return res.json({ data: result });
  } catch (e) { return next(e); }
}

module.exports = { vendors, products, jobCards, instruments };
