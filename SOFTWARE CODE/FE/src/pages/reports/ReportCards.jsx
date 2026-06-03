import clsx from 'clsx';
import { CheckCircle2 } from 'lucide-react';

import { useAuth } from '../../lib/auth-context.jsx';
import { REPORTS } from './reportConfig.js';

const ACCENT_MAP = {
  blue: 'bg-blue-50 text-blue-600 ring-blue-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
};

export function ReportCards({ activeKey, onPick }) {
  const { user } = useAuth();
  const owned = new Set(user?.permissions || []);
  const visible = REPORTS.filter((report) => owned.has(report.requires));

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        You do not have permission to view reports. Contact your administrator.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {visible.map((report) => {
        const Icon = report.icon;
        const isActive = activeKey === report.key;
        const accent = ACCENT_MAP[report.accent] || 'bg-slate-50 text-slate-600 ring-slate-100';

        return (
          <button
            type="button"
            key={report.key}
            aria-pressed={isActive}
            onClick={() => onPick?.(report.key)}
            className={clsx(
              'group relative flex min-h-[112px] items-start gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition',
              'hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_12px_28px_rgba(79,70,229,0.09)]',
              'focus:outline-none focus:ring-4 focus:ring-indigo-100',
              isActive ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200',
            )}
          >
            <span className={clsx('inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1', accent)}>
              <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900">{report.title}</span>
              <span className="mt-1 block text-sm leading-5 text-slate-500">{report.subtitle}</span>
            </span>
            {isActive ? (
              <span className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
                <CheckCircle2 size={15} strokeWidth={2} aria-hidden="true" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
