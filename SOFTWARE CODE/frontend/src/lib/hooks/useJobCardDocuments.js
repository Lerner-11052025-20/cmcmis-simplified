// ============================================================================
// src/lib/hooks/useJobCardDocuments.js  —  Documents tab data fetcher
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchJobCardDocuments } from '../api/jobCards.js';

const TTL_MS = 15 * 1000;
const cache = new Map();

export function useJobCardDocuments(id) {
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
    fetchJobCardDocuments(id, ctrl.signal)
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

export function invalidateJobCardDocuments(id) {
  if (id == null) cache.clear();
  else cache.delete(String(id));
}
