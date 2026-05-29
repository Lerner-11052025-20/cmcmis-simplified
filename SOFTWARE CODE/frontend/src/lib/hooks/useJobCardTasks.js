// ============================================================================
// src/lib/hooks/useJobCardTasks.js  —  Task Checklist data fetcher
// ----------------------------------------------------------------------------
// Used by Tab 10. Mutations elsewhere call invalidateJobCardTasks(id) to
// force a refetch. Optimistic toggle is handled by the component (not
// here) so that this hook stays purely a reader.
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchJobCardTasks } from '../api/jobCards.js';

const TTL_MS = 15 * 1000;
const cache = new Map();

export function useJobCardTasks(id) {
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
    fetchJobCardTasks(id, ctrl.signal)
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

export function invalidateJobCardTasks(id) {
  if (id == null) cache.clear();
  else cache.delete(String(id));
}
