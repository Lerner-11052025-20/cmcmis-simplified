// ============================================================================
// src/lib/api/inquiry.js  —  Inquiry tabs HTTP wrappers
// ----------------------------------------------------------------------------
// Four GET wrappers — one per tab. The query is built from the FE state
// (q, page, page_size, optional type for vendors) and forwarded as
// regular query params. axios serialises and the BE validates via zod.
// ============================================================================

import { api } from '../api-client.js';

/**
 * @param {{ q?: string, type?: 'MANUFACTURER'|'SUPPLIER', page?: number, page_size?: number }} params
 * @param {AbortSignal} [signal]
 */
export async function fetchInquiryVendors(params, signal) {
  const r = await api.get('/inquiry/vendors', { params, signal });
  return r.data.data;     // { items, pagination, applied_filters }
}

/**
 * @param {{ q?: string, page?: number, page_size?: number }} params
 * @param {AbortSignal} [signal]
 */
export async function fetchInquiryProducts(params, signal) {
  const r = await api.get('/inquiry/products', { params, signal });
  return r.data.data;
}

/**
 * @param {{ q?: string, page?: number, page_size?: number }} params
 * @param {AbortSignal} [signal]
 */
export async function fetchInquiryJobCards(params, signal) {
  const r = await api.get('/inquiry/job-cards', { params, signal });
  return r.data.data;
}

/**
 * @param {{ q?: string, page?: number, page_size?: number }} params
 * @param {AbortSignal} [signal]
 */
export async function fetchInquiryInstruments(params, signal) {
  const r = await api.get('/inquiry/instruments', { params, signal });
  return r.data.data;
}
