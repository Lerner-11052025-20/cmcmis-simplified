// ============================================================================
// src/lib/hooks/useDashboardKpis.js  —  Polling KPI fetcher
// ----------------------------------------------------------------------------
// Powered by React Query's useQuery.
// Polls /dashboard/kpis every 30 s by default (P8-D9).
// Automatically refetches when the tab regains focus or window is focused.
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { fetchDashboardKpis } from '../api/dashboard.js';

const DEFAULT_INTERVAL_MS = 30 * 1000;

export function useDashboardKpis({ intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['dashboardKpis'],
    queryFn: ({ signal }) => fetchDashboardKpis(signal),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  });

  return {
    data: data || null,
    error: error || null,
    loading: isPending,
    refresh: refetch,
  };
}
