// ============================================================================
// src/lib/hooks/useEquipmentList.js  —  Equipment list fetch + cache hook
// ----------------------------------------------------------------------------
// Stale-while-revalidate: Powered by React Query's useQuery.
// Unifies caching, auto-refetch, window-focus sync, and abort handling.
// ============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEquipmentList } from '../api/equipment.js';

/**
 * @param {Object} params  All keys serialisable (page, page_size, q, …)
 *   _refresh (optional): internal seed — stripped before reaching the API,
 *   only used to bust the JSON cache key after a bulk mutation.
 */
export function useEquipmentList(params, options = {}) {
  const queryClient = useQueryClient();
  const enabled = options.enabled !== false;
  
  // Strip the internal _refresh seed before it reaches the API.
  const { _refresh: _refreshSeed, ...apiParams } = params;

  // Key the query by apiParams and _refreshSeed so modifications force a fetch.
  const queryKey = ['equipmentList', apiParams, _refreshSeed];

  const { data, error, isPending, isFetching } = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchEquipmentList(apiParams, signal),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['equipmentList'] });
  };

  return {
    data: data || null,
    error: error || null,
    loading: isPending,
    invalidateAll,
  };
}
