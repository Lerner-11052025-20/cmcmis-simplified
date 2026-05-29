// ============================================================================
// src/pages/reports/ReportCards.jsx  —  Premium report-launch card grid
// ============================================================================

import { useAuth } from '../../lib/auth-context.jsx';
import { REPORTS } from './reportConfig.js';
import clsx from 'clsx';

const ACCENT_MAP = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-200',    activeBg: 'bg-blue-50/80' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   activeBg: 'bg-amber-50/80' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', activeBg: 'bg-emerald-50/80' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  activeBg: 'bg-indigo-50/80' },
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-600',     border: 'border-sky-200',     activeBg: 'bg-sky-50/80' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    activeBg: 'bg-rose-50/80' },
};

const FALLBACK = { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', activeBg: 'bg-slate-50' };

export function ReportCards({ activeKey, onPick }) {
  const { user } = useAuth();
  const owned = new Set(user?.permissions || []);

  const visible = REPORTS.filter((r) => owned.has(r.requires));
  if (visible.length === 0) {
    return (
      <p className="text-sm text-slate-400 font-sans">
        You do not have permission to view any reports. Contact your administrator.
      </p>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((r) => {
        const Icon = r.icon;
        const isActive = activeKey === r.key;
        const a = ACCENT_MAP[r.accent] || FALLBACK;
        return (
          <button
            type="button"
            key={r.key}
            onClick={() => onPick?.(r.key)}
            className={clsx(
              'group flex items-start gap-3.5 rounded-xl border bg-white p-5 text-left transition-all duration-200',
              'hover:shadow-md hover:border-slate-300/80',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1',
              isActive
                ? ['border-accent/50 shadow-md', a.activeBg]
                : 'border-slate-200/60 shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
            )}
          >
            <span className={clsx(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200',
              a.bg, a.text, a.border,
              isActive && 'shadow-sm',
            )}>
              <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold text-slate-700 font-sans">{r.title}</span>
              <span className="block text-[11px] text-slate-400 font-sans mt-0.5 leading-relaxed">{r.subtitle}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
