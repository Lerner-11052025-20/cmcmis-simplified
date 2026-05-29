// ============================================================================
// src/components/DataTable.jsx  —  Generic presentational data table
// ----------------------------------------------------------------------------
// Dumb-presentational. The caller passes columns + rows + a key field.
// No data fetching here. Loading state shows a thin top bar so the
// table never "blanks" during refetches.
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
    <div className="relative bg-white rounded-lg border border-border shadow-card overflow-hidden">
      {loading ? (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent animate-pulse" />
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-base-elev">
            <tr>
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={clsx(
                    'px-4 py-3 text-left font-medium text-ink-soft',
                    c.headerClassName,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td
                  className="px-4 py-12 text-center text-ink-soft text-xs"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row[keyField]}
                  className="border-t border-border odd:bg-[#EDF1F7] even:bg-white hover:bg-[#E2E8F0] transition-colors duration-150"
                >
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
                        className={clsx('px-4 py-3 align-middle', cls)}
                      >
                        {node ?? <span className="text-ink-soft">—</span>}
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
