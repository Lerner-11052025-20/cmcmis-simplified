// ============================================================================
// src/lib/hooks/useEmployeeList.js  —  Stale-while-revalidate fetch hook
// ----------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { fetchEmployeeList } from '../api/employees.js';

const TTL_MS = 30 * 1000;
const cache = new Map();

export function useEmployeeList(params) {
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

    fetchEmployeeList(params, ctrl.signal)
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
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, error, loading };
}

export function invalidateEmployeeCache() { cache.clear(); }
