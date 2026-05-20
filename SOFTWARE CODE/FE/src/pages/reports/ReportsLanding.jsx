// ============================================================================
// src/pages/reports/ReportsLanding.jsx  —  /reports page orchestrator
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// Page layout (mirrors the attached UI):
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │ Reports                                                      │
//   │ Generate and export various system reports.                  │
//   ├──────────────────────────────────────────────────────────────┤
//   │ ▢ Calibration Due  ▢ Pending Jobs  ▢ Equipment Utilization   │
//   │ ▢ Engineer Summary ▢ Job Card Summary ▢ Job Request Summary  │
//   ├──────────────────────────────────────────────────────────────┤
//   │ Report Filters [Date From][Date To][Division ▾][Status ▾]    │
//   │              [Apply] [Reset]                                 │
//   ├──────────────────────────────────────────────────────────────┤
//   │ Summary tiles (per active report)                            │
//   │ Detailed table (per active report)                           │
//   ├──────────────────────────────────────────────────────────────┤
//   │ Analytics Grid — 8 charts (G1..G8)                           │
//   ├──────────────────────────────────────────────────────────────┤
//   │ Export panel — Export as PDF · Export as Excel · Print       │
//   └──────────────────────────────────────────────────────────────┘
//
// State held here:
//   • activeKey   — which report card is open (defaults to the first
//                    report the user has permission for)
//   • filters     — { dateFrom, dateTo, divisionId, status }
//   • page        — current table page (resets to 1 on filter change)
// ============================================================================

import { useEffect, useMemo, useState } from 'react';

import { Layout } from '../../components/Layout.jsx';
import { useAuth } from '../../lib/auth-context.jsx';
import { useReport } from '../../lib/hooks/useReport.js';

import { REPORTS, reportByKey } from './reportConfig.js';
import { ReportCards } from './ReportCards.jsx';
import { ReportFilters } from './ReportFilters.jsx';
import { SummaryTiles } from './SummaryTiles.jsx';
import { ReportTable } from './ReportTable.jsx';
import { ExportPanel } from './ExportPanel.jsx';
import { AnalyticsGrid } from './charts/AnalyticsGrid.jsx';

const PAGE_SIZE = 50;

export function ReportsLanding() {
  const { user } = useAuth();
  const owned = useMemo(() => new Set(user?.permissions || []), [user]);

  // First report card the user can actually open. If they hold none,
  // activeKey stays null and we render the "no permission" state.
  const firstReport = REPORTS.find((r) => owned.has(r.requires));
  const [activeKey, setActiveKey] = useState(firstReport?.key || null);

  // Filters are shared across the active report AND all analytics charts.
  // The analytics charts only consume divisionId + dateFrom/dateTo; status
  // is per-report and is ignored by charts.
  const [filters, setFilters] = useState({
    dateFrom: '', dateTo: '', divisionId: '', status: '',
  });
  const [page, setPage] = useState(1);

  // Reset paging when filters or active report change.
  useEffect(() => { setPage(1); }, [filters, activeKey]);

  // ── Build params for the active report ──────────────────────────────
  const cfg = activeKey ? reportByKey(activeKey) : null;
  const params = useMemo(() => ({
    dateFrom:   filters.dateFrom   || undefined,
    dateTo:     filters.dateTo     || undefined,
    divisionId: filters.divisionId || undefined,
    status:     filters.status     || undefined,
    page,
    page_size:  PAGE_SIZE,
  }), [filters, page]);

  // ── Fire the report query ──────────────────────────────────────────
  const reportQ = useReport(activeKey, params, {
    enabled: Boolean(activeKey),
    keepPreviousData: true,
  });

  // ── Analytics params — strip the per-report status filter ───────────
  const chartParams = useMemo(() => ({
    dateFrom:   filters.dateFrom   || undefined,
    dateTo:     filters.dateTo     || undefined,
    divisionId: filters.divisionId || undefined,
    months:     filters.dateFrom && filters.dateTo ? undefined : 6,
  }), [filters]);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Reports</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Generate and export various system reports.
          </p>
        </div>

        {/* Report-launch card grid */}
        <ReportCards activeKey={activeKey} onPick={setActiveKey} />

        {/* Filter panel — affects the active report AND charts */}
        <ReportFilters
          value={filters}
          onChange={setFilters}
          statusEnum={cfg?.statusEnum}
          disabled={reportQ.isFetching}
        />

        {/* Active report — summary + detailed table */}
        {cfg ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-ink">{cfg.title}</h2>
            <SummaryTiles summary={reportQ.data?.summary} />
            <ReportTable
              columns={cfg.columns}
              rows={reportQ.data?.rows}
              total={reportQ.data?.total ?? 0}
              page={page}
              pageSize={PAGE_SIZE}
              onPage={setPage}
              loading={reportQ.isLoading || reportQ.isFetching}
              error={reportQ.error}
            />
          </div>
        ) : (
          <p className="text-sm text-ink-soft">
            Select a report card above to view data.
          </p>
        )}

        {/* Analytics chart grid (G1..G8) */}
        {owned.has('reports:view-analytics') ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-ink">Analytics</h2>
            <AnalyticsGrid params={chartParams} />
          </div>
        ) : null}

        {/* Export panel — bottom of the page */}
        {cfg ? (
          <ExportPanel
            reportKey={cfg.key}
            reportTitle={cfg.title}
            columns={cfg.columns}
            rows={reportQ.data?.rows || []}
            params={params}
          />
        ) : null}
      </div>
    </Layout>
  );
}
