// ============================================================================
// src/pages/dashboard/QuickRecap.jsx  —  Recent Activity feed panel
// ----------------------------------------------------------------------------
// Renders three side-by-side activity columns below the KPI grid:
//   ① Recent Job Requests  ② Recent Job Card Updates  ③ Recent Equipment
//
// Each column shows up to 7 log entries. Data comes from
// `data.recent_activity` inside the /dashboard/kpis payload.
// ============================================================================

import { Link } from 'react-router-dom';
import {
  FileText,
  ClipboardList,
  Box,
  Clock,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { formatIstDate } from '../../lib/time.js';

// ── Relative timestamp helper ─────────────────────────────────────────
function relTime(isoStr) {
  return formatIstDate(isoStr, '—');
}

// ── Stripe-style border status tags ──────────────────────────────────
const STATUS_STYLE = {
  DRAFT:                'bg-slate-50   text-slate-600   border-slate-200',
  SUBMITTED:            'bg-amber-50   text-amber-700   border-amber-200/60',
  ASSIGNED:             'bg-violet-50  text-violet-700  border-violet-200/60',
  IN_PROGRESS:          'bg-blue-50    text-blue-700    border-blue-200/60',
  COMPLETED:            'bg-green-50   text-green-700   border-green-200/60',
  VERIFIED_CLOSED:      'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  CANCELLED:            'bg-red-50     text-red-600     border-red-200/60',
  ACTIVE:               'bg-green-50   text-green-700   border-green-200/60',
  PENDING_VERIFICATION: 'bg-orange-50  text-orange-700  border-orange-200/60',
  REOPENED:             'bg-purple-50  text-purple-700  border-purple-200/60',
  default:              'bg-gray-50    text-gray-600    border-gray-200',
};

function StatusBadge({ status }) {
  const cls = STATUS_STYLE[status] || STATUS_STYLE.default;
  const label = (status || '').replace(/_/g, ' ').toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
  return (
    <span className={clsx('inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider leading-none border font-sans', cls)}>
      {label}
    </span>
  );
}

// ── Skeleton row for loading state ────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 py-3 animate-pulse">
      <div className="mt-1 w-2.5 h-2.5 rounded-full bg-slate-100 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-3/4 bg-slate-100 rounded" />
        <div className="h-2.5 w-1/2 bg-slate-100 rounded" />
      </div>
      <div className="h-4 w-12 bg-slate-100 rounded-full" />
    </div>
  );
}

// ── Column for Job Requests ───────────────────────────────────────────
function JobRequestsColumn({ rows, loading }) {
  return (
    <ActivityColumn
      title="Recent Job Requests"
      icon={FileText}
      iconClass="text-indigo-600"
      iconBg="bg-indigo-50 border-indigo-100/50"
      topBorder="border-t-indigo-500/80"
      hoverGlow="hover:shadow-indigo-500/5 hover:border-indigo-200/50"
      viewAllHref="/job-requests"
      loading={loading}
      empty={!rows || rows.length === 0}
    >
      {(rows || []).map((jr, i) => {
        const isEven = i % 2 === 0;
        const rowBg = isEven ? 'bg-slate-50/80 hover:bg-slate-100/60' : 'bg-white hover:bg-slate-50/50';
        return (
          <Link
            key={`${jr.jr_no}-${i}`}
            to={`/job-requests/${encodeURIComponent(jr.jr_no)}`}
            className={clsx(
              'group flex items-start gap-3.5 py-3 px-3 rounded-lg transition-all duration-200 font-sans border border-transparent hover:border-slate-200/40 shadow-none hover:shadow-sm',
              rowBg
            )}
          >
            {/* active telemetry timeline dot */}
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 ring-4 ring-indigo-100" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-ink leading-snug truncate group-hover:text-indigo-600 transition-colors font-sans">
                {jr.equipment_name || `JR #${jr.jr_no}`}
              </p>
              <p className="text-[10px] font-semibold text-ink-soft/50 mt-1 flex items-center gap-1 font-sans">
                <Clock size={10} className="shrink-0 opacity-70" />
                {relTime(jr.time_at)}
                {jr.actor_name ? (
                  <span className="truncate text-indigo-600/80 font-bold"> · {jr.actor_name}</span>
                ) : null}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <StatusBadge status={jr.status} />
            </div>
          </Link>
        );
      })}
    </ActivityColumn>
  );
}

// ── Column for Job Cards ──────────────────────────────────────────────
function JobCardsColumn({ rows, loading }) {
  return (
    <ActivityColumn
      title="Recent Job Card Updates"
      icon={ClipboardList}
      iconClass="text-blue-600"
      iconBg="bg-blue-50 border-blue-100/50"
      topBorder="border-t-blue-500/80"
      hoverGlow="hover:shadow-blue-500/5 hover:border-blue-200/50"
      viewAllHref="/job-cards"
      loading={loading}
      empty={!rows || rows.length === 0}
    >
      {(rows || []).map((jc, i) => {
        const isEven = i % 2 === 0;
        const rowBg = isEven ? 'bg-slate-50/80 hover:bg-slate-100/60' : 'bg-white hover:bg-slate-50/50';
        return (
          <Link
            key={`${jc.jc_id}-${i}`}
            to={`/job-cards/${encodeURIComponent(jc.jc_id || jc.jc_no)}`}
            className={clsx(
              'group flex items-start gap-3.5 py-3 px-3 rounded-lg transition-all duration-200 font-sans border border-transparent hover:border-slate-200/40 shadow-none hover:shadow-sm',
              rowBg
            )}
          >
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 ring-4 ring-blue-100" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-ink leading-snug truncate group-hover:text-blue-600 transition-colors font-sans">
                {jc.equipment_name || `JC #${jc.jc_no}`}
              </p>
              <p className="text-[10px] font-semibold text-ink-soft/50 mt-1 flex items-center gap-1 font-sans">
                <Clock size={10} className="shrink-0 opacity-70" />
                {relTime(jc.time_at)}
                {jc.engineer_name ? (
                  <span className="truncate text-blue-600/80 font-bold"> · {jc.engineer_name}</span>
                ) : null}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <StatusBadge status={jc.status} />
            </div>
          </Link>
        );
      })}
    </ActivityColumn>
  );
}

// ── Column for Equipment ──────────────────────────────────────────────
function EquipmentColumn({ rows, loading }) {
  return (
    <ActivityColumn
      title="Recent Equipment"
      icon={Box}
      iconClass="text-emerald-600"
      iconBg="bg-emerald-50 border-emerald-100/50"
      topBorder="border-t-emerald-500/80"
      hoverGlow="hover:shadow-emerald-500/5 hover:border-emerald-200/50"
      viewAllHref="/equipment"
      loading={loading}
      empty={!rows || rows.length === 0}
    >
      {(rows || []).map((eq, i) => {
        const isEven = i % 2 === 0;
        const rowBg = isEven ? 'bg-slate-50/80 hover:bg-slate-100/60' : 'bg-white hover:bg-slate-50/50';
        return (
          <Link
            key={`${eq.eqm_type}-${eq.eqm_id}-${i}`}
            to={`/equipment/${encodeURIComponent(eq.eqm_id)}`}
            className={clsx(
              'group flex items-start gap-3.5 py-3 px-3 rounded-lg transition-all duration-200 font-sans border border-transparent hover:border-slate-200/40 shadow-none hover:shadow-sm',
              rowBg
            )}
          >
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ring-4 ring-emerald-100" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-ink leading-snug truncate group-hover:text-emerald-600 transition-colors font-sans">
                {eq.name}
              </p>
              <p className="text-[10px] font-semibold text-ink-soft/50 mt-1 flex items-center gap-1 font-sans">
                <Clock size={10} className="shrink-0 opacity-70" />
                {relTime(eq.time_at)}
                {eq.type_name ? (
                  <span className="truncate text-emerald-600/80 font-bold"> · {eq.type_name}</span>
                ) : null}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <StatusBadge status={eq.status} />
            </div>
          </Link>
        );
      })}
    </ActivityColumn>
  );
}

// ── Generic column wrapper ────────────────────────────────────────────
function ActivityColumn({ title, icon: Icon, iconClass, iconBg, topBorder, hoverGlow, viewAllHref, loading, empty, children }) {
  return (
    <div className={clsx(
      'bg-white rounded-2xl border border-slate-200/50 p-5 flex flex-col min-h-[320px] border-t-[4px] shadow-[0_2px_8px_rgba(15,23,42,0.015)] hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5',
      topBorder,
      hoverGlow
    )}>
      {/* column header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={clsx('h-8 w-8 rounded-lg flex items-center justify-center border shadow-[0_1px_2px_rgba(0,0,0,0.01)]', iconBg)}>
            <Icon size={15} strokeWidth={2} className={iconClass} />
          </div>
          <h3 className="text-sm font-bold text-ink tracking-tight font-sans">{title}</h3>
        </div>
        <Link
          to={viewAllHref}
          className="group/link flex items-center gap-0.5 text-[11px] text-accent hover:text-accent-hover font-bold font-sans transition-all"
        >
          View All <ChevronRight size={12} className="transition-transform duration-200 group-hover/link:translate-x-0.5" />
        </Link>
      </div>

      {/* divider */}
      <div className="border-t border-slate-100 mb-2" />

      {/* rows */}
      <div className="flex-1">
        {loading ? (
          <div className="space-y-1">
            {[0, 1, 2, 3, 4, 5, 6].map((k) => <SkeletonRow key={k} />)}
          </div>
        ) : empty ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-ink-soft/40 font-sans">
            <Icon size={28} className="opacity-20 mb-2" />
            <p className="text-xs font-semibold">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-1">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────
export function QuickRecap({ data, loading = false }) {
  const isLoading = loading || data === null;

  return (
    <section aria-label="Quick Recap — Recent Activity" className="font-sans">
      {/* section heading */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-ink font-sans tracking-tight">
          Quick Recap
          <span className="ml-2 text-xs font-semibold text-ink-soft/60 uppercase tracking-wider"> · Recent Activity</span>
        </h2>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <JobRequestsColumn rows={data?.job_requests} loading={isLoading} />
        <JobCardsColumn   rows={data?.job_cards}    loading={isLoading} />
        <EquipmentColumn  rows={data?.equipment}    loading={isLoading} />
      </div>
    </section>
  );
}
