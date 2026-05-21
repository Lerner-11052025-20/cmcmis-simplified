// ============================================================================
// src/pages/dashboard/Dashboard.jsx  —  /dashboard orchestrator
// ----------------------------------------------------------------------------
// Phase 8 Slice 1: replaces the Phase 4 shell at pages/Dashboard.jsx.
//
//   Layout:
//     ┌─────────────────────────────────────────────┐
//     │  DashboardHeader (title + refresh pill)     │
//     │  QuickActions    (2 CTA buttons)            │
//     │  KpiGrid         (4 KpiCards)               │
//     │  Errors          (banner if KPI fetch failed)│
//     └─────────────────────────────────────────────┘
//
// All data lives in `useDashboardKpis`. The page renders the BE-supplied
// payload directly — no variant branching in JSX, no role checks here.
// ============================================================================

import { useMemo } from 'react';
import { Layout } from '../../components/Layout.jsx';
import { useDashboardKpis } from '../../lib/hooks/useDashboardKpis.js';
import { useAuth } from '../../lib/auth-context.jsx';
import { DashboardHeader } from './DashboardHeader.jsx';
import { QuickActions } from './QuickActions.jsx';
import { KpiGrid } from './KpiGrid.jsx';
import { QuickRecap } from './QuickRecap.jsx';

export function Dashboard() {
  const { user } = useAuth();
  const { data, error, loading, refresh } = useDashboardKpis();

  // The BE stamps generatedAt as the wall-clock time AT compute time;
  // for cached responses cacheAgeMs > 0 so the freshness pill is
  // effectively "now() - cacheAgeMs".
  const lastFetchedAt = useMemo(() => {
    if (!data) return null;
    return new Date(Date.parse(data.generatedAt) + (data.cacheAgeMs || 0));
  }, [data]);

  // ProtectedRoute already guarantees `user` is non-null, but be defensive.
  if (!user) return null;

  const variant = data?.variant || 'org';

  return (
    <Layout>
      <div className="space-y-6">
        <DashboardHeader
          variant={variant}
          lastFetchedAt={lastFetchedAt}
          loading={loading}
          onRefresh={refresh}
        />

        <QuickActions actions={data?.quick_actions || []} />

        {/* Error banner — non-blocking, the last-good data stays visible */}
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Could not refresh KPIs:&nbsp;
            <span className="font-medium">
              {error.response?.data?.error?.message || error.message || 'unknown error'}
            </span>
          </div>
        ) : null}

        <KpiGrid cards={data?.cards || (loading ? null : [])} />

        {/* Quick Recap — Recent Activity feed (below KPI grid) */}
        <QuickRecap
          data={data?.recent_activity || null}
          loading={loading && !data}
        />
      </div>
    </Layout>
  );
}
