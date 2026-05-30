// ============================================================================
// src/lib/api/projects.js  —  Projects HTTP API wrappers
// ----------------------------------------------------------------------------
// thin wrappers around the central `api` axios instance.
// ============================================================================

import { api } from '../api-client.js';

/**
 * Fetch a paginated list of projects with search filtering.
 * @param {Object} params
 * @param {number} [params.page]
 * @param {number} [params.pageSize]
 * @param {string} [params.q]
 * @param {AbortSignal} [signal]
 */
export async function fetchProjects({ page = 1, pageSize = 25, q = '' } = {}, signal) {
  const r = await api.get('/projects', {
    params: { page, page_size: pageSize, q },
    signal,
  });
  return r.data.data;
}

/**
 * Create a new dynamic project (Super Admin only).
 * @param {Object} body
 * @param {string} body.name
 * @param {boolean} [body.is_active]
 */
export async function createProject(body) {
  const r = await api.post('/projects', body);
  return r.data.data;
}

/**
 * Update an existing dynamic project (Super Admin only).
 * @param {number} id
 * @param {Object} body
 * @param {string} [body.name]
 * @param {boolean} [body.is_active]
 */
export async function updateProject(id, body) {
  const r = await api.put(`/projects/${id}`, body);
  return r.data.data;
}

/**
 * Delete a dynamic project permanently from database (Super Admin only).
 * @param {number} id
 */
export async function deleteProject(id) {
  const r = await api.delete(`/projects/${id}`);
  return r.data.data;
}
