// ============================================================================
// src/lib/api/jobCards.js  —  Job Cards HTTP wrappers
// ----------------------------------------------------------------------------
// All Job Card detail-page + transition + sub-feature API calls live here.
// Each wrapper returns the unwrapped data envelope (one less `.data.data`
// at every call site).
// ============================================================================

import { api } from '../api-client.js';

// ── Phase 6 Slice 1 — list (kept for back-compat) ───────────────────
/**
 * @param {Object} params
 * @returns {Promise<{items, pagination, applied_filters}>}
 */
export async function fetchJobCardList(params = {}, signal) {
  const r = await api.get('/job-cards', { params, signal });
  return r.data.data;
}

// ============================================================================
//                          PHASE 9  ·  DETAIL + HISTORY
// ============================================================================

/**
 * GET /api/v1/job-cards/:id
 * @param {string} id  section_job_no (e.g. "J00024215")
 */
export async function fetchJobCardDetail(id, signal) {
  const r = await api.get(`/job-cards/${encodeURIComponent(id)}`, { signal });
  return r.data.data;
}

/** GET /api/v1/job-cards/:id/history */
export async function fetchJobCardHistory(id, signal) {
  const r = await api.get(`/job-cards/${encodeURIComponent(id)}/history`, { signal });
  return r.data.data.items;
}

// ============================================================================
//                          PHASE 9  ·  TAB PATCH + TRANSITIONS
// ============================================================================

/** PATCH /api/v1/job-cards/:id — save tab data (no state change). */
export async function patchJobCardTab(id, body) {
  const r = await api.patch(`/job-cards/${encodeURIComponent(id)}`, body);
  return r.data.data;
}

/** POST /api/v1/job-cards/:id/start-work */
export async function startWorkJobCard(id) {
  const r = await api.post(`/job-cards/${encodeURIComponent(id)}/start-work`, {});
  return r.data.data;
}

/** POST /api/v1/job-cards/:id/mark-complete */
export async function markCompleteJobCard(id, body) {
  const r = await api.post(`/job-cards/${encodeURIComponent(id)}/mark-complete`, body);
  return r.data.data;
}

/** POST /api/v1/job-cards/:id/verify-close */
export async function verifyCloseJobCard(id, body) {
  const r = await api.post(`/job-cards/${encodeURIComponent(id)}/verify-close`, body);
  return r.data.data;
}

/** POST /api/v1/job-cards/:id/reopen */
export async function reopenJobCard(id, body) {
  const r = await api.post(`/job-cards/${encodeURIComponent(id)}/reopen`, body);
  return r.data.data;
}

// ============================================================================
//                          PHASE 9  ·  TASK CHECKLIST
// ============================================================================

/** GET /api/v1/job-cards/:id/tasks */
export async function fetchJobCardTasks(id, signal) {
  const r = await api.get(`/job-cards/${encodeURIComponent(id)}/tasks`, { signal });
  return r.data.data.items;
}

/** POST /api/v1/job-cards/:id/tasks (library or custom) */
export async function addJobCardTask(id, body) {
  const r = await api.post(`/job-cards/${encodeURIComponent(id)}/tasks`, body);
  return r.data.data;
}

/** PATCH /api/v1/job-cards/:id/tasks/:taskId — toggle is_completed */
export async function toggleJobCardTask(id, taskId, isCompleted) {
  const r = await api.patch(
    `/job-cards/${encodeURIComponent(id)}/tasks/${encodeURIComponent(taskId)}`,
    { is_completed: isCompleted },
  );
  return r.data.data;
}

/** DELETE /api/v1/job-cards/:id/tasks/:taskId */
export async function deleteJobCardTask(id, taskId) {
  const r = await api.delete(`/job-cards/${encodeURIComponent(id)}/tasks/${encodeURIComponent(taskId)}`);
  return r.data.data;
}

// ============================================================================
//                          PHASE 9  ·  DOCUMENTS
// ============================================================================

/** GET /api/v1/job-cards/:id/documents */
export async function fetchJobCardDocuments(id, signal) {
  const r = await api.get(`/job-cards/${encodeURIComponent(id)}/documents`, { signal });
  return r.data.data.items;
}

/**
 * POST /api/v1/job-cards/:id/documents — multipart upload.
 * @param {string} id
 * @param {File} file
 * @param {string} docType  one of DOC_TYPE_OPTIONS
 */
export async function uploadJobCardDocument(id, file, docType) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('doc_type', docType);
  const r = await api.post(
    `/job-cards/${encodeURIComponent(id)}/documents`,
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return r.data.data;
}

/** Returns the URL to GET for a document download. Browser handles the stream. */
export function jobCardDocumentDownloadUrl(id, docId) {
  // baseURL ends with /api/v1 already.
  return `${api.defaults.baseURL || '/api/v1'}/job-cards/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}`;
}

/** DELETE /api/v1/job-cards/:id/documents/:docId */
export async function deleteJobCardDocument(id, docId) {
  const r = await api.delete(`/job-cards/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}`);
  return r.data.data;
}

// ============================================================================
//        PHASE 9 hotfix · MAINTENANCE ROWS + SPARES ROWS multi-row CRUD
// ============================================================================
//  Promoted out of "Slice 2" after DS surfaced the missing CRUD on
//  2026-05-19. Same shape for both: GET list · POST add · PATCH /:rowId · DELETE /:rowId.
// ============================================================================

/** GET /api/v1/job-cards/:id/maintenance-rows */
export async function fetchMaintenanceRows(id, signal) {
  const r = await api.get(`/job-cards/${encodeURIComponent(id)}/maintenance-rows`, { signal });
  return r.data.data.items;
}
/** POST /api/v1/job-cards/:id/maintenance-rows */
export async function addMaintenanceRow(id, body) {
  const r = await api.post(`/job-cards/${encodeURIComponent(id)}/maintenance-rows`, body);
  return r.data.data;
}
/** PATCH /api/v1/job-cards/:id/maintenance-rows/:rowId — partial update */
export async function patchMaintenanceRow(id, rowId, body) {
  const r = await api.patch(
    `/job-cards/${encodeURIComponent(id)}/maintenance-rows/${encodeURIComponent(rowId)}`, body,
  );
  return r.data.data;
}
/** DELETE /api/v1/job-cards/:id/maintenance-rows/:rowId */
export async function deleteMaintenanceRow(id, rowId) {
  const r = await api.delete(
    `/job-cards/${encodeURIComponent(id)}/maintenance-rows/${encodeURIComponent(rowId)}`,
  );
  return r.data.data;
}

/** GET /api/v1/job-cards/:id/spares-rows */
export async function fetchSparesRows(id, signal) {
  const r = await api.get(`/job-cards/${encodeURIComponent(id)}/spares-rows`, { signal });
  return r.data.data.items;
}
/** POST /api/v1/job-cards/:id/spares-rows */
export async function addSpareRow(id, body) {
  const r = await api.post(`/job-cards/${encodeURIComponent(id)}/spares-rows`, body);
  return r.data.data;
}
/** PATCH /api/v1/job-cards/:id/spares-rows/:rowId — partial update */
export async function patchSpareRow(id, rowId, body) {
  const r = await api.patch(
    `/job-cards/${encodeURIComponent(id)}/spares-rows/${encodeURIComponent(rowId)}`, body,
  );
  return r.data.data;
}
/** DELETE /api/v1/job-cards/:id/spares-rows/:rowId */
export async function deleteSpareRow(id, rowId) {
  const r = await api.delete(
    `/job-cards/${encodeURIComponent(id)}/spares-rows/${encodeURIComponent(rowId)}`,
  );
  return r.data.data;
}

// ============================================================================
//                          PHASE 9  ·  JR EDIT/CANCEL (loose ends, re-exported)
// ============================================================================
// These live on the jobRequests resource but the FE detail page for a JC
// occasionally needs to read them. For now they're consumed only from
// the JR detail page's edit/cancel modals.

// Dedicated calibration workflow multi-row CRUD.
export async function fetchCalibrationEquipmentRows(id, signal) {
  const r = await api.get(`/job-cards/${encodeURIComponent(id)}/calibration/equipment-rows`, { signal });
  return r.data.data.items;
}

export async function addCalibrationEquipmentRow(id, body = {}) {
  const r = await api.post(`/job-cards/${encodeURIComponent(id)}/calibration/equipment-rows`, body);
  return r.data.data;
}

export async function patchCalibrationEquipmentRow(id, rowId, body) {
  const r = await api.patch(
    `/job-cards/${encodeURIComponent(id)}/calibration/equipment-rows/${encodeURIComponent(rowId)}`,
    body,
  );
  return r.data.data;
}

export async function deleteCalibrationEquipmentRow(id, rowId) {
  const r = await api.delete(
    `/job-cards/${encodeURIComponent(id)}/calibration/equipment-rows/${encodeURIComponent(rowId)}`,
  );
  return r.data.data;
}

export async function fetchCalibrationAdjustmentRows(id, signal) {
  const r = await api.get(`/job-cards/${encodeURIComponent(id)}/calibration/adjustment-rows`, { signal });
  return r.data.data.items;
}

export async function addCalibrationAdjustmentRow(id, body = {}) {
  const r = await api.post(`/job-cards/${encodeURIComponent(id)}/calibration/adjustment-rows`, body);
  return r.data.data;
}

export async function patchCalibrationAdjustmentRow(id, rowId, body) {
  const r = await api.patch(
    `/job-cards/${encodeURIComponent(id)}/calibration/adjustment-rows/${encodeURIComponent(rowId)}`,
    body,
  );
  return r.data.data;
}

export async function deleteCalibrationAdjustmentRow(id, rowId) {
  const r = await api.delete(
    `/job-cards/${encodeURIComponent(id)}/calibration/adjustment-rows/${encodeURIComponent(rowId)}`,
  );
  return r.data.data;
}

// Dedicated repair workflow multi-row CRUD.
export async function fetchRepairEquipmentRows(id, signal) {
  const r = await api.get(`/job-cards/${encodeURIComponent(id)}/repair/equipment-rows`, { signal });
  return r.data.data.items;
}

export async function addRepairEquipmentRow(id, body = {}) {
  const r = await api.post(`/job-cards/${encodeURIComponent(id)}/repair/equipment-rows`, body);
  return r.data.data;
}

export async function patchRepairEquipmentRow(id, rowId, body) {
  const r = await api.patch(
    `/job-cards/${encodeURIComponent(id)}/repair/equipment-rows/${encodeURIComponent(rowId)}`,
    body,
  );
  return r.data.data;
}

export async function deleteRepairEquipmentRow(id, rowId) {
  const r = await api.delete(
    `/job-cards/${encodeURIComponent(id)}/repair/equipment-rows/${encodeURIComponent(rowId)}`,
  );
  return r.data.data;
}

/**
 * Downloads the job cards list as a PDF for a specified ID range.
 * Uses axios responseType: 'blob' to properly handle binary PDF stream.
 */
export async function downloadJobCardsPdf(startId, endId) {
  const response = await api.get('/job-cards/export-pdf', {
    params: { start_id: startId, end_id: endId },
    responseType: 'blob',
  });
  return response.data;
}
