// ============================================================================
// src/modules/audit/audit.controller.js  —  HTTP shims
// ----------------------------------------------------------------------------
// PHASE 14 — Audit Log Viewer  (read-only)
//
// One handler per route. No bodies anywhere — every input is a query / path
// param. CSV endpoint streams `text/csv` with X-Export-Capped header so the
// FE can warn the user when their query hit the row cap.
// ============================================================================

'use strict';

const service = require('./audit.service');

async function list(req, res, next) {
  try {
    const data = await service.listAudit(req.query);
    res.json({ data });
  } catch (e) { next(e); }
}

async function detail(req, res, next) {
  try {
    const source    = req.query.source || 'audit_log';
    const subSource = req.query.subSource || null;
    const data = await service.getAuditDetail(req.params.id, source, subSource);
    res.json({ data });
  } catch (e) { next(e); }
}

async function filters(req, res, next) {
  try {
    const source = req.query.source || 'audit_log';
    const data = await service.getFilters(source);
    res.json({ data });
  } catch (e) { next(e); }
}

async function exportCsv(req, res, next) {
  try {
    const { csv, rowCount, capped } = await service.exportCsv(req.query);
    res.set('Content-Type',        'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="audit-log.csv"');
    res.set('X-Export-Rows',       String(rowCount));
    if (capped) res.set('X-Export-Capped', 'true');
    res.send(csv);
  } catch (e) { next(e); }
}

module.exports = { list, detail, filters, exportCsv };
