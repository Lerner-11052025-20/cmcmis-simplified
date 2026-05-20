// ============================================================================
// src/pages/reports/ReportTable.jsx  —  TanStack-Table report table
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// One generic table that handles every Phase-10 report. Driven by the
// `columns` array in reportConfig.js (different shape per report).
//
// FEATURES
//   • Sorting     — TanStack core; click header to toggle asc/desc/clear
//   • Pagination  — server-side via report params (page, page_size)
//   • Date / number / badge formatting via columnDef.kind
//   • Sticky header + horizontal scroll for wide tables
//   • Empty + loading + error states
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
  // calibration
  VALID:    'bg-emerald-50 text-emerald-700',
  DUE_SOON: 'bg-amber-50 text-amber-700',
  OVERDUE:  'bg-red-50 text-red-700',
  // JR / JC lifecycle
  DRAFT:    'bg-slate-100 text-slate-700',
  SUBMITTED:'bg-blue-50 text-blue-700',
  ASSIGNED: 'bg-indigo-50 text-indigo-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  VERIFIED_CLOSED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-rose-50 text-rose-700',
  REOPENED: 'bg-purple-50 text-purple-700',
  // equipment
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  UNDER_CALIBRATION: 'bg-amber-50 text-amber-700',
  UNDER_REPAIR: 'bg-orange-50 text-orange-700',
  OUT_OF_TOLERANCE: 'bg-red-50 text-red-700',
  QUARANTINED: 'bg-rose-50 text-rose-700',
  CONDEMNED: 'bg-slate-200 text-slate-800',
  RETIRED: 'bg-slate-100 text-slate-600',
  PENDING_VERIFICATION: 'bg-yellow-50 text-yellow-700',
};

// Convert a column def (from reportConfig) into a TanStack column def
// with our cell formatters wired in.
function toTanColumn(col) {
  return {
    id: col.id,
    accessorKey: col.accessorKey,
    header: col.header,
    enableSorting: col.kind !== 'badge',     // badges sort numerically rarely
    size: col.size || 120,
    cell: (info) => {
      const v = info.getValue();
      if (v === null || v === undefined || v === '') return <span className="text-ink-soft">—</span>;
      if (col.kind === 'date') {
        const d = dayjs(v);
        return d.isValid() ? d.format('YYYY-MM-DD') : String(v);
      }
      if (col.kind === 'number') return <span className="tabular-nums">{Number(v).toLocaleString()}</span>;
      if (col.kind === 'badge') {
        const cls = STATUS_BADGE[v] || 'bg-slate-100 text-slate-700';
        return <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', cls)}>{v}</span>;
      }
      return String(v);
    },
  };
}

/**
 * @param {Object} props
 * @param {Array}  props.columns     reportConfig column defs
 * @param {Array}  props.rows        BE data rows
 * @param {number} props.total       BE total count (for pagination)
 * @param {number} props.page        1-based current page
 * @param {number} props.pageSize    rows per page
 * @param {(p:number)=>void} props.onPage
 * @param {boolean} props.loading
 * @param {Error?}  props.error
 */
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
    <div className="rounded-lg border border-border bg-base-elev">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-base text-ink-soft text-xs uppercase tracking-wider">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const dir = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      style={{ width: h.getSize() }}
                      className="px-3 py-2 text-left font-medium select-none cursor-pointer"
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {dir === 'asc' ? <ArrowUp size={12} strokeWidth={1.5} /> : null}
                        {dir === 'desc' ? <ArrowDown size={12} strokeWidth={1.5} /> : null}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-ink-soft">
                  Loading report data…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-red-700">
                  Could not load report: {error.response?.data?.error?.message || error.message}
                </td>
              </tr>
            ) : (rows && rows.length > 0) ? (
              table.getRowModel().rows.map((r) => (
                <tr key={r.id} className="hover:bg-base">
                  {r.getVisibleCells().map((c) => (
                    <td key={c.id} className="px-3 py-2 text-ink">
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-ink-soft">
                  No rows match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-ink-soft">
        <span>
          Showing{' '}
          <span className="tabular-nums">{((page - 1) * pageSize) + 1}</span>
          –
          <span className="tabular-nums">{Math.min(page * pageSize, total)}</span>{' '}
          of <span className="tabular-nums">{(total || 0).toLocaleString()}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPage?.(page - 1)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-base px-2 py-1 hover:bg-base-elev disabled:opacity-50"
          >
            <ChevronLeft size={14} strokeWidth={1.5} /> Prev
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => onPage?.(page + 1)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-base px-2 py-1 hover:bg-base-elev disabled:opacity-50"
          >
            Next <ChevronRight size={14} strokeWidth={1.5} />
          </button>
        </span>
      </div>
    </div>
  );
}
