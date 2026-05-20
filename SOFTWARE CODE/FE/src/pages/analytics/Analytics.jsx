// ============================================================================
// src/pages/analytics/Analytics.jsx  —  Standalone Analytics dashboard
// ----------------------------------------------------------------------------
// PHASE 11 SLICE 3 — redesigned with 12 spacious chart cards in
// "stock-market wavy" style.
//
// LAYOUT (1280px+ "lg" breakpoint):
//
//   Row 1  ┌────────────────── Weekly Activity Trend (hero, full width) ───────────────────┐
//   Row 2  │ Monthly Activity            │ │ Monthly Job Trends                            │
//   Row 3  │ Equipment Status (donut)    │ │ Cal Status Breakdown (radial)                 │
//   Row 4  │ Division-wise Jobs (pie)    │ │ Job Type Distribution (bar)                   │
//   Row 5  │ Calibration Completion      │ │ Equipment Registration                        │
//   Row 6  │ JC Lifecycle Funnel         │ │ (priority mix spans full width on next row)   │
//   Row 7  ┌────────────────── Priority Mix Trend (hero, full width) ────────────────────────┐
//   Row 8  ┌────────────────── Engineer Workload (hero, full width) ─────────────────────────┐
//
// FEATURES
//   • 12 chart cards (G1..G12). Each uses smooth wavy area curves where the
//     metric is time-series; categorical charts use rounded bars / pies.
//   • Cards are spacious: gap-6, rounded-xl, shadow on hover, individual
//     refresh buttons + CSV download icons.
//   • Auto-refresh every 30 s (react-query refetchInterval). Each card
//     shows "Updated Xs ago" or "refreshing…" in its footer.
//   • Global controls: Window picker (3/6/12/24 months), Division filter,
//     manual "Refresh all" button (invalidates every chart query).
//   • Permission: page-gated by `analytics:view`; CSV download buttons
//     hide for users without `reports:export`.
// ============================================================================

import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Layout } from '../../components/Layout.jsx';
import { fetchDivisions } from '../../lib/api/lookups.js';

import {
  MonthlyActivity,
  EquipmentStatus,
  MonthlyJobs,
  DivisionWise,
  CalibrationCompletion,
  JobTypeDistribution,
  EngineerWorkload,
  CalibrationStatusBreakdown,
  WeeklyActivity,
  JcLifecycleFunnel,
  EquipmentRegistrationTrend,
  PriorityMixTrend,
} from './AnalyticsCharts.jsx';

// Poll cadence. 30 s is the sweet spot — fresh enough to feel "live" on a
// glanceable dashboard, slow enough not to thrash the backend or burn the
// user's bandwidth. Override via `?poll=15` if needed for demos.
const DEFAULT_POLL_MS = 30_000;

export function Analytics() {
  // ── Filter state ──────────────────────────────────────────────────
  const [months,     setMonths]     = useState(6);
  const [divisionId, setDivisionId] = useState('');
  const [now, setNow] = useState(() => Date.now());  // for "updated Xs ago"

  // Tick `now` every second so the "Updated N s ago" badges refresh.
  // Cheap — one setState per second; no chart re-renders (charts memoize
  // on their own params + react-query dataUpdatedAt).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const qc = useQueryClient();
  const divQ = useQuery({
    queryKey: ['lookups', 'divisions'],
    queryFn:  ({ signal }) => fetchDivisions(signal),
    staleTime: 60 * 60 * 1000,
  });

  // Memoise so chart components don't see a "new" params object every render.
  const params = useMemo(() => ({
    months,
    divisionId: divisionId || undefined,
  }), [months, divisionId]);

  /** Invalidate every chart query so they all refetch at once. */
  function refreshAll() {
    qc.invalidateQueries({ queryKey: ['chart'] });
    toast.message('Refreshing all 12 charts…');
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* ── Page header ───────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Analytics</h1>
            <p className="mt-1 text-sm text-ink-soft max-w-2xl">
              Live KPI charts across calibrations, repairs, equipment, divisions
              and engineers — aggregated directly from the database and refreshed
              automatically every 30 seconds.
            </p>
            {/* Tiny live indicator — pulses to convey "data is flowing" */}
            <div className="mt-2 inline-flex items-center gap-2 text-[11px] text-ink-soft">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live dashboard · 30 s auto-refresh
            </div>
          </div>

          {/* Right side: filters + global refresh */}
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-ink-soft">
              <span className="block mb-1">Window</span>
              <select
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="rounded-md border border-border bg-base px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value={3}>Last 3 months</option>
                <option value={6}>Last 6 months</option>
                <option value={12}>Last 12 months</option>
                <option value={24}>Last 24 months</option>
              </select>
            </label>
            <label className="text-xs text-ink-soft">
              <span className="block mb-1">Division</span>
              <select
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value ? Number(e.target.value) : '')}
                disabled={divQ.isLoading}
                className="rounded-md border border-border bg-base px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
              >
                <option value="">All Divisions</option>
                {(divQ.data || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}{d.name ? ` — ${d.name}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
              Refresh All
            </button>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────── */}
        {/* Hero row — Weekly Activity (12-week wavy trend, span 2)  */}
        {/* ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeeklyActivity                params={params} pollMs={DEFAULT_POLL_MS} />
          {/* WeeklyActivity sets span=2 so it occupies both columns */}
        </div>

        {/* ──────────────────────────────────────────────────────── */}
        {/* Monthly activity + monthly jobs                          */}
        {/* ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyActivity               params={params} pollMs={DEFAULT_POLL_MS} />
          <MonthlyJobs                   params={params} pollMs={DEFAULT_POLL_MS} />
        </div>

        {/* ──────────────────────────────────────────────────────── */}
        {/* Equipment status + calibration band radial               */}
        {/* ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EquipmentStatus               params={params} pollMs={DEFAULT_POLL_MS} />
          <CalibrationStatusBreakdown    params={params} pollMs={DEFAULT_POLL_MS} />
        </div>

        {/* ──────────────────────────────────────────────────────── */}
        {/* Division-wise + job type distribution                    */}
        {/* ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DivisionWise                  params={params} pollMs={DEFAULT_POLL_MS} />
          <JobTypeDistribution           params={params} pollMs={DEFAULT_POLL_MS} />
        </div>

        {/* ──────────────────────────────────────────────────────── */}
        {/* Calibration completion + equipment registration trend    */}
        {/* ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CalibrationCompletion         params={params} pollMs={DEFAULT_POLL_MS} />
          <EquipmentRegistrationTrend    params={params} pollMs={DEFAULT_POLL_MS} />
        </div>

        {/* ──────────────────────────────────────────────────────── */}
        {/* JC funnel + engineer workload hero                       */}
        {/* ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <JcLifecycleFunnel             params={params} pollMs={DEFAULT_POLL_MS} />
          {/* Priority mix is in its own row below since it's span 2;
              leave the second column of this row empty intentionally to
              give the funnel some breathing room. */}
          <div className="hidden lg:block" />
        </div>

        {/* ──────────────────────────────────────────────────────── */}
        {/* Priority mix hero (span 2)                               */}
        {/* ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PriorityMixTrend              params={params} pollMs={DEFAULT_POLL_MS} />
        </div>

        {/* ──────────────────────────────────────────────────────── */}
        {/* Engineer workload hero (span 2)                          */}
        {/* ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EngineerWorkload              params={params} pollMs={DEFAULT_POLL_MS} />
        </div>
      </div>
    </Layout>
  );
}
