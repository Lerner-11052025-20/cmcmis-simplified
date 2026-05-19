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

/**
 * Equipment search for the JR form's "Equipment ID" typeahead.
 * @param {string} q      Query string (>= 1 char)
 * @param {number} [limit] 1-100
 */
export async function searchEquipment(q, limit = 20, signal) {
  const r = await api.get('/lookups/equipment/search', {
    params: { q, limit },
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
