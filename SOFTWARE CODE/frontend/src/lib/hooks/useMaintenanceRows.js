// ============================================================================
// src/lib/hooks/useMaintenanceRows.js
// ----------------------------------------------------------------------------
// SWR-style cache for the Maintenance Details multi-row tab. TTL 15 s
// (engineer is actively editing), refetch on mount.
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchMaintenanceRows } from '../api/jobCards.js';

const TTL_MS = 15 * 1000;
const cache = new Map();

export function useMaintenanceRows(id) {
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
    fetchMaintenanceRows(id, ctrl.signal)
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
  }, [key, id]);

  useEffect(() => {
    doFetch();
    return () => abortRef.current?.abort();
  }, [doFetch]);

  return { items, error, loading, refetch: doFetch };
}

export function invalidateMaintenanceRows(id) {
  if (id == null) cache.clear();
  else cache.delete(String(id));
}
