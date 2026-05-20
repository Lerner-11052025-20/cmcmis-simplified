// ============================================================================
// src/pages/analytics/ChartCard.jsx  —  Spacious shell for one chart
// ----------------------------------------------------------------------------
// PHASE 11 SLICE 3 — every chart on the redesigned /analytics page is wrapped
// in this shell. It's deliberately roomier than the Phase-10 ChartCard:
//
//   ┌──────────────────────────────────────────────────────┐
//   │ Title                                       Stat · ⬇  │
//   │ Subtitle (optional)                                  │
//   ├──────────────────────────────────────────────────────┤
//   │                                                      │
//   │           ResponsiveContainer (chart)                │
//   │                                                      │
//   ├──────────────────────────────────────────────────────┤
//   │ Updated 6s ago                            [refresh]   │
//   └──────────────────────────────────────────────────────┘
//
// FEATURES
//   • Skeleton pulse while loading.
//   • Error state with the BE message.
//   • Optional header "stat" badge (e.g. "Total 240" / "↑12% MoM") for
//     glanceable summary numbers.
//   • Footer "Updated Xs ago" + per-card refresh button so users can
//     force-reload one card without re-fetching the rest.
//   • CSV download icon — disabled for users without reports:export.
// ============================================================================

import { Download, RefreshCw } from 'lucide-react';
import { useAuth } from '../../lib/auth-context.jsx';

/** Human-friendly "Updated 5s ago" string. */
function formatAgo(ts) {
  if (!ts) return '—';
  const ms = Date.now() - ts;
  if (ms < 5_000)    return 'just now';
  if (ms < 60_000)   return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
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
  children,
}) {
  const { user } = useAuth();
  const canExport = (user?.permissions || []).includes('reports:export');

  // Tailwind grid spans — we map prop → class to keep callers simple.
  const spanClass = span >= 2 ? 'lg:col-span-2' : 'lg:col-span-1';
  const accentBadge = stat?.accent === 'green' ? 'bg-emerald-50 text-emerald-700'
                  : stat?.accent === 'amber'  ? 'bg-amber-50 text-amber-700'
                  : stat?.accent === 'red'    ? 'bg-red-50 text-red-700'
                  : 'bg-blue-50 text-blue-700';

  return (
    <div className={`${spanClass} rounded-xl border border-border bg-base-elev shadow-sm hover:shadow-md transition-shadow`}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink truncate">{title}</h3>
          {subtitle ? (
            <p className="text-[11px] text-ink-soft mt-0.5 truncate">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {stat ? (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${accentBadge}`}>
              {stat.value}
            </span>
          ) : null}
          {canExport && onDownloadCsv ? (
            <button
              type="button"
              onClick={onDownloadCsv}
              title="Download CSV"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-soft hover:bg-base hover:text-ink focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
            >
              <Download size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Chart body ─────────────────────────────────────────── */}
      <div className="px-3 pb-2" style={{ height }}>
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-md bg-gradient-to-br from-base to-base-elev" aria-hidden="true" />
        ) : error ? (
          <div className="flex h-full items-center justify-center text-xs text-red-700 px-4 text-center">
            {error.response?.data?.error?.message || error.message || 'Chart failed to load'}
          </div>
        ) : (
          children
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="px-5 pb-3 pt-1 flex items-center justify-between text-[11px] text-ink-soft border-t border-border/50">
        <span className="tabular-nums">
          {isFetching ? (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              refreshing…
            </span>
          ) : (
            <>Updated {formatAgo(dataUpdatedAt)}</>
          )}
        </span>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            title="Refresh this chart"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-ink-soft hover:bg-base hover:text-ink focus:outline-none focus:ring-2 focus:ring-accent transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} strokeWidth={1.75}
              className={isFetching ? 'animate-spin' : ''}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>
    </div>
  );
}
