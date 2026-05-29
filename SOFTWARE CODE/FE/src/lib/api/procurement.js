// ============================================================================
// src/lib/api/procurement.js  —  Procurement HTTP wrappers
// ----------------------------------------------------------------------------
// PHASE 13 — Procurement sub-module
//
// Thin axios wrappers. Same unwrap-data convention as the other modules.
// CSV exports use blob responses + a manual click-download helper.
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


// ── Purchase Orders ────────────────────────────────────────────────────
export async function fetchPurchaseOrders(params, signal) {
  const r = await api.get('/procurement/purchase-orders', { params: clean(params), signal });
  return r.data.data;
}
export async function fetchPurchaseOrder(id, signal) {
  const r = await api.get(`/procurement/purchase-orders/${id}`, { signal });
  return r.data.data;
}
export async function createPurchaseOrder(body) {
  const r = await api.post('/procurement/purchase-orders', body);
  return r.data.data;
}
export async function editPurchaseOrder(id, body) {
  const r = await api.patch(`/procurement/purchase-orders/${id}`, body);
  return r.data.data;
}
export async function downloadPurchaseOrdersCsv(params) {
  const r = await api.get('/procurement/purchase-orders/export', {
    params: clean(params),
    responseType: 'blob',
  });
  triggerBlobDownload(r.data, 'purchase-orders.csv');
}


// ── Spare Parts ────────────────────────────────────────────────────────
export async function fetchSpareParts(params, signal) {
  const r = await api.get('/procurement/spare-parts', { params: clean(params), signal });
  return r.data.data;
}
export async function fetchSparePart(id, signal) {
  const r = await api.get(`/procurement/spare-parts/${id}`, { signal });
  return r.data.data;
}
export async function createSparePart(body) {
  const r = await api.post('/procurement/spare-parts', body);
  return r.data.data;
}
export async function editSparePart(id, body) {
  const r = await api.patch(`/procurement/spare-parts/${id}`, body);
  return r.data.data;
}
export async function orderSparePart(id, body) {
  const r = await api.post(`/procurement/spare-parts/${id}/order`, body);
  return r.data.data;
}
export async function downloadSparePartsCsv(params) {
  const r = await api.get('/procurement/spare-parts/export', {
    params: clean(params),
    responseType: 'blob',
  });
  triggerBlobDownload(r.data, 'spare-parts.csv');
}


// ── Vendor lookup helper (reuses the Phase-8 inquiry endpoint) ─────────
// The Procurement modal needs a vendor picker. We use the Inquiry vendor
// search (already gated by inquiry:search-vendors — every role holds it).
export async function searchVendors(q, signal) {
  if (!q || q.length < 2) return [];
  const r = await api.get('/inquiry/vendors', {
    params: { q, page: 1, page_size: 20 },
    signal,
  });
  // Inquiry returns { items: [...], pagination }
  return r.data?.data?.items || [];
}
