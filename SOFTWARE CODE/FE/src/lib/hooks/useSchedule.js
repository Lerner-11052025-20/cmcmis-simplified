// ============================================================================
// src/lib/hooks/useSchedule.js  —  Schedule react-query hooks
// ----------------------------------------------------------------------------
// PHASE 13 — Schedule sub-module
//
// Three hooks:
//
//   useSchedules(params)        — list / calendar (auto refetch on focus)
//   useScheduleDetail(id)       — single record
//   useScheduleMutations()      — create / edit / transition / cancel
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchSchedules,
  fetchScheduleDetail,
  createSchedule as apiCreate,
  editSchedule   as apiEdit,
  transitionSchedule as apiTransition,
  cancelSchedule as apiCancel,
} from '../api/schedule.js';


/**
 * Cache key prefix — all schedule queries hang off this so a successful
 * mutation can invalidate everything with a single `invalidateQueries({
 * queryKey: ['schedules'] })` call.
 */
const KEY_ROOT = 'schedules';


export function useSchedules(params) {
  const q = useQuery({
    queryKey: [KEY_ROOT, 'list', params],
    queryFn:  ({ signal }) => fetchSchedules(params, signal),
    keepPreviousData: true,
    refetchOnWindowFocus: true,
  });
  return {
    items:      q.data?.items || [],
    pagination: q.data?.pagination || null,
    loading:    q.isLoading,
    fetching:   q.isFetching,
    error:      q.error,
    refetch:    q.refetch,
  };
}


export function useScheduleDetail(id) {
  const q = useQuery({
    queryKey: [KEY_ROOT, 'detail', id],
    queryFn:  ({ signal }) => fetchScheduleDetail(id, signal),
    enabled:  Boolean(id),
  });
  return {
    schedule: q.data || null,
    loading:  q.isLoading,
    error:    q.error,
    refetch:  q.refetch,
  };
}


export function useScheduleMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [KEY_ROOT] });

  const create     = useMutation({ mutationFn: apiCreate,       onSuccess: invalidate });
  const edit       = useMutation({ mutationFn: ({ id, body }) => apiEdit(id, body),       onSuccess: invalidate });
  const transition = useMutation({ mutationFn: ({ id, body }) => apiTransition(id, body), onSuccess: invalidate });
  const cancel     = useMutation({ mutationFn: ({ id, body }) => apiCancel(id, body),     onSuccess: invalidate });

  return { create, edit, transition, cancel,
    busy: create.isPending || edit.isPending || transition.isPending || cancel.isPending };
}
