// ============================================================================
// src/lib/hooks/useJobCardDetail.js  —  JC detail page data fetcher
// ----------------------------------------------------------------------------
// More aggressive than the JR detail (decision D-9.9):
//   refetchInterval = 15 s  (engineer is actively working)
//   staleTime       = 10 s
//   refetchOnWindowFocus = effectively true (via re-effect when tab regains focus)
//
// Exposes refetch() so transitions can force-update.
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchJobCardDetail } from '../api/jobCards.js';

const POLL_MS = 15 * 1000;
const cache = new Map();
const STALE_MS = 10 * 1000;

export function useJobCardDetail(id) {
  const key = String(id || '');
  const cached = cache.get(key);
  const fresh = cached && Date.now() - cached.ts < STALE_MS;

  const [data, setData] = useState(fresh ? cached.data : null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!fresh);
  const abortRef = useRef(null);
  const intervalRef = useRef(null);

  const doFetch = useCallback((force = false) => {
    if (!id) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    if (force || !fresh) setLoading(true);
    fetchJobCardDetail(id, ctrl.signal)
      .then((d) => {
        cache.set(key, { data: d, ts: Date.now() });
        setData(d);
        setError(null);
      })
      .catch((e) => {
        if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return;
        setError(e);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, id]);

  useEffect(() => {
    doFetch(false);
    intervalRef.current = setInterval(() => doFetch(false), POLL_MS);

    // Refetch when window regains focus (D-9.9).
    function onFocus() { doFetch(false); }
    window.addEventListener('focus', onFocus);

    return () => {
      abortRef.current?.abort();
      clearInterval(intervalRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [doFetch]);

  return { data, error, loading, refetch: () => doFetch(true) };
}

export function invalidateJobCardDetail(id) {
  if (id == null) cache.clear();
  else cache.delete(String(id));
}
