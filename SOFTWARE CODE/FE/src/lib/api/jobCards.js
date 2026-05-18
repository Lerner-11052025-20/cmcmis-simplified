// ============================================================================
// src/lib/api/jobCards.js  —  Job Cards HTTP wrappers (slice 1 = list-only)
// ----------------------------------------------------------------------------

import { api } from '../api-client.js';

/**
 * Paginated list with filters.
 * @param {Object} [params]
 * @param {number} [params.page]
 * @param {number} [params.page_size]
 * @param {string} [params.q]
 * @param {string} [params.status]
 * @param {string} [params.assigned_engineer_id]
 * @param {string} [params.date_from]
 * @param {string} [params.date_to]
 * @param {string} [params.sort]
 * @param {AbortSignal} [signal]
 */
export async function fetchJobCardList(params = {}, signal) {
  const r = await api.get('/job-cards', { params, signal });
  return r.data.data;
}
