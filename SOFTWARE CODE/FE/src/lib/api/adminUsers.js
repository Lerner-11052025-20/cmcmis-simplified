// ============================================================================
// src/lib/api/adminUsers.js  —  Admin · Users module HTTP wrappers
// ----------------------------------------------------------------------------
// Thin wrappers around the central `api` axios instance. Every function
// returns the unwrapped data (`r.data.data`) so callers don't repeat the
// double-data dance.
// ============================================================================

import { api } from '../api-client.js';

export async function fetchAdminUserList(params = {}, signal) {
  const r = await api.get('/admin/users', { params, signal });
  return r.data.data;     // { items, pagination, applied_filters }
}

export async function fetchAdminUser(id, signal) {
  const r = await api.get(`/admin/users/${encodeURIComponent(id)}`, { signal });
  return r.data.data;
}

export async function fetchAdminUserHistory(id, signal) {
  const r = await api.get(`/admin/users/${encodeURIComponent(id)}/history`, { signal });
  return r.data.data.items;
}

export async function changeUserRole(id, body) {
  const r = await api.patch(`/admin/users/${encodeURIComponent(id)}/role`, body);
  return r.data.data;
}

export async function activateUser(id, body = {}) {
  const r = await api.patch(`/admin/users/${encodeURIComponent(id)}/activate`, body);
  return r.data.data;
}

export async function deactivateUser(id, body) {
  const r = await api.patch(`/admin/users/${encodeURIComponent(id)}/deactivate`, body);
  return r.data.data;
}

export async function forceLogoutUser(id, body = {}) {
  const r = await api.post(`/admin/users/${encodeURIComponent(id)}/force-logout`, body);
  return r.data.data;
}
