// ============================================================================
// src/pages/reports/ReportTable.jsx  —  Premium TanStack report table
// ----------------------------------------------------------------------------
// Redesigned with modern styling matching the project DataTable aesthetics.
// ============================================================================

import { useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';

const STATUS_BADGE = {
  VALID:    'bg-emerald-50 text-emerald-700',
  DUE_SOON: 'bg-amber-50 text-amber-700',
  OVERDUE:  'bg-red-50 text-red-700',
  DRAFT:    'bg-slate-100 text-slate-700',
  SUBMITTED:'bg-blue-50 text-blue-700',
  ASSIGNED: 'bg-indigo-50 text-indigo-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  VERIFIED_CLOSED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-rose-50 text-rose-700',
  REOPENED: 'bg-purple-50 text-purple-700',
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  UNDER_CALIBRATION: 'bg-amber-50 text-amber-700',
  UNDER_REPAIR: 'bg-orange-50 text-orange-700',
  OUT_OF_TOLERANCE: 'bg-red-50 text-red-700',
  QUARANTINED: 'bg-rose-50 text-rose-700',
  CONDEMNED: 'bg-slate-200 text-slate-800',
  RETIRED: 'bg-slate-100 text-slate-600',
  PENDING_VERIFICATION: 'bg-yellow-50 text-yellow-700',
};

function toTanColumn(col) {
  return {
    id: col.id,
    accessorKey: col.accessorKey,
    header: col.header,
    enableSorting: col.kind !== 'badge',
    size: col.size || 120,
    cell: (info) => {
      const v = info.getValue();
      if (v === null || v === undefined || v === '') return <span className="text-slate-300">—</span>;
      if (col.kind === 'date') {
        const d = dayjs(v);
        return d.isValid() ? d.format('YYYY-MM-DD') : String(v);
      }
      if (col.kind === 'number') return <span className="tabular-nums">{Number(v).toLocaleString()}</span>;
      if (col.kind === 'badge') {
        const cls = STATUS_BADGE[v] || 'bg-slate-100 text-slate-700';
        return <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium', cls)}>{v}</span>;
      }
      return String(v);
    },
  };
}

export function ReportTable({ columns, rows, total, page, pageSize, onPage, loading, error }) {
  const tanColumns = useMemo(() => columns.map(toTanColumn), [columns]);

  const table = useReactTable({
    data: rows || [],
    columns: tanColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));

  return (
    <div className="relative rounded-xl border border-slate-200/70 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
      {/* Loading shimmer */}
      {loading ? (
        <div className="absolute top-0 left-0 right-0 z-20 h-[2px] overflow-hidden bg-indigo-100">
          <div
            className="h-full w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent"
            style={{ animation: 'shimmerBar 1.2s ease-in-out infinite' }}
          />
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-indigo-50/30 border-b border-slate-100">
                <th className="px-4 py-3.5 text-left text-[13px] font-semibold text-slate-500 font-sans w-12 select-none">
                  #
                </th>
                {hg.headers.map((h) => {
                  const dir = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      style={{ width: h.getSize() }}
                      className="px-4 py-3.5 text-left text-[13px] font-semibold text-slate-500 font-sans select-none cursor-pointer hover:text-slate-700 transition-colors duration-150"
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {dir === 'asc' ? <ArrowUp size={13} strokeWidth={2} className="text-accent" /> : null}
                        {dir === 'desc' ? <ArrowDown size={13} strokeWidth={2} className="text-accent" /> : null}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-slate-400 text-sm font-sans">
                  <div className="animate-pulse">Loading report data…</div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-rose-600 text-sm font-sans">
                  Could not load report: {error.response?.data?.error?.message || error.message}
                </td>
              </tr>
            ) : (rows && rows.length > 0) ? (
              table.getRowModel().rows.map((r, rowIndex) => (
                <tr
                  key={r.id}
                  className={clsx(
                    'border-b border-slate-100/70 last:border-b-0 transition-all duration-200 group cursor-pointer',
                    'border-l-[3px] border-l-transparent hover:border-l-accent',
                    rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/60',
                    'hover:bg-indigo-50 hover:shadow-[inset_0_0_0_1px_rgba(79,93,255,0.08)]',
                  )}
                >
                  <td className="px-4 py-3 align-middle w-12">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100/80 text-[10px] font-bold text-slate-400 font-sans tabular-nums group-hover:bg-indigo-100 group-hover:text-indigo-500 transition-colors duration-200">
                      {((page - 1) * pageSize) + rowIndex + 1}
                    </span>
                  </td>
                  {r.getVisibleCells().map((c) => (
                    <td key={c.id} className="px-4 py-3 align-middle text-[13px] font-medium text-slate-600 font-sans">
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-16 text-center text-slate-400 text-sm font-sans">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <span>No rows match the current filter.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
        <span className="text-[12px] text-slate-400 font-sans tabular-nums">
          Showing{' '}
          <span className="font-semibold text-slate-600">{((page - 1) * pageSize) + 1}</span>
          –
          <span className="font-semibold text-slate-600">{Math.min(page * pageSize, total)}</span>
          {' '}of{' '}
          <span className="font-semibold text-slate-600">{(total || 0).toLocaleString()}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPage?.(page - 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 font-sans hover:bg-slate-50 hover:border-slate-300/80 disabled:opacity-40 transition-all duration-200"
          >
            <ChevronLeft size={14} strokeWidth={1.75} /> Prev
          </button>
          <span className="text-[12px] font-semibold text-slate-500 font-sans tabular-nums px-1">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => onPage?.(page + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 font-sans hover:bg-slate-50 hover:border-slate-300/80 disabled:opacity-40 transition-all duration-200"
          >
            Next <ChevronRight size={14} strokeWidth={1.75} />
          </button>
        </span>
      </div>
    </div>
  );
}
