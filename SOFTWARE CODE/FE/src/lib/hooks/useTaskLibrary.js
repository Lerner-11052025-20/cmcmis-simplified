// ============================================================================
// src/lib/hooks/useTaskLibrary.js  —  Library task dropdown source
// ----------------------------------------------------------------------------
// Library is reference data — cache 5 minutes. Filtered by category by
// default; pass null for "show all" toggle.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { fetchTaskLibrary } from '../api/lookups.js';

const TTL_MS = 5 * 60 * 1000;
const cache = new Map();

/** @param {'CALIBRATION'|'INSPECTION'|'MAINTENANCE'|null} category */
export function useTaskLibrary(category) {
  const key = category == null ? '_all_' : category;
  const cached = cache.get(key);
  const fresh = cached && Date.now() - cached.ts < TTL_MS;

  const [items, setItems] = useState(fresh ? cached.items : null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!fresh);
  const abortRef = useRef(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    fetchTaskLibrary(category || null, ctrl.signal)
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
    return () => ctrl.abort();
  }, [key, category]);

  return { items, error, loading };
}
