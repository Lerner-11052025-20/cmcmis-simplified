// ============================================================================
// src/lib/api/terms.js  —  Terms & Conditions HTTP API wrappers
// ----------------------------------------------------------------------------
// thin wrappers around the central `api` axios instance.
// ============================================================================

import { api } from '../api-client.js';

/**
 * Fetch all active terms for the job request creation checklist.
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<{ id: number, index_no: number, text: string, is_active: number }>>}
 */
export async function fetchActiveTerms(signal) {
  const r = await api.get('/job-request-terms', { signal });
  return r.data.data.items;
}

/**
 * Fetch all terms (active & inactive) for the admin dashboard.
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<{ id: number, index_no: number, text: string, is_active: number }>>}
 */
export async function fetchAllTerms(signal) {
  const r = await api.get('/job-request-terms/all', { signal });
  return r.data.data.items;
}

/**
 * Create a new dynamic T&C item (Super Admin only).
 * @param {Object} body
 * @param {number} body.index_no
 * @param {string} body.text
 * @param {boolean} [body.is_active]
 */
export async function createTerm(body) {
  const r = await api.post('/job-request-terms', body);
  return r.data.data;
}

/**
 * Update an existing dynamic T&C item (Super Admin only).
 * @param {number} id
 * @param {Object} body
 * @param {number} [body.index_no]
 * @param {string} [body.text]
 * @param {boolean} [body.is_active]
 */
export async function updateTerm(id, body) {
  const r = await api.put(`/job-request-terms/${id}`, body);
  return r.data.data;
}

/**
 * Delete a dynamic T&C item from database (Super Admin only).
 * @param {number} id
 */
export async function deleteTerm(id) {
  const r = await api.delete(`/job-request-terms/${id}`);
  return r.data.data;
}
