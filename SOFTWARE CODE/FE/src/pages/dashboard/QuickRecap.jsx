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

function SkeletonRows({ columns }) {
  return Array.from({ length: 5 }).map((_, rowIndex) => (
    <tr
      key={rowIndex}
      className={clsx(
        'border-b border-slate-100 last:border-b-0',
        rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
      )}
    >
      {columns.map((column, columnIndex) => (
        <td key={column.key || columnIndex} className="px-4 py-3.5 align-middle">
          <div
            className={clsx(
              'h-3.5 animate-pulse rounded bg-slate-100',
              columnIndex === 0 ? 'w-52' : 'w-24',
            )}
          />
        </td>
      ))}
    </tr>
  ));
}

function DetailValue({ icon: Icon, children, strong = false, accentClass }) {
  return (
    <span className={clsx('inline-flex min-w-0 items-center gap-1.5', strong && 'font-bold text-ink')}>
      {Icon ? <Icon size={12} className="shrink-0 text-slate-400" /> : null}
      <span className={clsx('truncate', accentClass)}>{children || EMPTY_VALUE}</span>
    </span>
  );
}

function PrimaryCell({ dotClass, title, subtitle, subtitleClass }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={clsx('h-2 w-2 rounded-full ring-4 shrink-0', dotClass)} />
      <div className="min-w-0">
        <p className="truncate text-[13px] font-bold leading-5 text-ink transition-colors group-hover:text-accent">
          {title || EMPTY_VALUE}
        </p>
        {subtitle ? (
          <p className={clsx('mt-0.5 truncate text-[11px] font-semibold', subtitleClass)}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ActivityTablePanel({
  title,
  icon: Icon,
  iconClass,
  iconBg,
  viewAllHref,
  rows,
  columns,
  loading,
  empty,
}) {
  const navigate = useNavigate();

  return (
    <div
      className={clsx(
        'overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.018)]',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
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

      <div className="overflow-x-auto border-t border-slate-100">
        <table className="min-w-[860px] w-full table-fixed text-left font-sans">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={clsx(
                    'px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400',
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows columns={columns} />
            ) : empty ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-ink-soft/40">
                    <Icon size={28} className="opacity-20" />
                    <p className="text-xs font-semibold">No recent activity</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={row.key}
                  tabIndex={0}
                  role="button"
                  onClick={() => navigate(row.href)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(row.href);
                    }
                  }}
                  className={clsx(
                    'group cursor-pointer border-b border-slate-100 transition-all duration-200 last:border-b-0 focus:outline-none focus-visible:bg-indigo-50/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-200',
                    rowIndex % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/40 hover:bg-slate-100/70',
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={clsx(
                        'px-4 py-3 align-middle text-[12px] font-semibold text-slate-600',
                        column.className,
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
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

  const columns = [
    {
      key: 'item',
      header: 'Request / Equipment',
      className: 'w-[34%]',
      render: (row) => (
        <PrimaryCell
          dotClass="bg-indigo-500 ring-indigo-100"
          title={row.item}
          subtitle={row.lane ? `Lane: ${row.lane}` : null}
          subtitleClass="text-indigo-600/75"
        />
      ),
    },
    {
      key: 'reference',
      header: 'JR No.',
      className: 'w-[16%]',
      render: (row) => <DetailValue icon={Hash} strong>{row.reference}</DetailValue>,
    },
    {
      key: 'date',
      header: 'Date',
      className: 'w-[15%] text-slate-500',
      render: (row) => <DetailValue icon={Clock}>{row.time}</DetailValue>,
    },
    {
      key: 'actor',
      header: 'Submitted By',
      className: 'w-[22%]',
      render: (row) => <DetailValue icon={UserRound} accentClass="text-indigo-600/85 font-bold">{row.actor}</DetailValue>,
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[13%]',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <ActivityTablePanel
      title="Recent Job Requests"
      icon={FileText}
      iconClass="text-indigo-600"
      iconBg="bg-indigo-50 border-indigo-100/50"
      viewAllHref="/job-requests"
      rows={tableRows}
      columns={columns}
      loading={loading}
      empty={tableRows.length === 0}
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

  const columns = [
    {
      key: 'item',
      header: 'Job Card / Equipment',
      className: 'w-[34%]',
      render: (row) => (
        <PrimaryCell
          dotClass="bg-blue-500 ring-blue-100"
          title={row.item}
          subtitle={row.lane ? `Lane: ${row.lane}` : null}
          subtitleClass="text-blue-600/75"
        />
      ),
    },
    {
      key: 'reference',
      header: 'JC No.',
      className: 'w-[16%]',
      render: (row) => <DetailValue icon={Hash} strong>{row.reference}</DetailValue>,
    },
    {
      key: 'date',
      header: 'Updated',
      className: 'w-[15%] text-slate-500',
      render: (row) => <DetailValue icon={Clock}>{row.time}</DetailValue>,
    },
    {
      key: 'engineer',
      header: 'Engineer',
      className: 'w-[22%]',
      render: (row) => <DetailValue icon={UserRound} accentClass="text-blue-600/85 font-bold">{row.engineer}</DetailValue>,
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[13%]',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <ActivityTablePanel
      title="Recent Job Card Updates"
      icon={ClipboardList}
      iconClass="text-blue-600"
      iconBg="bg-blue-50 border-blue-100/50"
      viewAllHref="/job-cards"
      rows={tableRows}
      columns={columns}
      loading={loading}
      empty={tableRows.length === 0}
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
      createdBy: eq.created_by,
      time: relTime(eq.time_at),
      status: eq.status,
    };
  });

  const columns = [
    {
      key: 'item',
      header: 'Equipment',
      className: 'w-[34%]',
      render: (row) => (
        <PrimaryCell
          dotClass="bg-emerald-500 ring-emerald-100"
          title={row.item}
          subtitle={row.type}
          subtitleClass="text-emerald-600/75"
        />
      ),
    },
    {
      key: 'reference',
      header: 'Equipment ID',
      className: 'w-[16%]',
      render: (row) => <DetailValue icon={Hash} strong>{row.reference}</DetailValue>,
    },
    {
      key: 'date',
      header: 'Added On',
      className: 'w-[15%] text-slate-500',
      render: (row) => <DetailValue icon={Clock}>{row.time}</DetailValue>,
    },
    {
      key: 'type',
      header: 'Type',
      className: 'w-[22%]',
      render: (row) => <DetailValue accentClass="text-emerald-600/85 font-bold">{row.type}</DetailValue>,
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[13%]',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <ActivityTablePanel
      title="Recent Equipment"
      icon={Box}
      iconClass="text-emerald-600"
      iconBg="bg-emerald-50 border-emerald-100/50"
      viewAllHref="/equipment"
      rows={tableRows}
      columns={columns}
      loading={loading}
      empty={tableRows.length === 0}
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

      <div className="space-y-4">
        <JobRequestsTable rows={data?.job_requests} loading={isLoading} />
        <JobCardsTable rows={data?.job_cards} loading={isLoading} />
        <EquipmentTable rows={data?.equipment} loading={isLoading} />
      </div>
    </section>
  );
}
