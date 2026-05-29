// ============================================================================
// src/lib/api/equipment.js  —  Equipment-module HTTP wrappers
// ----------------------------------------------------------------------------
// Thin wrappers around the central `api` axios instance. Centralising
// them here means a future API change (e.g. /equipment → /eqip) is a
// one-file edit, not 17 sprinkled fetch() calls.
//
// Every function returns the unwrapped `data` payload from the standard
// envelope { data: ... } so callers don't repeat `.data.data`.
// ============================================================================

import { api } from '../api-client.js';

/**
 * Paginated list with filters.
 * @param {Object} [params]
 * @param {number} [params.page]
 * @param {number} [params.page_size]
 * @param {string} [params.q]
 * @param {number} [params.type_id]
 * @param {string} [params.status]
 * @param {string} [params.eqm_type]
 * @param {string} [params.sort]
 * @param {string} [params.order]
 * @param {AbortSignal} [signal]
 */
export async function fetchEquipmentList(params = {}, signal) {
  const r = await api.get('/equipment', { params, signal });
  return r.data.data;     // → { items, pagination }
}

export async function fetchEquipmentDetail(id, signal) {
  const r = await api.get(`/equipment/${encodeURIComponent(id)}`, { signal });
  return r.data.data;
}

export async function verifyEquipment(id) {
  const r = await api.post(`/equipment/${encodeURIComponent(id)}/verify`);
  return r.data.data;
}

export async function rejectEquipment(id) {
  const r = await api.delete(`/equipment/${encodeURIComponent(id)}`);
  return r.data.data;
}

/** Equipment-type dropdown options. */
export async function fetchTypes(signal) {
  const r = await api.get('/equipment/types', { signal });
  return r.data.data.items;
}

/** Make / manufacturer dropdown options. */
export async function fetchMakes(signal) {
  const r = await api.get('/equipment/makes', { signal });
  return r.data.data.items;
}

/** Division dropdown options. */
export async function fetchDivisions(signal) {
  const r = await api.get('/equipment/divisions', { signal });
  return r.data.data.items;
}

/** Project dropdown options. */
export async function fetchProjects(signal) {
  const r = await api.get('/equipment/projects', { signal });
  return r.data.data.items;
}

/**
 * Register new equipment (Phase 5 K.6 path — equipment-row + audit only).
 * @param {Object} body  Conforms to FE equipmentSchema.
 */
export async function createEquipment(body) {
  const r = await api.post('/equipment', body);
  return r.data.data;     // → { equipment_id, equipment_code, status }
}

// ============================================================================
//                     PHASE 15  ·  BULK CALIBRATION DONE
// ============================================================================

/**
 * POST /api/v1/equipment/bulk-cal-done
 *
 * SUPER_ADMIN-only. Marks every equipment with a past EQM_CAL_DUE_DATE
 * (and status not CONDEMNED/RETIRED) as ACTIVE and clears the due date.
 *
 * @returns {Promise<{ updated_count: number }>}
 */
export async function bulkMarkCalibrationDone() {
  const r = await api.post('/equipment/bulk-cal-done');
  return r.data.data;
}

/**
 * Downloads the equipment list as a PDF for a specified ID range.
 * Uses axios responseType: 'blob' to properly handle binary PDF stream.
 */
export async function downloadEquipmentPdf(startId, endId) {
  const response = await api.get('/equipment/export-pdf', {
    params: { start_id: startId, end_id: endId },
    responseType: 'blob',
  });
  return response.data;
}
