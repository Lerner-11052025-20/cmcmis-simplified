// ============================================================================
// src/lib/hooks/useJobRequestDetail.js  —  Stale-while-revalidate fetch hook
// ----------------------------------------------------------------------------
// Mirrors useJobRequestList — 30-second TTL keyed on id, AbortController
// cancellation. Exposes invalidate() so the Convert/Reject mutations can
// drop the cached row + force a refetch.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { fetchJobRequestDetail } from '../api/jobRequests.js';

const TTL_MS = 30 * 1000;
const cache = new Map();

export function useJobRequestDetail(id) {
  const key = String(id);
  const cached = cache.get(key);
  const fresh = cached && Date.now() - cached.ts < TTL_MS;

  const [data, setData] = useState(fresh ? cached.data : null);
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

    fetchJobRequestDetail(id, ctrl.signal)
      .then((d) => {
        if (cancelled) return;
        cache.set(key, { data: d, ts: Date.now() });
        setData(d);
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

  /** Force refetch on next render. */
  function refetch() {
    cache.delete(key);
    setLoading(true);
    fetchJobRequestDetail(id)
      .then((d) => {
        cache.set(key, { data: d, ts: Date.now() });
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }

  return { data, error, loading, refetch };
}

/** Standalone invalidator (e.g. called after convert/reject succeeds). */
export function invalidateJobRequestDetail(id) {
  if (id == null) cache.clear();
  else cache.delete(String(id));
}
