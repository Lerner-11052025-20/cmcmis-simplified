// ============================================================================
// src/lib/hooks/useInquirySearch.js  —  Debounced + abortable search hook
// ----------------------------------------------------------------------------
// Generic "search this tab" hook. Caller supplies the fetcher function;
// hook supplies:
//   • 300 ms debounce on `params.q` (P8-D11)
//   • AbortController on every fetch (so a stale request can't overwrite
//     a newer result)
//   • loading flag + error surfacing
//
// USAGE
//   const { data, error, loading } = useInquirySearch(
//     fetchInquiryVendors,
//     { q, type, page, page_size },
//   );
//
// We do NOT cache results (unlike useAdminUserList): an inquiry is a
// one-shot lookup. The 30 s SWR pattern from list pages is overkill here
// and would cause the user's old search to flash back into the table
// when they navigate away and back.
// ============================================================================

import { useEffect, useRef, useState } from 'react';

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * @template T
 * @param {(params: any, signal: AbortSignal) => Promise<T>} fetcher
 * @param {Object} params
 * @param {number} [debounceMs]
 */
export function useInquirySearch(fetcher, params, debounceMs = DEFAULT_DEBOUNCE_MS) {
  const [data, setData]       = useState(null);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(null);

  // Stable JSON key so React's deps comparison stays cheap.
  const key = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    // Debounce: schedule the fetch a few hundred ms in the future.
    // If `params` changes again before that, the timer clears.
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setError(null);

      fetcher(params, ctrl.signal)
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
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, debounceMs]);

  return { data, error, loading };
}
