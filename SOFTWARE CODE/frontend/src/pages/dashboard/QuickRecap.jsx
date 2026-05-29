// ============================================================================
// src/pages/dashboard/QuickRecap.jsx  —  Recent Activity feed panel
// ----------------------------------------------------------------------------
// Renders three side-by-side activity columns below the KPI grid:
//   ① Recent Job Requests  ② Recent Job Card Updates  ③ Recent Equipment
//
// Each column shows up to 7 log entries. Data comes from
// `data.recent_activity` inside the /dashboard/kpis payload.
//
// Design decisions:
//   • No hard border on the outer panel — soft shadow only (matches KpiCard).
//   • Each log row is a <Link> — fully keyboard-accessible, deep-links into
//     the relevant detail page.
//   • Status badge colours match the JR/JC/Equipment status vocabulary used
//     throughout the app.
//   • Relative timestamp (e.g. "3h ago") keeps the feed scannable.
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

// ── Relative timestamp helper ─────────────────────────────────────────
// Returns a human-friendly relative string: "5m ago", "2h ago", "3d ago".
// Falls back to "—" when the date is null/invalid.
function relTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  if (isNaN(diff)) return '—';
  const min = Math.floor(diff / 60_000);
  if (min < 1)   return 'just now';
  if (min < 60)  return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)   return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

// ── Status badge colour map ───────────────────────────────────────────
// Maps status codes → Tailwind background + text tokens.
// `default` is the fallback for any unknown status.
const STATUS_STYLE = {
  DRAFT:                'bg-slate-100   text-slate-600',
  SUBMITTED:            'bg-amber-100   text-amber-700',
  ASSIGNED:             'bg-violet-100  text-violet-700',
  IN_PROGRESS:          'bg-blue-100    text-blue-700',
  COMPLETED:            'bg-green-100   text-green-700',
  VERIFIED_CLOSED:      'bg-emerald-100 text-emerald-700',
  CANCELLED:            'bg-red-100     text-red-600',
  ACTIVE:               'bg-green-100   text-green-700',
  PENDING_VERIFICATION: 'bg-orange-100  text-orange-700',
  REOPENED:             'bg-purple-100  text-purple-700',
  default:              'bg-gray-100    text-gray-600',
};

function StatusBadge({ status }) {
  const cls = STATUS_STYLE[status] || STATUS_STYLE.default;
  // Convert SNAKE_CASE → Title Case for display
  const label = (status || '').replace(/_/g, ' ').toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
  return (
    <span className={clsx('inline-block rounded-full px-2 py-0.5 text-[10px] font-medium leading-none', cls)}>
      {label}
    </span>
  );
}

// ── Skeleton row for loading state ────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 py-2.5 animate-pulse">
      <div className="mt-0.5 w-2 h-2 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-3/4 bg-gray-200 rounded" />
        <div className="h-2.5 w-1/2 bg-gray-100 rounded" />
      </div>
      <div className="h-4 w-12 bg-gray-100 rounded-full" />
    </div>
  );
}

// ── Column for Job Requests ───────────────────────────────────────────
function JobRequestsColumn({ rows, loading }) {
  return (
    <ActivityColumn
      title="Recent Job Requests"
      icon={FileText}
      iconClass="text-indigo-500"
      dotClass="bg-indigo-400"
      viewAllHref="/job-requests"
      loading={loading}
      empty={!rows || rows.length === 0}
    >
      {(rows || []).map((jr, i) => (
        <Link
          key={`${jr.jr_no}-${i}`}
          to={`/job-requests/${encodeURIComponent(jr.jr_no)}`}
          className="group flex items-start gap-3 py-2.5 hover:bg-indigo-50/60 -mx-3 px-3 rounded-lg transition-colors"
        >
          {/* timeline dot */}
          <span className="mt-1.5 w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
          <div className="flex-1 min-w-0">
            {/* equipment name or fallback to JR no */}
            <p className="text-[13px] font-medium text-ink leading-snug truncate group-hover:text-indigo-700">
              {jr.equipment_name || `JR #${jr.jr_no}`}
            </p>
            <p className="text-[11px] text-ink-soft mt-0.5 flex items-center gap-1">
              <Clock size={10} className="shrink-0" />
              {relTime(jr.time_at)}
              {jr.actor_name ? (
                <span className="truncate"> · {jr.actor_name}</span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={jr.status} />
          </div>
        </Link>
      ))}
    </ActivityColumn>
  );
}

// ── Column for Job Cards ──────────────────────────────────────────────
function JobCardsColumn({ rows, loading }) {
  return (
    <ActivityColumn
      title="Recent Job Card Updates"
      icon={ClipboardList}
      iconClass="text-blue-500"
      dotClass="bg-blue-400"
      viewAllHref="/job-cards"
      loading={loading}
      empty={!rows || rows.length === 0}
    >
      {(rows || []).map((jc, i) => (
        <Link
          key={`${jc.jc_id}-${i}`}
          to={`/job-cards/${encodeURIComponent(jc.jc_id || jc.jc_no)}`}
          className="group flex items-start gap-3 py-2.5 hover:bg-blue-50/60 -mx-3 px-3 rounded-lg transition-colors"
        >
          <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-ink leading-snug truncate group-hover:text-blue-700">
              {jc.equipment_name || `JC #${jc.jc_no}`}
            </p>
            <p className="text-[11px] text-ink-soft mt-0.5 flex items-center gap-1">
              <Clock size={10} className="shrink-0" />
              {relTime(jc.time_at)}
              {jc.engineer_name ? (
                <span className="truncate"> · {jc.engineer_name}</span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={jc.status} />
          </div>
        </Link>
      ))}
    </ActivityColumn>
  );
}

// ── Column for Equipment ──────────────────────────────────────────────
function EquipmentColumn({ rows, loading }) {
  return (
    <ActivityColumn
      title="Recent Equipment"
      icon={Box}
      iconClass="text-emerald-500"
      dotClass="bg-emerald-400"
      viewAllHref="/equipment"
      loading={loading}
      empty={!rows || rows.length === 0}
    >
      {(rows || []).map((eq, i) => (
        <Link
          key={`${eq.eqm_type}-${eq.eqm_id}-${i}`}
          to={`/equipment/${encodeURIComponent(eq.eqm_id)}`}
          className="group flex items-start gap-3 py-2.5 hover:bg-emerald-50/60 -mx-3 px-3 rounded-lg transition-colors"
        >
          <span className="mt-1.5 w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-ink leading-snug truncate group-hover:text-emerald-700">
              {eq.name}
            </p>
            <p className="text-[11px] text-ink-soft mt-0.5 flex items-center gap-1">
              <Clock size={10} className="shrink-0" />
              {relTime(eq.time_at)}
              {eq.type_name ? (
                <span className="truncate"> · {eq.type_name}</span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={eq.status} />
          </div>
        </Link>
      ))}
    </ActivityColumn>
  );
}

// ── Generic column wrapper ────────────────────────────────────────────
// Provides the card shell, header, and skeleton / empty states.
function ActivityColumn({ title, icon: Icon, iconClass, dotClass, viewAllHref, loading, empty, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-5 flex flex-col min-h-[320px]">
      {/* column header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconClass} />
          <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        </div>
        <Link
          to={viewAllHref}
          className="flex items-center gap-0.5 text-[11px] text-accent hover:underline font-medium"
        >
          View All <ChevronRight size={12} />
        </Link>
      </div>

      {/* divider */}
      <div className="border-t border-gray-100 mb-1" />

      {/* rows */}
      <div className="flex-1">
        {loading ? (
          // Skeleton: 5 placeholder rows
          <div className="divide-y divide-gray-50">
            {[0, 1, 2, 3, 4].map((k) => <SkeletonRow key={k} />)}
          </div>
        ) : empty ? (
          <div className="flex flex-col items-center justify-center h-full py-10 text-ink-soft">
            <Icon size={28} className="opacity-20 mb-2" />
            <p className="text-xs">No recent activity</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────
/**
 * @param {Object} props
 * @param {{ job_requests: Array, job_cards: Array, equipment: Array } | null} props.data
 * @param {boolean} [props.loading]
 */
export function QuickRecap({ data, loading = false }) {
  // Show skeletons on first paint (data === null) or explicit loading flag.
  const isLoading = loading || data === null;

  return (
    <section aria-label="Quick Recap — Recent Activity">
      {/* section heading */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-ink">
          Quick Recap
          <span className="ml-2 text-sm font-normal text-ink-soft">Recent Activity</span>
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
