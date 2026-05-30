// ============================================================================
// src/lib/api/terms.js  —  Terms & Conditions HTTP API wrappers
// ----------------------------------------------------------------------------
// thin wrappers around the central `api` axios instance.
// ============================================================================

import { api } from '../api-client.js';

/**
 * Fetch all active terms for the job request or equipment creation checklist.
 * @param {string} [category]
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<{ id: number, index_no: number, text: string, is_active: number, category: string }>>}
 */
export async function fetchActiveTerms(category = 'JR', signal) {
  let actualCategory = 'JR';
  let actualSignal = undefined;
  if (typeof category === 'string') {
    actualCategory = category;
    actualSignal = signal;
  } else {
    actualSignal = category;
  }
  const r = await api.get('/job-request-terms', { params: { category: actualCategory }, signal: actualSignal });
  return r.data.data.items;
}

/**
 * Fetch all terms (active & inactive) for the admin dashboard.
 * @param {string} [category]
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<{ id: number, index_no: number, text: string, is_active: number, category: string }>>}
 */
export async function fetchAllTerms(category = 'JR', signal) {
  let actualCategory = 'JR';
  let actualSignal = undefined;
  if (typeof category === 'string') {
    actualCategory = category;
    actualSignal = signal;
  } else {
    actualSignal = category;
  }
  const r = await api.get('/job-request-terms/all', { params: { category: actualCategory }, signal: actualSignal });
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
