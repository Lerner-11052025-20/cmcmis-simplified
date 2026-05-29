// ============================================================================
// src/lib/hooks/useCalibrationRows.js
// ----------------------------------------------------------------------------
// SWR-style caches for calibration workflow multi-row tabs.
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  fetchCalibrationEquipmentRows,
  fetchCalibrationAdjustmentRows,
} from '../api/jobCards.js';

const TTL_MS = 15 * 1000;
const equipmentCache = new Map();
const adjustmentCache = new Map();

function useRows(id, cache, fetcher) {
  const key = String(id || '');
  const cached = cache.get(key);
  const fresh = cached && Date.now() - cached.ts < TTL_MS;

  const [items, setItems] = useState(fresh ? cached.items : null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!fresh);
  const abortRef = useRef(null);

  const doFetch = useCallback(() => {
    if (!id) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    fetcher(id, ctrl.signal)
      .then((arr) => {
        cache.set(key, { items: arr, ts: Date.now() });
        setItems(arr);
        setError(null);
      })
      .catch((e) => {
        if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return;
        setError(e);
      })
      .finally(() => setLoading(false));
  }, [cache, fetcher, id, key]);

  useEffect(() => {
    doFetch();
    return () => abortRef.current?.abort();
  }, [doFetch]);

  return { items, error, loading, refetch: doFetch };
}

export function useCalibrationEquipmentRows(id) {
  return useRows(id, equipmentCache, fetchCalibrationEquipmentRows);
}

export function useCalibrationAdjustmentRows(id) {
  return useRows(id, adjustmentCache, fetchCalibrationAdjustmentRows);
}

export function invalidateCalibrationEquipmentRows(id) {
  if (id == null) equipmentCache.clear();
  else equipmentCache.delete(String(id));
}

export function invalidateCalibrationAdjustmentRows(id) {
  if (id == null) adjustmentCache.clear();
  else adjustmentCache.delete(String(id));
}
