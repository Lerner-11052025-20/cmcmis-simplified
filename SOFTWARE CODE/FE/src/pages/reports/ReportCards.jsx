// ============================================================================
// src/pages/reports/ReportCards.jsx  —  6-card "pick a report" grid
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// Renders the row of report-launch cards shown at the top of the Reports
// landing page (matches the attached UI). Cards the user lacks permission
// for are hidden — the BE enforces the same gate independently.
// ============================================================================

import { useAuth } from '../../lib/auth-context.jsx';
import { REPORTS } from './reportConfig.js';
import clsx from 'clsx';

const ACCENT_BG = {
  blue:    'bg-blue-50    text-blue-700',
  amber:   'bg-amber-50   text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  indigo:  'bg-indigo-50  text-indigo-700',
  sky:     'bg-sky-50     text-sky-700',
  rose:    'bg-rose-50    text-rose-700',
};

export function ReportCards({ activeKey, onPick }) {
  const { user } = useAuth();
  const owned = new Set(user?.permissions || []);

  const visible = REPORTS.filter((r) => owned.has(r.requires));
  if (visible.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        You do not have permission to view any reports. Contact your administrator.
      </p>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((r) => {
        const Icon = r.icon;
        const isActive = activeKey === r.key;
        return (
          <button
            type="button"
            key={r.key}
            onClick={() => onPick?.(r.key)}
            className={clsx(
              'group flex items-start gap-3 rounded-lg border bg-base-elev p-4 text-left transition-all',
              'hover:border-accent/40 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-accent',
              isActive ? 'border-accent shadow-sm' : 'border-border',
            )}
          >
            <span className={clsx(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
              ACCENT_BG[r.accent] || 'bg-slate-50 text-slate-700',
            )}>
              <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-ink">{r.title}</span>
              <span className="block text-xs text-ink-soft mt-0.5">{r.subtitle}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
