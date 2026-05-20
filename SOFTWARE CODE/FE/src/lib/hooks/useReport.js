// ============================================================================
// src/lib/hooks/useReport.js  —  React-Query hooks for Phase-10 reports + charts
// ----------------------------------------------------------------------------
// Two hooks:
//   • useReport(key, params)  ← fetches one report's JSON view
//   • useChart(key, params)   ← fetches one chart's aggregated data
//
// Both leverage the global QueryClient registered in main.jsx, so
// concurrent calls automatically dedupe by queryKey.
//
// CANCELLATION
//   react-query's `signal` flows into axios, which honours AbortSignal —
//   navigating away during a fetch transparently cancels the in-flight
//   request rather than leaking it.
//
// KEYING
//   queryKey = ['report'|'chart', key, paramsObject]
//   The object form lets react-query detect filter changes via deep
//   equality — same filters → cache hit, any change → refetch.
// ============================================================================

import { useQuery } from '@tanstack/react-query';

import { fetchReport, fetchChart } from '../api/reports.js';

/**
 * Fetch a report's JSON view (summary + rows + meta + total).
 *
 * @param {string} key      one of REPORT_KEYS
 * @param {Object} params   filter params (dateFrom/dateTo/divisionId/status/...)
 * @param {Object} options  passthrough — { enabled, refetchInterval, etc. }
 */
export function useReport(key, params, options = {}) {
  return useQuery({
    queryKey: ['report', key, params],
    queryFn:  ({ signal }) => fetchReport(key, params, signal),
    ...options,
  });
}

/**
 * Fetch a chart dataset (array of {month, count, ...} objects).
 *
 * @param {string} key      one of CHART_KEYS
 * @param {Object} params   filter params (months/divisionId/dateFrom/dateTo)
 * @param {Object} options  passthrough
 */
export function useChart(key, params, options = {}) {
  return useQuery({
    queryKey: ['chart', key, params],
    queryFn:  ({ signal }) => fetchChart(key, params, signal),
    // Charts share the global 30s staleTime, but we can override per-chart.
    ...options,
  });
}
