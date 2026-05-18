// ============================================================================
// src/lib/api/jobRequests.js  —  Job Requests HTTP wrappers
// ----------------------------------------------------------------------------
// Thin wrappers around the central `api` axios instance. Each function
// returns the unwrapped payload (one less `.data.data` at every call site).
// ============================================================================

import { api } from '../api-client.js';

/**
 * Paginated list with filters.
 * @param {Object} [params]
 * @param {number} [params.page]
 * @param {number} [params.page_size]      one of 10|25|50|100
 * @param {string} [params.q]
 * @param {string} [params.type]           CALIBRATION | REPAIR | REGISTRATION
 * @param {string} [params.status]
 * @param {string} [params.priority]       LOW | MEDIUM | HIGH
 * @param {number} [params.division_id]
 * @param {string} [params.date_from]
 * @param {string} [params.date_to]
 * @param {string} [params.sort]
 * @param {AbortSignal} [signal]
 * @returns {Promise<{items: Array, pagination: Object, applied_filters: Object}>}
 */
export async function fetchJobRequestList(params = {}, signal) {
  const r = await api.get('/job-requests', { params, signal });
  return r.data.data;
}

/**
 * Create a Job Request. If body.submit_now === true, the server creates
 * AND submits in one transaction. Otherwise it saves as DRAFT.
 *
 * @param {Object} body  Validated by jobRequestCreateSchema.
 * @returns {Promise<{ id: number, request_code: string, status: string }>}
 */
export async function createJobRequest(body) {
  const r = await api.post('/job-requests', body);
  return r.data.data;
}

/**
 * Transition an existing DRAFT to SUBMITTED. Used by the "Submit Request"
 * button on the JR form when the row was previously saved as draft.
 *
 * @param {number} id     JR_JOBREQUESTNO
 * @param {{ tnc_accepted: true, tnc_version?: string }} body
 */
export async function submitJobRequest(id, body) {
  const r = await api.post(`/job-requests/${encodeURIComponent(id)}/submit`, body);
  return r.data.data;
}
