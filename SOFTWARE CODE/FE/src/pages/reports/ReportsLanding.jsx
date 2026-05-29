// ============================================================================
// src/pages/reports/ReportsLanding.jsx  —  /reports page orchestrator
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics — Redesigned with premium layout,
// KPI summary tiles, modern data table, project-standard Inter font.
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

const PAGE_SIZE = 10;

export function ReportsLanding() {
  const { user } = useAuth();
  const owned = useMemo(() => new Set(user?.permissions || []), [user]);

  const firstReport = REPORTS.find((r) => owned.has(r.requires));
  const [activeKey, setActiveKey] = useState(firstReport?.key || null);

  const [filters, setFilters] = useState({
    dateFrom: '', dateTo: '', divisionId: '', status: '',
  });
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [filters, activeKey]);

  const cfg = activeKey ? reportByKey(activeKey) : null;
  const params = useMemo(() => ({
    dateFrom:   filters.dateFrom   || undefined,
    dateTo:     filters.dateTo     || undefined,
    divisionId: filters.divisionId || undefined,
    status:     filters.status     || undefined,
    page,
    page_size:  PAGE_SIZE,
  }), [filters, page]);

  const reportQ = useReport(activeKey, params, {
    enabled: Boolean(activeKey),
    keepPreviousData: true,
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* ── Page header ── */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 font-sans tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-slate-500 font-sans">
            Generate, filter, and export system reports across all modules.
          </p>
        </div>

        {/* Report-launch card grid */}
        <ReportCards activeKey={activeKey} onPick={setActiveKey} />

        {/* Filter panel */}
        <ReportFilters
          value={filters}
          onChange={setFilters}
          statusEnum={cfg?.statusEnum}
          disabled={reportQ.isFetching}
        />

        {/* Active report — summary + detailed table */}
        {cfg ? (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-slate-700 font-sans tracking-tight">{cfg.title}</h2>
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
          <div className="bg-white rounded-xl border border-slate-200/60 p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-slate-400 font-sans">Select a report above to view data.</p>
          </div>
        )}

        {/* Export panel — keep PDF code as-is */}
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
