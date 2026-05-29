// ============================================================================
// src/lib/hooks/useCalibrationPeople.js
// ----------------------------------------------------------------------------
// People lookup for calibration workflow dropdowns.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { fetchCalibrationPeople } from '../api/lookups.js';

const TTL_MS = 60 * 1000;
let cached = null;

export function useCalibrationPeople(enabled = true) {
  const fresh = cached && Date.now() - cached.ts < TTL_MS;
  const [items, setItems] = useState(fresh ? cached.items : null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!fresh && enabled);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    if (fresh) return undefined;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCalibrationPeople(ctrl.signal)
      .then((arr) => {
        if (cancelled) return;
        cached = { items: arr, ts: Date.now() };
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
  }, [enabled]);

  return { items, error, loading };
}

export function invalidateCalibrationPeople() { cached = null; }
