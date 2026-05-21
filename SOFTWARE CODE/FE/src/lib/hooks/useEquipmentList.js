// ============================================================================
// src/lib/hooks/useEquipmentList.js  —  Equipment list fetch + cache hook
// ----------------------------------------------------------------------------
// Stale-while-revalidate: a 30-second module-level cache keyed on the
// JSON-stringified params. Re-renders are instant for repeat queries; a
// background refetch always runs to keep the cache fresh.
//
// AbortController is used to cancel in-flight requests when params
// change mid-fetch — eliminates the "stale response wins" bug.
//
// We did NOT add React Query in this phase. The hook surface is small
// enough that a 60-line custom hook is simpler than the dep.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { fetchEquipmentList } from '../api/equipment.js';

const TTL_MS = 30 * 1000;       // 30 seconds
const cache = new Map();         // key -> { data, ts }

/**
 * @param {Object} params  All keys serialisable (page, page_size, q, …)
 *   _refresh (optional): internal seed — stripped before reaching the API,
 *   only used to bust the JSON cache key after a bulk mutation.
 */
export function useEquipmentList(params) {
  // Strip the internal _refresh seed before it reaches the API.
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
    // Cancel any earlier request whose result would now be stale.
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchEquipmentList(apiParams, ctrl.signal)
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

    return () => {
      cancelled = true;
      ctrl.abort();
    };
    // We intentionally key the effect on the serialised params string so
    // re-renders with the same logical params skip the fetch entirely.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Exposed so bulk-mutation flows can clear the cache and force a re-fetch.
  function invalidateAll() { cache.clear(); }

  return { data, error, loading, invalidateAll };
}
