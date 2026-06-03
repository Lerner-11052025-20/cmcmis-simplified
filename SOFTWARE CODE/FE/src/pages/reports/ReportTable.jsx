import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

import { formatIstDate } from '../../lib/time.js';

const STATUS_BADGE = {
  VALID: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  DUE_SOON: 'bg-amber-50 text-amber-700 ring-amber-100',
  OVERDUE: 'bg-red-50 text-red-700 ring-red-100',
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-200',
  SUBMITTED: 'bg-blue-50 text-blue-700 ring-blue-100',
  ASSIGNED: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 ring-amber-100',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  VERIFIED_CLOSED: 'bg-green-50 text-green-700 ring-green-100',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-100',
  REOPENED: 'bg-purple-50 text-purple-700 ring-purple-100',
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  UNDER_CALIBRATION: 'bg-amber-50 text-amber-700 ring-amber-100',
  UNDER_REPAIR: 'bg-orange-50 text-orange-700 ring-orange-100',
  OUT_OF_TOLERANCE: 'bg-red-50 text-red-700 ring-red-100',
  QUARANTINED: 'bg-rose-50 text-rose-700 ring-rose-100',
  CONDEMNED: 'bg-slate-200 text-slate-800 ring-slate-300',
  RETIRED: 'bg-slate-100 text-slate-600 ring-slate-200',
  PENDING_VERIFICATION: 'bg-yellow-50 text-yellow-700 ring-yellow-100',
  HIGH: 'bg-rose-50 text-rose-700 ring-rose-100',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-100',
  LOW: 'bg-slate-100 text-slate-700 ring-slate-200',
  URGENT: 'bg-red-50 text-red-700 ring-red-100',
};

function displayText(value) {
  return String(value).replaceAll('_', ' ');
}

function extractYear(value) {
  if (!value) return new Date().getFullYear();
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\d{4}/.test(value)) return value.slice(0, 4);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
}

function formatDisplayCode(prefix, id, dateValue, fallback) {
  if (id === null || id === undefined || id === '') return fallback || '';
  return `${prefix}-${extractYear(dateValue)}-${String(id).padStart(4, '0')}`;
}

function renderCell(col, value, row) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-300">-</span>;
  }

  if (col.display === 'jrCode') {
    return formatDisplayCode('JR', value, row?.submitted_date || row?.received_date, row?.request_code);
  }

  if (col.display === 'jcCode') {
    return formatDisplayCode('JC', value, row?.received_date || row?.completed_date, row?.card_code || row?.job_card_no);
  }

  if (col.kind === 'date') {
    const d = dayjs(value);
    return d.isValid() ? formatIstDate(value) : String(value);
  }

  if (col.kind === 'number') {
    return <span className="tabular-nums">{Number(value).toLocaleString()}</span>;
  }

  if (col.kind === 'badge') {
    const key = String(value).toUpperCase();
    const badge = STATUS_BADGE[key] || 'bg-slate-100 text-slate-700 ring-slate-200';
    return (
      <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1', badge)}>
        {displayText(value)}
      </span>
    );
  }

  return <span className={clsx(col.mono && 'font-mono text-xs')}>{String(value)}</span>;
}

function compareValues(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined || a === '') return 1;
  if (b === null || b === undefined || b === '') return -1;

  const aDate = dayjs(a);
  const bDate = dayjs(b);
  if (aDate.isValid() && bDate.isValid()) return aDate.valueOf() - bDate.valueOf();

  if (typeof a === 'number' || typeof b === 'number') {
    return Number(a) - Number(b);
  }

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function ReportTable({ columns, rows, total, page, pageSize, onPage, loading, error }) {
  const [sort, setSort] = useState({ id: null, dir: null });

  const sortedRows = useMemo(() => {
    const source = rows || [];
    if (!sort.id || !sort.dir) return source;
    const column = columns.find((col) => col.id === sort.id);
    if (!column || column.sortable === false) return source;
    const direction = sort.dir === 'asc' ? 1 : -1;
    return [...source].sort((a, b) => compareValues(a?.[column.accessorKey], b?.[column.accessorKey]) * direction);
  }, [columns, rows, sort]);

  const totalRows = total || 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / (pageSize || 1)));
  const startRow = totalRows === 0 ? 0 : ((page - 1) * pageSize) + 1;
  const endRow = Math.min(page * pageSize, totalRows);

  function toggleSort(column) {
    if (column.sortable === false || column.kind === 'badge') return;
    setSort((current) => {
      if (current.id !== column.id) return { id: column.id, dir: 'asc' };
      if (current.dir === 'asc') return { id: column.id, dir: 'desc' };
      return { id: null, dir: null };
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.045)]">
      {loading ? (
        <div className="h-1 overflow-hidden bg-indigo-50">
          <div className="h-full w-1/3 animate-pulse bg-indigo-500" />
        </div>
      ) : null}

      <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Report Data</h3>
          <p className="text-xs text-slate-500">Showing database-backed rows for the selected report.</p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {totalRows.toLocaleString()} rows
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="w-14 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                #
              </th>
              {columns.map((column) => {
                const dir = sort.id === column.id ? sort.dir : null;
                const sortable = column.sortable !== false && column.kind !== 'badge';
                return (
                  <th
                    key={column.id}
                    style={{ width: column.size || 140 }}
                    className={clsx(
                      'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500',
                      sortable && 'cursor-pointer select-none hover:text-slate-800',
                      (column.mono || column.display) && 'whitespace-nowrap',
                    )}
                    onClick={() => toggleSort(column)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {column.header}
                      {dir === 'asc' ? <ArrowUp size={13} className="text-indigo-600" aria-hidden="true" /> : null}
                      {dir === 'desc' ? <ArrowDown size={13} className="text-indigo-600" aria-hidden="true" /> : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-14 text-center text-sm text-slate-500">
                  Loading report data...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-14 text-center text-sm font-medium text-rose-600">
                  Could not load report: {error.response?.data?.error?.message || error.message}
                </td>
              </tr>
            ) : sortedRows.length > 0 ? (
              sortedRows.map((row, rowIndex) => (
                <tr
                  key={row.job_request_id || row.job_card_id || row.equipment_id || row.engineer_employee_id || rowIndex}
                  className="border-b border-slate-100 last:border-b-0 hover:bg-indigo-50/35"
                >
                  <td className="px-4 py-3 align-middle">
                    <span className="text-xs font-semibold tabular-nums text-slate-400">
                      {((page - 1) * pageSize) + rowIndex + 1}
                    </span>
                  </td>
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={clsx(
                        'px-4 py-3 align-middle text-sm font-medium leading-5 text-slate-700',
                        (column.mono || column.display) && 'whitespace-nowrap font-mono text-[13px]',
                      )}
                    >
                      {renderCell(column, row?.[column.accessorKey], row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-16 text-center">
                  <Inbox className="mx-auto text-slate-300" size={34} strokeWidth={1.5} aria-hidden="true" />
                  <div className="mt-3 text-sm font-semibold text-slate-600">No rows found</div>
                  <div className="mt-1 text-sm text-slate-400">Change the filters or select another report.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-slate-500">
          Showing <span className="font-semibold tabular-nums text-slate-700">{startRow}</span>
          {' - '}
          <span className="font-semibold tabular-nums text-slate-700">{endRow}</span>
          {' of '}
          <span className="font-semibold tabular-nums text-slate-700">{totalRows.toLocaleString()}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPage?.(page - 1)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={14} strokeWidth={1.8} aria-hidden="true" />
            Prev
          </button>
          <span className="text-xs font-semibold tabular-nums text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => onPage?.(page + 1)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight size={14} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </span>
      </div>
    </section>
  );
}
