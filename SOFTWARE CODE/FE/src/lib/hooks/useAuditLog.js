// ============================================================================
// src/lib/hooks/useAuditLog.js  —  Audit Log react-query hooks
// ----------------------------------------------------------------------------
// PHASE 14 — Audit Log Viewer (read-only)
//
// Three hooks:
//   useAuditList(params)           — paginated list with keepPreviousData
//   useAuditDetail(id, params)     — single row, enabled iff id provided
//   useAuditFilters(source)        — distinct-values dropdown (15 min stale)
// ============================================================================

import { useQuery } from '@tanstack/react-query';

import { fetchAuditList, fetchAuditDetail, fetchAuditFilters } from '../api/audit.js';


const KEY = 'audit';
// Filter dropdowns rarely change — match the BE in-process cache TTL.
const FILTERS_STALE_MS = 15 * 60 * 1000;


export function useAuditList(params) {
  const q = useQuery({
    queryKey: [KEY, 'list', params],
    queryFn:  ({ signal }) => fetchAuditList(params, signal),
    keepPreviousData: true,
    // Audit data is append-only and read frequently — short stale window so
    // a refresh tap returns fresh rows without thrashing.
    refetchOnWindowFocus: true,
  });
  return {
    items:           q.data?.items || [],
    pagination:      q.data?.pagination || null,
    appliedFilters:  q.data?.applied_filters || null,
    source:          q.data?.source || params?.source || 'audit_log',
    loading:         q.isLoading,
    fetching:        q.isFetching,
    error:           q.error,
    refetch:         q.refetch,
  };
}


export function useAuditDetail(id, params) {
  const q = useQuery({
    queryKey: [KEY, 'detail', id, params],
    queryFn:  ({ signal }) => fetchAuditDetail(id, params, signal),
    enabled:  Boolean(id),
  });
  return {
    row:      q.data || null,
    loading:  q.isLoading,
    error:    q.error,
  };
}


export function useAuditFilters(source) {
  const q = useQuery({
    queryKey: [KEY, 'filters', source],
    queryFn:  ({ signal }) => fetchAuditFilters(source, signal),
    staleTime: FILTERS_STALE_MS,
  });
  return {
    actions:     q.data?.actions      || [],
    entityTypes: q.data?.entityTypes  || [],
    loading:     q.isLoading,
    error:       q.error,
  };
}
