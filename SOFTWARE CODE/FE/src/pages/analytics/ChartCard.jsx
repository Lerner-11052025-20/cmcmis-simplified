// ============================================================================
// src/pages/analytics/ChartCard.jsx  —  Premium spacious shell for charts
// ----------------------------------------------------------------------------
// Redesigned with:
//   • Glassmorphic subtle border & gradients.
//   • Interactive Chart vs. Table data toggle.
//   • Custom formatted data table view.
//   • snappier micro-animations & layout feedback.
// ============================================================================

import { useState } from 'react';
import { Download, RefreshCw, BarChart2, Table } from 'lucide-react';
import { useAuth } from '../../lib/auth-context.jsx';
import { formatIstDate } from '../../lib/time.js';

function formatUpdatedDate(ts) {
  return formatIstDate(ts, '—');
}

export function ChartCard({
  title,
  subtitle,
  stat,             // optional { value: string|number, accent: 'green'|'amber'|'red'|'blue' }
  height = 320,
  loading,
  error,
  isFetching,
  dataUpdatedAt,
  onRefresh,
  onDownloadCsv,
  span = 1,         // 1 = half width, 2 = full width (on lg+)
  data = [],        // raw data array for table view
  columns = [],     // [{ header: string, key: string, format?: Function }]
  children,
}) {
  const { user } = useAuth();
  const [view, setView] = useState('chart'); // 'chart' | 'table'
  const canExport = (user?.permissions || []).includes('reports:export');

  const spanClass = span >= 2 ? 'lg:col-span-2' : 'lg:col-span-1';
  const accentBadge =
    stat?.accent === 'green' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
    : stat?.accent === 'amber'  ? 'bg-amber-50 text-amber-700 border border-amber-100'
    : stat?.accent === 'red'    ? 'bg-rose-50 text-rose-700 border border-rose-100'
    : 'bg-indigo-50 text-indigo-700 border border-indigo-100';

  const hasTableData = data && data.length > 0 && columns && columns.length > 0;

  return (
    <div className={`${spanClass} rounded-2xl border border-slate-200/50 bg-gradient-to-b from-white to-slate-50/30 p-1 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03),0_2px_4px_rgba(15,23,42,0.01)] hover:shadow-[0_12px_30px_-4px_rgba(15,23,42,0.07)] hover:-translate-y-0.5 transition-all duration-300`}>
      <div className="bg-white rounded-xl p-4 h-full flex flex-col justify-between">
        
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="pb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight font-sans">{title}</h3>
            {subtitle ? (
              <p className="text-[11px] font-medium text-slate-400 mt-0.5 truncate font-sans">{subtitle}</p>
            ) : null}
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {stat ? (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider font-sans tabular-nums ${accentBadge}`}>
                {stat.value}
              </span>
            ) : null}
            
            {/* Chart/Table Toggle */}
            {hasTableData && (
              <div className="inline-flex rounded-lg border border-slate-100 bg-slate-50 p-0.5 ml-1">
                <button
                  type="button"
                  onClick={() => setView('chart')}
                  title="Show Chart"
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-all ${
                    view === 'chart'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <BarChart2 size={13} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setView('table')}
                  title="Show Data Table"
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-all ${
                    view === 'table'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Table size={13} strokeWidth={2} />
                </button>
              </div>
            )}

            {canExport && onDownloadCsv ? (
              <button
                type="button"
                onClick={onDownloadCsv}
                title="Download CSV"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              >
                <Download size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        {/* ── Chart body / Table View ─────────────────────────────── */}
        <div className="relative" style={{ height }}>
          {loading ? (
            <div className="h-full w-full animate-pulse rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50" aria-hidden="true" />
          ) : error ? (
            <div className="flex h-full items-center justify-center text-xs font-semibold text-rose-600 px-4 text-center">
              {error.response?.data?.error?.message || error.message || 'Chart failed to load'}
            </div>
          ) : view === 'table' && hasTableData ? (
            <div className="h-full w-full overflow-y-auto overflow-x-auto rounded-xl border border-slate-100 bg-slate-50/20 shadow-inner font-sans scrollbar-thin">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs text-slate-500 font-sans">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    {columns.map((col, idx) => (
                      <th key={idx} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{col.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50/30 transition-colors">
                      {columns.map((col, colIdx) => (
                        <td key={colIdx} className="px-3 py-2 font-medium text-slate-600 tabular-nums truncate max-w-[200px]">
                          {col.format ? col.format(row[col.key], row) : row[col.key] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-full w-full transition-opacity duration-300">
              {children}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="pt-3 mt-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-100 font-sans">
          <span className="tabular-nums">
            {isFetching ? (
              <span className="inline-flex items-center gap-1.5 text-indigo-500">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
                refreshing…
              </span>
            ) : (
              <>Updated {formatUpdatedDate(dataUpdatedAt)}</>
            )}
          </span>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isFetching}
              title="Refresh this chart"
              className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-40"
            >
              <RefreshCw size={11} strokeWidth={2}
                className={isFetching ? 'animate-spin' : ''}
                aria-hidden="true"
              />
            </button>
          ) : null}
        </div>

      </div>
    </div>
  );
}
