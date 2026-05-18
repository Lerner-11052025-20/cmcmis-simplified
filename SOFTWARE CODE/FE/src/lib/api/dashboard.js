// ============================================================================
// src/lib/api/dashboard.js  —  Dashboard module HTTP wrapper
// ----------------------------------------------------------------------------
// Single endpoint: GET /api/v1/dashboard/kpis. The BE branches the response
// shape (variant: 'org' | 'my') based on the JWT-issued role; the FE
// renders whatever the payload tells it.
// ============================================================================

import { api } from '../api-client.js';

/**
 * Fetch the role-aware KPI snapshot.
 *
 * @param {AbortSignal} [signal]
 * @returns {Promise<{
 *   variant: 'my' | 'org',
 *   cards: Array<{
 *     id: string, label: string, value: number, value_kind: 'count'|'percent',
 *     subtitle: string, icon: string, accent: string, href: string
 *   }>,
 *   quick_actions: Array<{
 *     label: string, href: string, icon: string, primary: boolean, requires: string
 *   }>,
 *   generatedAt: string,
 *   cacheAgeMs: number,
 *   cacheHit:   boolean
 * }>}
 */
export async function fetchDashboardKpis(signal) {
  const r = await api.get('/dashboard/kpis', { signal });
  return r.data.data;
}
