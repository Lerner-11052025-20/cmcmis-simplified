// ============================================================================
// src/components/DataTable.jsx  —  Premium presentational data table
// ----------------------------------------------------------------------------
// Dumb-presentational. The caller passes columns + rows + a key field.
// No data fetching here. Loading state shows a sleek animated bar.
//
// COLUMN SHAPE
//   {
//     header:    string,
//     accessor:  string  (row[accessor]) or function (row) => value,
//     format?:   (value, row) => React.ReactNode,
//     className?: string  (per-cell class — useful for color rules),
//   }
// ============================================================================

import clsx from 'clsx';

/**
 * @param {Object} props
 * @param {Array<{ header: string, accessor: string|Function, format?: Function, className?: string|Function, headerClassName?: string }>} props.columns
 * @param {Array<Object>} props.rows
 * @param {string}        props.keyField    Property name used as React key
 * @param {boolean}       [props.loading]
 * @param {string}        [props.emptyMessage]
 */
export function DataTable({
  columns,
  rows,
  keyField,
  loading = false,
  emptyMessage = 'No rows to show.',
}) {
  return (
    <div className="relative bg-white rounded-xl border border-slate-200/70 shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
      {/* Loading — animated gradient sweep */}
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
          {/* ── Header — bold accent-tinted strip ── */}
          <thead>
            <tr className="bg-indigo-100/50 border-b border-indigo-100/60">
              <th className="px-4 py-3.5 text-left text-[13px] font-semibold text-slate-500 font-sans w-12">
                #
              </th>
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={clsx(
                    'px-4 py-3.5 text-left text-[14px] font-semibold text-slate-500 font-sans',
                    c.headerClassName,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td
                  className="px-4 py-16 text-center text-slate-400 text-sm font-medium"
                  colSpan={columns.length + 1}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={row[keyField]}
                  className={clsx(
                    'border-b border-slate-100/70 last:border-b-0 transition-all duration-200 group',
                    rowIndex % 2 === 0
                      ? 'bg-white'
                      : 'bg-slate-50/60',
                    'hover:bg-indigo-50/40',
                  )}
                >
                  {/* Row number */}
                  <td className="px-4 py-3 align-middle w-12">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100/80 text-[10px] font-bold text-slate-400 font-sans tabular-nums group-hover:bg-indigo-100 group-hover:text-indigo-500 transition-colors duration-200">
                      {rowIndex + 1}
                    </span>
                  </td>
                  {columns.map((c, i) => {
                    const raw =
                      typeof c.accessor === 'function'
                        ? c.accessor(row)
                        : row[c.accessor];
                    const node = c.format ? c.format(raw, row) : raw;
                    const cls =
                      typeof c.className === 'function'
                        ? c.className(raw, row)
                        : c.className;
                    return (
                      <td
                        key={i}
                        className={clsx(
                          'px-4 py-3 align-middle text-[13px] font-medium text-slate-600 font-sans',
                          cls,
                        )}
                      >
                        {node ?? <span className="text-slate-300">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
