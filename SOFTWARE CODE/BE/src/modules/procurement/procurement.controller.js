// ============================================================================
// src/modules/procurement/procurement.controller.js  —  HTTP shims
// ----------------------------------------------------------------------------
// PHASE 13 — Procurement sub-module
//
// One handler per route. Two namespaces:
//   po.*       — purchase orders
//   spare.*    — spare parts
//
// CSV endpoints set Content-Type + Content-Disposition. JSON endpoints
// return the standard `{ data }` envelope.
// ============================================================================

'use strict';

const service = require('./procurement.service');

function actorOf(req) {
  return {
    employeeId: req.user.employeeId,
    role:       req.user.role,
    fullName:   req.user.fullName,
  };
}


// ── Purchase Orders ─────────────────────────────────────────────────────
async function listPo(req, res, next) {
  try { res.json({ data: await service.listPurchaseOrders(req.query) }); }
  catch (e) { next(e); }
}

async function detailPo(req, res, next) {
  try { res.json({ data: await service.getPoDetail(req.params.id) }); }
  catch (e) { next(e); }
}

async function createPo(req, res, next) {
  try {
    const data = await service.createPo({
      body:  req.body,
      actor: actorOf(req),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(201).json({ data });
  } catch (e) { next(e); }
}

async function editPo(req, res, next) {
  try {
    const data = await service.editPo({
      id:    req.params.id,
      patch: req.body,
      actor: actorOf(req),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json({ data });
  } catch (e) { next(e); }
}

async function exportPo(req, res, next) {
  try {
    const csv = await service.exportPoCsv(req.query);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="purchase-orders.csv"');
    res.send(csv);
  } catch (e) { next(e); }
}


// ── Spare Parts ─────────────────────────────────────────────────────────
async function listSpare(req, res, next) {
  try { res.json({ data: await service.listSpareParts(req.query) }); }
  catch (e) { next(e); }
}

async function detailSpare(req, res, next) {
  try { res.json({ data: await service.getSpareDetail(req.params.id) }); }
  catch (e) { next(e); }
}

async function createSpare(req, res, next) {
  try {
    const data = await service.createSpare({
      body:  req.body,
      actor: actorOf(req),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(201).json({ data });
  } catch (e) { next(e); }
}

async function editSpare(req, res, next) {
  try {
    const data = await service.editSpare({
      id:    req.params.id,
      patch: req.body,
      actor: actorOf(req),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json({ data });
  } catch (e) { next(e); }
}

async function orderSpare(req, res, next) {
  try {
    const data = await service.orderSpare({
      id:    req.params.id,
      body:  req.body,
      actor: actorOf(req),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(201).json({ data });
  } catch (e) { next(e); }
}

async function exportSpare(req, res, next) {
  try {
    const csv = await service.exportSpareCsv(req.query);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="spare-parts.csv"');
    res.send(csv);
  } catch (e) { next(e); }
}


module.exports = {
  // PO
  listPo, detailPo, createPo, editPo, exportPo,
  // Spare
  listSpare, detailSpare, createSpare, editSpare, orderSpare, exportSpare,
};
