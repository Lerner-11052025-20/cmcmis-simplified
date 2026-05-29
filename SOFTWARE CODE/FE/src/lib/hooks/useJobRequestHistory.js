// ============================================================================
// src/lib/hooks/useJobRequestHistory.js  —  Status-history fetch hook
// ----------------------------------------------------------------------------
// Used by the Timeline component on the JR Detail page. 30-second TTL —
// the history is append-only and tiny, but we still cache so navigating
// away and back doesn't refetch.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { fetchJobRequestHistory } from '../api/jobRequests.js';

const TTL_MS = 30 * 1000;
const cache = new Map();

export function useJobRequestHistory(id) {
  const key = String(id);
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

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchJobRequestHistory(id, ctrl.signal)
      .then((arr) => {
        if (cancelled) return;
        cache.set(key, { items: arr, ts: Date.now() });
        setItems(arr);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return;
        setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { items, error, loading };
}

export function invalidateJobRequestHistory(id) {
  if (id == null) cache.clear();
  else cache.delete(String(id));
}
