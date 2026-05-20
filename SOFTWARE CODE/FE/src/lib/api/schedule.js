// ============================================================================
// src/lib/api/schedule.js  —  Schedule HTTP wrappers
// ----------------------------------------------------------------------------
// PHASE 13 — Schedule sub-module
//
// Thin axios wrappers around /api/v1/schedules. Each function returns the
// unwrapped `r.data.data` body so react-query hooks downstream don't have
// to repeat `.data.data`.
// ============================================================================

import { api } from '../api-client.js';

/** Strip falsy/empty values so the BE Zod schema doesn't reject. */
function clean(params) {
  if (!params) return undefined;
  const out = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '' || Number.isNaN(v)) return;
    out[k] = v;
  });
  return out;
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Paginated/calendar list. params: { type, status, from, to, engineer, q, view, page, page_size }. */
export async function fetchSchedules(params, signal) {
  const r = await api.get('/schedules', { params: clean(params), signal });
  return r.data.data;
}

export async function fetchScheduleDetail(id, signal) {
  const r = await api.get(`/schedules/${id}`, { signal });
  return r.data.data;
}

export async function createSchedule(body) {
  const r = await api.post('/schedules', body);
  return r.data.data;
}

export async function editSchedule(id, body) {
  const r = await api.patch(`/schedules/${id}`, body);
  return r.data.data;
}

export async function transitionSchedule(id, body) {
  const r = await api.post(`/schedules/${id}/status`, body);
  return r.data.data;
}

export async function cancelSchedule(id, body = {}) {
  const r = await api.delete(`/schedules/${id}`, { data: body });
  return r.data.data;
}

/** Download a single schedule's .ics. */
export async function downloadScheduleIcs(id) {
  const r = await api.get(`/schedules/${id}/ics`, { responseType: 'blob' });
  triggerBlobDownload(r.data, `schedule-${id}.ics`);
}

/** Download a filtered bulk .ics feed. */
export async function downloadSchedulesIcsBulk(params) {
  const r = await api.get('/schedules/export.ics', {
    params: clean(params),
    responseType: 'blob',
  });
  triggerBlobDownload(r.data, 'cmcmis-schedules.ics');
}
