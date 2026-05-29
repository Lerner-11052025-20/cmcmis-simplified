// ============================================================================
// src/pages/reports/charts/ChartCard.jsx  —  Reusable chart card shell
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
//   ┌────────────────────────────────────┐
//   │ Title                       [⬇ CSV]│
//   ├────────────────────────────────────┤
//   │ ResponsiveContainer with the chart │
//   │ (or skeleton during loading)       │
//   └────────────────────────────────────┘
//
// Props:
//   • title             — top-left card title
//   • loading / error   — drives skeleton + error fallback
//   • onDownloadCsv     — fires CSV export (gated by reports:export)
//   • children          — the actual recharts element (LineChart, BarChart, …)
// ============================================================================

import { Download } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context.jsx';

export function ChartCard({ title, loading, error, onDownloadCsv, height = 240, children }) {
  const { user } = useAuth();
  const canExport = (user?.permissions || []).includes('reports:export');

  return (
    <div className="rounded-lg border border-border bg-base-elev p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {canExport && onDownloadCsv ? (
          <button
            type="button"
            onClick={onDownloadCsv}
            title="Download CSV"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-soft hover:bg-base hover:text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <Download size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="mt-3" style={{ height }}>
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-md bg-base" aria-hidden="true" />
        ) : error ? (
          <div className="flex h-full items-center justify-center text-xs text-red-700">
            {error.response?.data?.error?.message || error.message || 'Chart failed to load'}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
