// ============================================================================
// src/lib/hooks/useJobRequestList.js  —  Stale-while-revalidate fetch hook
// ----------------------------------------------------------------------------
// Mirrors useEquipmentList — 30-second TTL keyed on JSON-stringified params,
// AbortController-based cancellation, single in-flight request per param set.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { fetchJobRequestList } from '../api/jobRequests.js';

const TTL_MS = 30 * 1000;
const cache = new Map();

export function useJobRequestList(params) {
  // Strip the internal _refresh seed before it reaches the API — the server's
  // Zod schema doesn't know about it and we only use it to bust the cache key.
  const { _refresh: _refreshSeed, ...apiParams } = params;

  // Include _refresh in the cache key so bumping it forces a fresh fetch.
  const key = JSON.stringify(params);
  const cached = cache.get(key);
  const fresh = cached && Date.now() - cached.ts < TTL_MS;

  const [data, setData] = useState(fresh ? cached.data : null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!fresh);
  const abortRef = useRef(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchJobRequestList(apiParams, ctrl.signal)
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

  // Exposed so the create flow can invalidate after a successful submit.
  function invalidateAll() { cache.clear(); }

  return { data, error, loading, invalidateAll };
}

/** Standalone invalidation (e.g. called after createJobRequest succeeds). */
export function invalidateJobRequestCache() { cache.clear(); }
