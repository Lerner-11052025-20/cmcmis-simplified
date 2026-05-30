// ============================================================================
// src/lib/api/capacity.js  —  Lab Capacity HTTP API wrappers
// ----------------------------------------------------------------------------
// thin wrappers around the central `api` axios instance.
// ============================================================================

import { api } from '../api-client.js';

/**
 * Fetch real-time lab capacity metrics including workloads, queue sizes, and SLA rates.
 * @param {AbortSignal} [signal]
 */
export async function fetchLabCapacity(signal) {
  const r = await api.get('/analytics/lab-capacity', { signal });
  return r.data.data;
}
