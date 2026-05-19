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

// ============================================================================
//                          PHASE 7 SLICE 2  ·  DETAIL / CONVERT / REJECT
// ============================================================================

/**
 * Fetch one JR with all joined columns the Detail page needs.
 *
 * @param {number} id   JR_JOBREQUESTNO
 * @param {AbortSignal} [signal]
 * @returns {Promise<Object>}  Full detail payload
 */
export async function fetchJobRequestDetail(id, signal) {
  const r = await api.get(`/job-requests/${encodeURIComponent(id)}`, { signal });
  return r.data.data;
}

/**
 * Fetch chronological status_history rows for the Timeline component.
 *
 * @param {number} id
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array>}   Items array
 */
export async function fetchJobRequestHistory(id, signal) {
  const r = await api.get(`/job-requests/${encodeURIComponent(id)}/history`, { signal });
  return r.data.data.items;
}

/**
 * Convert (approve + assign + create JC) atomically.
 *
 * Body shape (validated by jobRequestConvertSchema):
 *   { engineer_employee_id, workflow_type,
 *     equipment_received_date, planned_start_date, target_end_date,
 *     required_resources?, special_instructions? }
 *
 * @param {number} id
 * @param {Object} body
 * @returns {Promise<{ job_request: Object, job_card: Object }>}
 */
export async function convertJobRequest(id, body) {
  const r = await api.post(`/job-requests/${encodeURIComponent(id)}/convert`, body);
  return r.data.data;
}

/**
 * Reject with a mandatory reason (10..500 chars). Terminal for Slice 2.
 *
 * @param {number} id
 * @param {{ reason: string }} body
 */
export async function rejectJobRequest(id, body) {
  const r = await api.post(`/job-requests/${encodeURIComponent(id)}/reject`, body);
  return r.data.data;
}

// ============================================================================
//                          PHASE 9  ·  JR EDIT DRAFT + CANCEL DRAFT
// ============================================================================

/**
 * PATCH /api/v1/job-requests/:id — owner-only edit of a DRAFT body.
 * Service will 409 ILLEGAL_TRANSITION if the JR is not DRAFT.
 */
export async function patchEditJobRequestDraft(id, body) {
  const r = await api.patch(`/job-requests/${encodeURIComponent(id)}`, body);
  return r.data.data;
}

/**
 * POST /api/v1/job-requests/:id/cancel — owner-only cancel of a DRAFT.
 * Body may include an optional reason (10..500 chars if provided).
 */
export async function cancelJobRequestDraft(id, body = {}) {
  const r = await api.post(`/job-requests/${encodeURIComponent(id)}/cancel`, body);
  return r.data.data;
}
