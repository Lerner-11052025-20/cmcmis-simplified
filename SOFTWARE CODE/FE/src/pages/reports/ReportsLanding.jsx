import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Database, FileText, RefreshCw } from 'lucide-react';

import { Layout } from '../../components/Layout.jsx';
import { useAuth } from '../../lib/auth-context.jsx';
import { useReport } from '../../lib/hooks/useReport.js';

import { REPORTS, reportByKey } from './reportConfig.js';
import { ReportCards } from './ReportCards.jsx';
import { ReportFilters } from './ReportFilters.jsx';
import { SummaryTiles } from './SummaryTiles.jsx';
import { ReportTable } from './ReportTable.jsx';
import { ExportPanel } from './ExportPanel.jsx';

const PAGE_SIZE = 25;

export function ReportsLanding() {
  const { user } = useAuth();
  const owned = useMemo(() => new Set(user?.permissions || []), [user]);

  const firstReport = REPORTS.find((r) => owned.has(r.requires));
  const [activeKey, setActiveKey] = useState(firstReport?.key || null);

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    divisionId: '',
    status: '',
    dueSoonDays: '',
    unassigned: false,
  });
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!firstReport) {
      if (activeKey !== null) setActiveKey(null);
      return;
    }

    const activeReport = REPORTS.find((report) => report.key === activeKey);
    if (!activeReport || !owned.has(activeReport.requires)) {
      setActiveKey(firstReport.key);
    }
  }, [activeKey, firstReport, owned]);

  useEffect(() => { setPage(1); }, [filters, activeKey]);

  const cfg = activeKey ? reportByKey(activeKey) : null;
  const params = useMemo(() => {
    const next = {
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      divisionId: filters.divisionId || undefined,
      status: cfg?.statusEnum?.includes(filters.status) ? filters.status : undefined,
      page,
      page_size: PAGE_SIZE,
    };

    if (activeKey === 'calibrationDue' && filters.dueSoonDays) {
      next.dueSoonDays = filters.dueSoonDays;
    }
    if (activeKey === 'pendingJobs' && filters.unassigned) {
      next.unassigned = 1;
    }
    return next;
  }, [activeKey, cfg, filters, page]);

  const reportQ = useReport(activeKey, params, {
    enabled: Boolean(activeKey),
    keepPreviousData: true,
  });

  return (
    <Layout>
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <BarChart3 size={24} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reports</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Review operational data across calibration, job requests, job cards, equipment, and engineers.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm lg:min-w-[390px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <FileText size={14} aria-hidden="true" />
                  Active
                </div>
                <div className="mt-1 truncate font-semibold text-slate-800">{cfg?.title || 'No report'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <Database size={14} aria-hidden="true" />
                  Rows
                </div>
                <div className="mt-1 font-semibold tabular-nums text-slate-800">
                  {(reportQ.data?.total ?? 0).toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => reportQ.refetch()}
                disabled={!activeKey || reportQ.isFetching}
                className="inline-flex flex-col rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <RefreshCw size={14} aria-hidden="true" />
                  Refresh
                </span>
                <span className="mt-1 font-semibold text-slate-800">Reload</span>
              </button>
            </div>
          </div>
        </div>

        <ReportCards activeKey={activeKey} onPick={setActiveKey} />

        <ReportFilters
          value={filters}
          onChange={setFilters}
          reportKey={activeKey}
          statusEnum={cfg?.statusEnum}
          disabled={reportQ.isFetching}
        />

        {cfg ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">{cfg.title}</h2>
                <p className="text-sm text-slate-500">{cfg.subtitle}</p>
              </div>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Page {page}
              </span>
            </div>
            <SummaryTiles summary={reportQ.data?.summary} keys={cfg.summaryKeys} reportKey={cfg.key} />
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
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <FileText className="mx-auto text-slate-300" size={32} strokeWidth={1.6} aria-hidden="true" />
            <p className="mt-3 text-sm text-slate-500">Select a report above to view data.</p>
          </div>
        )}

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
