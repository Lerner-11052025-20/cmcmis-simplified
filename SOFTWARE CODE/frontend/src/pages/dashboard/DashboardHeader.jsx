// ============================================================================
// src/pages/dashboard/DashboardHeader.jsx  —  Title + greeting + refresh pill
// ----------------------------------------------------------------------------
// Title block + a "Last updated Xs ago" pill + a manual Refresh button.
// The pill ticks every second so the user has live feedback on freshness.
// ============================================================================

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import clsx from 'clsx';

/**
 * @param {Object} props
 * @param {'my' | 'org'} props.variant
 * @param {Date | null}  props.lastFetchedAt
 * @param {boolean}      props.loading
 * @param {() => void}   props.onRefresh
 */
export function DashboardHeader({ variant, lastFetchedAt, loading, onRefresh }) {
  // Re-render every second so the "Xs ago" stays accurate even when the
  // hook isn't fetching.
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const title    = variant === 'my' ? 'My Dashboard' : 'Dashboard';
  const subtitle = variant === 'my'
    ? 'Track your equipment and service requests'
    : 'Overview of calibration and maintenance activities';

  const ageS = lastFetchedAt
    ? Math.max(0, Math.floor((Date.now() - lastFetchedAt.getTime()) / 1000))
    : null;
  const ageLabel = ageS === null
    ? '—'
    : ageS < 5  ? 'Just now'
    : ageS < 60 ? `${ageS}s ago`
    :              `${Math.floor(ageS / 60)}m ago`;

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
      </div>

      {/* Right cluster: freshness pill + manual refresh */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-ink-soft hidden sm:inline">
          Last updated <span className="font-medium text-ink">{ageLabel}</span>
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-md border border-border',
            'bg-white px-2.5 py-1.5 text-xs font-medium text-ink',
            'hover:bg-base-elev disabled:opacity-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
          )}
          aria-label="Refresh dashboard now"
          title="Refresh now"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </div>
  );
}
