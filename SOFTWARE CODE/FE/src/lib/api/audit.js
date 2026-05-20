// ============================================================================
// src/lib/api/audit.js  —  Audit Log Viewer HTTP wrappers
// ----------------------------------------------------------------------------
// PHASE 14 — Audit Log Viewer (read-only)
//
// Four endpoints, all GET. The CSV export uses a blob response + a manual
// click-download helper (same pattern as procurement.js).
// ============================================================================

import { api } from '../api-client.js';

function clean(params) {
  if (!params) return undefined;
  const out = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '' || Number.isNaN(v)) return;
    out[k] = v;
  });
  return out;
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Paginated list. params: { source, from, to, actor, action, entityType, entityId, q, page, page_size }. */
export async function fetchAuditList(params, signal) {
  const r = await api.get('/audit', { params: clean(params), signal });
  return r.data.data;
}

/** Single-row detail. params: { source, subSource } (subSource only used for source='transitions'). */
export async function fetchAuditDetail(id, params, signal) {
  const r = await api.get(`/audit/${id}`, { params: clean(params), signal });
  return r.data.data;
}

/** Distinct actions + entity types for the dropdowns. params: { source }. */
export async function fetchAuditFilters(source, signal) {
  const r = await api.get('/audit/filters', { params: clean({ source }), signal });
  return r.data.data;
}

/** CSV download. Filename = audit-log.csv (server sets Content-Disposition). */
export async function downloadAuditCsv(params) {
  const r = await api.get('/audit/export', {
    params: clean(params),
    responseType: 'blob',
  });
  triggerBlobDownload(r.data, 'audit-log.csv');
  return {
    rowCount: parseInt(r.headers?.['x-export-rows']   || '0', 10),
    capped:   r.headers?.['x-export-capped'] === 'true',
  };
}
