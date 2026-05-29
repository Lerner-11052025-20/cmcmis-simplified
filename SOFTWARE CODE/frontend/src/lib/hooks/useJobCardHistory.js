// ============================================================================
// src/lib/hooks/useJobCardHistory.js
// ----------------------------------------------------------------------------
// Status-history timeline data. Append-only, small payload — cache 30 s.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { fetchJobCardHistory } from '../api/jobCards.js';

const TTL_MS = 30 * 1000;
const cache = new Map();

export function useJobCardHistory(id) {
  const key = String(id || '');
  const cached = cache.get(key);
  const fresh = cached && Date.now() - cached.ts < TTL_MS;

  const [items, setItems] = useState(fresh ? cached.items : null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!fresh);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!id) return undefined;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    fetchJobCardHistory(id, ctrl.signal)
      .then((arr) => {
        cache.set(key, { items: arr, ts: Date.now() });
        setItems(arr);
      })
      .catch((e) => {
        if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return;
        setError(e);
      })
      .finally(() => setLoading(false));

    return () => { ctrl.abort(); };
  }, [key, id]);

  return { items, error, loading };
}

export function invalidateJobCardHistory(id) {
  if (id == null) cache.clear();
  else cache.delete(String(id));
}
