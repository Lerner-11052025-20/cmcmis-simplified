// ============================================================================
// src/lib/hooks/useDashboardKpis.js  —  Polling KPI fetcher
// ----------------------------------------------------------------------------
// Polls /dashboard/kpis every 30 s by default (P8-D9). Also re-fetches
// when the tab regains focus (covers the "I tabbed away for 5 minutes"
// case so the user doesn't stare at stale numbers).
//
// EXPOSED:
//   data, error, loading, refresh()   ← refresh() is the "manual refresh"
//                                       button on the header.
//
// SHAPE
//   data = full payload from the API (variant, cards, quick_actions,
//          generatedAt, cacheAgeMs, cacheHit). The page renders
//          straight from this — no further branching.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDashboardKpis } from '../api/dashboard.js';

const DEFAULT_INTERVAL_MS = 30 * 1000;

export function useDashboardKpis({ intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  // Bumping this triggers the effect below; used by refresh().
  const [tick, setTick] = useState(0);
  const abortRef = useRef(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let cancelled = false;

    // Don't blank the UI between polls — keep showing the last good data
    // while we refresh. Loading spinner is only the first-load case.
    if (data === null) setLoading(true);
    setError(null);

    fetchDashboardKpis(ctrl.signal)
      .then((d) => {
        if (cancelled) return;
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
    // We intentionally re-run on `tick` (refresh() / poll) and NOT on
    // `data` — we DO NOT want a fetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // Periodic poll. Independent of the effect above so it never stacks
  // multiple timers.
  useEffect(() => {
    if (intervalMs <= 0) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  // Refresh on tab focus (user just tabbed back to us).
  useEffect(() => {
    const onFocus = () => setTick((n) => n + 1);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  return { data, error, loading, refresh };
}
