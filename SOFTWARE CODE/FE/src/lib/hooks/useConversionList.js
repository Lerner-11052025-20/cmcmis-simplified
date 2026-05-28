// ============================================================================
// src/lib/hooks/useConversionList.js  —  /conversion page list fetcher
// ----------------------------------------------------------------------------
// The Conversion page has three tabs (Calibration / Inspection / Master
// Data Correction). Each tab is a JR list filtered to
//   - status = 'SUBMITTED'
//   - job_type = (matches the tab)
// Sorted by newest request first.
//
// We reuse the same backend list endpoint (`GET /job-requests`) so this
// hook is just a thin wrapper that supplies the right canonical params.
// 30-second polling keeps tab badge counts ~live during batch processing.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { fetchJobRequestList } from '../api/jobRequests.js';

const TTL_MS = 30 * 1000;
const cache = new Map();
const POLL_MS = 30 * 1000;

/**
 * @param {Object} params
 * @param {'CALIBRATION'|'REPAIR'|'REGISTRATION'} params.jobType
 * @param {number} [params.page]
 * @param {number} [params.pageSize]
 * @param {string} [params.q]
 * @param {string} [params.dateFrom]
 * @param {string} [params.dateTo]
 */
export function useConversionList({ jobType, page = 1, pageSize = 25, q, dateFrom, dateTo }) {
  const params = {
    page,
    page_size: pageSize,
    type: jobType,
    status: 'SUBMITTED',
    sort: '-created_at',
    ...(q ? { q } : {}),
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
  };
  const key = JSON.stringify(params);
  const cached = cache.get(key);
  const fresh = cached && Date.now() - cached.ts < TTL_MS;

  const [data, setData] = useState(fresh ? cached.data : null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!fresh);
  const abortRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    function doFetch(forceFresh = false) {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (forceFresh) setLoading(true);
      fetchJobRequestList(params, ctrl.signal)
        .then((d) => {
          if (cancelled) return;
          cache.set(key, { data: d, ts: Date.now() });
          setData(d);
          setError(null);
        })
        .catch((e) => {
          if (cancelled) return;
          if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return;
          setError(e);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    doFetch(!fresh);

    // 30s polling — refresh badge counts + table without user interaction.
    intervalRef.current = setInterval(() => doFetch(false), POLL_MS);

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, error, loading };
}

/** Drop EVERY cached conversion tab — call after Convert/Reject succeeds. */
export function invalidateConversionList() { cache.clear(); }
