// ============================================================================
// src/lib/hooks/useEngineersLookup.js  —  Engineer dropdown source
// ----------------------------------------------------------------------------
// 60-second TTL — engineer workload counts shift slowly and the LIC may
// open the modal repeatedly while batch-processing the Conversion queue.
// Exposes refetch() so the Convert success handler can force-update the
// counts (an engineer who just got a card has +1 active_card_count).
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { fetchEngineers } from '../api/lookups.js';

const TTL_MS = 60 * 1000;
let cached = null;       // { items, ts } | null  — module-scoped (single resource)

export function useEngineersLookup(enabled = true) {
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

    fetchEngineers(ctrl.signal)
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

/** Drop the cached engineer list (post-convert). */
export function invalidateEngineersLookup() { cached = null; }
