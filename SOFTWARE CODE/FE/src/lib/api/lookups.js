// ============================================================================
// src/lib/api/lookups.js  —  Form-dropdown helpers
// ----------------------------------------------------------------------------
// Two endpoints, both used by the Job Request creation form:
//   GET /lookups/divisions          — feeds the Division dropdown
//   GET /lookups/equipment/search   — feeds the Equipment ID typeahead
// ============================================================================

import { api } from '../api-client.js';

/** Divisions for the JR form. */
export async function fetchDivisions(signal) {
  const r = await api.get('/lookups/divisions', { signal });
  return r.data.data.items;
}

/** Projects for the JR form. */
export async function fetchProjects(signal) {
  const r = await api.get('/lookups/projects', { signal });
  return r.data.data.items;
}

/**
 * Equipment search for the JR form's "Equipment ID" typeahead.
 * @param {string} q      Query string (>= 1 char)
 * @param {number} [limit] 1-100
 */
export async function searchEquipment(q, limit = 20, signal, category = null) {
  const r = await api.get('/lookups/equipment/search', {
    params: { q, limit, ...(category ? { category } : {}) },
    signal,
  });
  return r.data.data.items;
}

export async function fetchSubmitterContext(signal) {
  const r = await api.get('/lookups/submitter-context', { signal });
  return r.data.data;
}

/** Accessories already mapped to a selected equipment master row. */
export async function fetchEquipmentAccessories(eqmType, eqmId, signal) {
  if (!eqmType || !eqmId) return [];
  const r = await api.get('/lookups/equipment/accessories', {
    params: { eqm_type: eqmType, eqm_id: eqmId },
    signal,
  });
  return r.data.data.items;
}

// ============================================================================
//                          PHASE 7 SLICE 2  ·  ENGINEERS LOOKUP
// ============================================================================

/**
 * Fetch every active LAB_ENGINEER with workload counts. Sorted ascending
 * by `active_card_count`. Used by the Convert modal's Engineer dropdown.
 *
 * Each item: { id, employee_id, full_name, division_id, division_code,
 *              active_card_count }
 *
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<Object>>}
 */
export async function fetchEngineers(signal) {
  const r = await api.get('/lookups/engineers', { signal });
  return r.data.data.items;
}

// ============================================================================
//                          PHASE 9  ·  TASK LIBRARY LOOKUP
// ============================================================================

/**
 * Fetch active library tasks for the Task Checklist dropdown (Tab 10).
 * Pass a category to pre-filter (per D-9.7 default behaviour) or null
 * for "show all" (the toggle option).
 *
 * @param {'CALIBRATION'|'INSPECTION'|'MAINTENANCE'|null} category
 * @returns {Promise<Array<{ id, category, task_text, display_order }>>}
 */
export async function fetchTaskLibrary(category = null, signal) {
  const params = category ? { category } : undefined;
  const r = await api.get('/lookups/task-library', { params, signal });
  return r.data.data.items;
}

export async function fetchCalibrationPeople(signal) {
  const r = await api.get('/lookups/calibration-people', { signal });
  return r.data.data.items;
}
