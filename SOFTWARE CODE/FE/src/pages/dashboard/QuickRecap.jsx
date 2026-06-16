import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  ClipboardList,
  Box,
  Clock,
  ChevronRight,
  Hash,
  UserRound,
} from 'lucide-react';
import clsx from 'clsx';
import { formatIstDate } from '../../lib/time.js';

function relTime(isoStr) {
  return formatIstDate(isoStr, '-');
}

const STATUS_STYLE = {
  DRAFT: 'bg-slate-50 text-slate-600 border-slate-200',
  SUBMITTED: 'bg-amber-50 text-amber-700 border-amber-200/60',
  ASSIGNED: 'bg-violet-50 text-violet-700 border-violet-200/60',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200/60',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200/60',
  VERIFIED_CLOSED: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200/60',
  ACTIVE: 'bg-green-50 text-green-700 border-green-200/60',
  PENDING_VERIFICATION: 'bg-orange-50 text-orange-700 border-orange-200/60',
  REOPENED: 'bg-purple-50 text-purple-700 border-purple-200/60',
  default: 'bg-gray-50 text-gray-600 border-gray-200',
};

const EMPTY_VALUE = '-';

const STATUS_LABELS = {
  SUBMITTED:       'Pending For Conversion',
  ASSIGNED:        'Job In Queue',
  IN_PROGRESS:     'Job On Hand',
  COMPLETED:       'Review Pending',
  VERIFIED_CLOSED: 'Completed',
  DRAFT:           'Draft',
  CANCELLED:       'Cancelled',
  REOPENED:        'Reopened',
  REJECTED:        'Rejected',
};

function cleanStatusLabel(status) {
  if (!status) return EMPTY_VALUE;
  return STATUS_LABELS[status] || status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function StatusBadge({ status }) {
  const cls = STATUS_STYLE[status] || STATUS_STYLE.default;

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase leading-none tracking-wider whitespace-nowrap font-sans',
        cls,
      )}
    >
      {cleanStatusLabel(status)}
    </span>
  );
}

function ActivityListPanel({
  title,
  icon: Icon,
  iconClass,
  iconBg,
  viewAllHref,
  rows,
  loading,
  empty,
  renderRow,
}) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.018)] flex flex-col h-[520px]">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={clsx('flex h-8 w-8 items-center justify-center rounded-lg border shadow-[0_1px_2px_rgba(0,0,0,0.01)]', iconBg)}>
            <Icon size={15} strokeWidth={2} className={iconClass} />
          </div>
          <h3 className="truncate text-sm font-bold tracking-tight text-ink font-sans">{title}</h3>
        </div>
        <Link
          to={viewAllHref}
          className="group/link flex items-center gap-0.5 text-[11px] font-bold text-accent transition-all hover:text-accent-hover font-sans"
        >
          View All
          <ChevronRight size={12} className="transition-transform duration-200 group-hover/link:translate-x-0.5" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/20 p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="rounded-xl border border-slate-150 bg-white p-4 animate-pulse space-y-3">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="flex items-center justify-between">
                  <div className="h-3.5 bg-slate-100 rounded w-1/4" />
                  <div className="h-5 bg-slate-100 rounded-full w-1/5" />
                </div>
                <div className="flex gap-4">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : empty ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-ink-soft/40 py-12">
            <Icon size={24} className="opacity-25 mb-1 text-slate-400" />
            <p className="text-xs font-semibold">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.key}
                onClick={() => navigate(row.href)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(row.href);
                  }
                }}
                tabIndex={0}
                role="button"
                className="group text-left w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                {renderRow(row)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function JobRequestsTable({ rows = [], loading }) {
  const tableRows = rows.map((jr, index) => ({
    key: `${jr.jr_no || 'jr'}-${index}`,
    href: `/job-requests/${encodeURIComponent(jr.jr_no)}`,
    item: jr.equipment_name || `JR #${jr.jr_no}`,
    reference: jr.jr_no,
    lane: jr.lane_code,
    actor: jr.actor_name,
    time: relTime(jr.time_at),
    status: jr.status,
  }));

  return (
    <ActivityListPanel
      title="Recent Job Requests"
      icon={FileText}
      iconClass="text-indigo-600"
      iconBg="bg-indigo-50 border-indigo-100/50"
      viewAllHref="/job-requests"
      rows={tableRows}
      loading={loading}
      empty={tableRows.length === 0}
      renderRow={(row) => (
        <div className="space-y-3">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-accent transition-colors truncate">
              {row.item}
            </h4>
            {row.lane && (
              <span className="inline-flex mt-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                Lane: {row.lane}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono font-bold">
              <Hash size={11} className="text-slate-400" />
              {row.reference}
            </div>
            <StatusBadge status={row.status} />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
            <span className="inline-flex items-center gap-1 text-indigo-600/90 font-semibold truncate max-w-[150px]">
              <UserRound size={11} className="text-indigo-400" />
              {row.actor}
            </span>
            <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
              <Clock size={11} />
              {row.time}
            </span>
          </div>
        </div>
      )}
    />
  );
}

function JobCardsTable({ rows = [], loading }) {
  const tableRows = rows.map((jc, index) => ({
    key: `${jc.jc_id || jc.jc_no || 'jc'}-${index}`,
    href: `/job-cards/${encodeURIComponent(jc.jc_id || jc.jc_no)}`,
    item: jc.equipment_name || `JC #${jc.jc_no}`,
    reference: jc.jc_no || jc.jc_id,
    lane: jc.lane_code,
    engineer: jc.engineer_name,
    time: relTime(jc.time_at),
    status: jc.status,
  }));

  return (
    <ActivityListPanel
      title="Recent Job Card Updates"
      icon={ClipboardList}
      iconClass="text-blue-600"
      iconBg="bg-blue-50 border-blue-100/50"
      viewAllHref="/job-cards"
      rows={tableRows}
      loading={loading}
      empty={tableRows.length === 0}
      renderRow={(row) => (
        <div className="space-y-3">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-accent transition-colors truncate">
              {row.item}
            </h4>
            {row.lane && (
              <span className="inline-flex mt-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                Lane: {row.lane}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono font-bold">
              <Hash size={11} className="text-slate-400" />
              {row.reference}
            </div>
            <StatusBadge status={row.status} />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
            <span className="inline-flex items-center gap-1 text-blue-600/90 font-semibold truncate max-w-[150px]">
              <UserRound size={11} className="text-blue-400" />
              {row.engineer}
            </span>
            <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
              <Clock size={11} />
              {row.time}
            </span>
          </div>
        </div>
      )}
    />
  );
}

function EquipmentTable({ rows = [], loading }) {
  const tableRows = rows.map((eq, index) => {
    const equipmentId = eq.equipment_id || `${eq.eqm_type}-${eq.eqm_id}`;
    return {
      key: `${eq.eqm_type || 'eq'}-${eq.eqm_id || index}`,
      href: `/equipment/${encodeURIComponent(equipmentId)}`,
      item: eq.name,
      reference: equipmentId,
      type: eq.type_name,
      time: relTime(eq.time_at),
      status: eq.status,
    };
  });

  return (
    <ActivityListPanel
      title="Recent Equipment"
      icon={Box}
      iconClass="text-emerald-600"
      iconBg="bg-emerald-50 border-emerald-100/50"
      viewAllHref="/equipment"
      rows={tableRows}
      loading={loading}
      empty={tableRows.length === 0}
      renderRow={(row) => (
        <div className="space-y-3">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-accent transition-colors truncate">
              {row.item}
            </h4>
            {row.type && (
              <span className="inline-flex mt-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                Type: {row.type}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono font-bold">
              <Hash size={11} className="text-slate-400" />
              {row.reference}
            </div>
            <StatusBadge status={row.status} />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
            <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
              <Clock size={11} />
              {row.time}
            </span>
          </div>
        </div>
      )}
    />
  );
}

export function QuickRecap({ data, loading = false }) {
  const isLoading = loading || data === null;

  return (
    <section aria-label="Quick Recap - Recent Activity" className="font-sans">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold tracking-tight text-ink font-sans">
          Quick Recap
          <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-ink-soft/60">
            - Recent Activity
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <JobRequestsTable rows={data?.job_requests} loading={isLoading} />
        <JobCardsTable rows={data?.job_cards} loading={isLoading} />
        <EquipmentTable rows={data?.equipment} loading={isLoading} />
      </div>
    </section>
  );
}
