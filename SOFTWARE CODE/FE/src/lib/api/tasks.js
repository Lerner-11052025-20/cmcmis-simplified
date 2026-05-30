// ============================================================================
// src/lib/api/tasks.js  —  Tasks HTTP API wrappers
// ----------------------------------------------------------------------------
// thin wrappers around the central `api` axios instance.
// ============================================================================

import { api } from '../api-client.js';

/**
 * Fetch a paginated list of tasks with search filtering.
 * @param {Object} params
 * @param {number} [params.page]
 * @param {number} [params.pageSize]
 * @param {string} [params.q]
 * @param {string} [params.type]
 * @param {AbortSignal} [signal]
 */
export async function fetchTasks({ page = 1, pageSize = 25, q = '', type = '' } = {}, signal) {
  const r = await api.get('/tasks', {
    params: { page, page_size: pageSize, q, type },
    signal,
  });
  return r.data.data;
}

/**
 * Create a new dynamic task (Super Admin only).
 * @param {Object} body
 * @param {string} body.name
 * @param {string} body.type
 * @param {string} [body.desc]
 * @param {number} [body.est_hour]
 * @param {boolean} [body.is_active]
 */
export async function createTask(body) {
  const r = await api.post('/tasks', body);
  return r.data.data;
}

/**
 * Update an existing dynamic task (Super Admin only).
 * @param {number} id
 * @param {Object} body
 * @param {string} [body.name]
 * @param {string} [body.type]
 * @param {string} [body.desc]
 * @param {number} [body.est_hour]
 * @param {boolean} [body.is_active]
 */
export async function updateTask(id, body) {
  const r = await api.put(`/tasks/${id}`, body);
  return r.data.data;
}

/**
 * Delete a dynamic task permanently from database (Super Admin only).
 * @param {number} id
 */
export async function deleteTask(id) {
  const r = await api.delete(`/tasks/${id}`);
  return r.data.data;
}
