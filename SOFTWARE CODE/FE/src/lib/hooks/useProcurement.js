// ============================================================================
// src/lib/hooks/useProcurement.js  —  Procurement react-query hooks
// ----------------------------------------------------------------------------
// PHASE 13 — Procurement sub-module
//
// Hooks:
//   usePurchaseOrders(params)         — list
//   usePurchaseOrder(id)              — detail
//   useSpareParts(params)             — list
//   useSparePart(id)                  — detail
//   useProcurementMutations()         — all writes (PO + spare + order)
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchPurchaseOrders, fetchPurchaseOrder,
  createPurchaseOrder, editPurchaseOrder,
  fetchSpareParts, fetchSparePart,
  createSparePart, editSparePart, orderSparePart,
} from '../api/procurement.js';

const KEY_PO    = 'procurement-po';
const KEY_SPARE = 'procurement-spare';


export function usePurchaseOrders(params) {
  const q = useQuery({
    queryKey: [KEY_PO, 'list', params],
    queryFn:  ({ signal }) => fetchPurchaseOrders(params, signal),
    keepPreviousData: true,
    refetchOnWindowFocus: true,
  });
  return {
    items:      q.data?.items || [],
    pagination: q.data?.pagination || null,
    loading:    q.isLoading,
    error:      q.error,
    refetch:    q.refetch,
  };
}

export function usePurchaseOrder(id) {
  const q = useQuery({
    queryKey: [KEY_PO, 'detail', id],
    queryFn:  ({ signal }) => fetchPurchaseOrder(id, signal),
    enabled:  Boolean(id),
  });
  return { po: q.data || null, loading: q.isLoading, error: q.error, refetch: q.refetch };
}


export function useSpareParts(params) {
  const q = useQuery({
    queryKey: [KEY_SPARE, 'list', params],
    queryFn:  ({ signal }) => fetchSpareParts(params, signal),
    keepPreviousData: true,
    refetchOnWindowFocus: true,
  });
  return {
    items:      q.data?.items || [],
    pagination: q.data?.pagination || null,
    loading:    q.isLoading,
    error:      q.error,
    refetch:    q.refetch,
  };
}

export function useSparePart(id) {
  const q = useQuery({
    queryKey: [KEY_SPARE, 'detail', id],
    queryFn:  ({ signal }) => fetchSparePart(id, signal),
    enabled:  Boolean(id),
  });
  return { spare: q.data || null, loading: q.isLoading, error: q.error };
}


export function useProcurementMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [KEY_PO] });
    qc.invalidateQueries({ queryKey: [KEY_SPARE] });
  };

  const createPo    = useMutation({ mutationFn: createPurchaseOrder, onSuccess: invalidate });
  const editPo      = useMutation({ mutationFn: ({ id, body }) => editPurchaseOrder(id, body), onSuccess: invalidate });
  const createSpare = useMutation({ mutationFn: createSparePart, onSuccess: invalidate });
  const editSpare   = useMutation({ mutationFn: ({ id, body }) => editSparePart(id, body), onSuccess: invalidate });
  const orderSpare  = useMutation({ mutationFn: ({ id, body }) => orderSparePart(id, body), onSuccess: invalidate });

  return {
    createPo, editPo, createSpare, editSpare, orderSpare,
    busy: createPo.isPending || editPo.isPending
      || createSpare.isPending || editSpare.isPending || orderSpare.isPending,
  };
}
