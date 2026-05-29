// ============================================================================
// src/pages/reports/ReportFilters.jsx  —  Global filter bar
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// Renders the panel shown in the attached UI:
//
//     ┌─ Report Filters ─────────────────────────────────────────────┐
//     │ Date From   Date To    Division          Status              │
//     │ [____]      [____]     [All Divisions ▾] [All Statuses ▾]    │
//     │ [Apply Filters]   [Reset]                                    │
//     └──────────────────────────────────────────────────────────────┘
//
// PROPS
//   • value           — current { dateFrom, dateTo, divisionId, status }
//   • onChange(next)  — applies filters; parent forwards into useReport
//   • statusEnum      — array of allowed status strings (per-report);
//                        when undefined the Status column is hidden
//   • disabled        — disables the panel during fetches (optional)
//
// Filters are LOCAL until "Apply" is pressed — pressing Reset clears
// everything AND fires onChange immediately. This mirrors the attached
// UI mock and gives users the chance to compose a filter set without
// triggering a fetch on every keystroke.
// ============================================================================

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, RotateCcw } from 'lucide-react';

import { fetchDivisions } from '../../lib/api/lookups.js';

export function ReportFilters({ value, onChange, statusEnum, disabled }) {
  // Local copy of the filter object — we only push it upstream on Apply.
  const [local, setLocal] = useState(value);

  // Keep local in sync if the parent ever resets the filters externally.
  useEffect(() => { setLocal(value); }, [value]);

  // Divisions dropdown — cached forever (semi-static lookup).
  const divQ = useQuery({
    queryKey: ['lookups', 'divisions'],
    queryFn: ({ signal }) => fetchDivisions(signal),
    staleTime: 60 * 60 * 1000,
  });

  function set(key, val) {
    setLocal((prev) => ({ ...prev, [key]: val }));
  }

  function apply() {
    onChange?.(local);
  }
  function reset() {
    const empty = { dateFrom: '', dateTo: '', divisionId: '', status: '' };
    setLocal(empty);
    onChange?.(empty);
  }

  return (
    <div className="rounded-lg border border-border bg-base-elev p-4">
      <h3 className="text-sm font-semibold text-ink">Report Filters</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Date From */}
        <label className="text-xs text-ink-soft">
          <span className="block mb-1">Date From</span>
          <input
            type="date"
            value={local.dateFrom || ''}
            disabled={disabled}
            onChange={(e) => set('dateFrom', e.target.value)}
            className="w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        {/* Date To */}
        <label className="text-xs text-ink-soft">
          <span className="block mb-1">Date To</span>
          <input
            type="date"
            value={local.dateTo || ''}
            disabled={disabled}
            onChange={(e) => set('dateTo', e.target.value)}
            className="w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        {/* Division */}
        <label className="text-xs text-ink-soft">
          <span className="block mb-1">Division</span>
          <select
            value={local.divisionId || ''}
            disabled={disabled || divQ.isLoading}
            onChange={(e) => set('divisionId', e.target.value ? Number(e.target.value) : '')}
            className="w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">All Divisions</option>
            {(divQ.data || []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}{d.name ? ` — ${d.name}` : ''}
              </option>
            ))}
          </select>
        </label>
        {/* Status (per-report; some reports don't have one) */}
        <label className="text-xs text-ink-soft">
          <span className="block mb-1">Status</span>
          <select
            value={local.status || ''}
            disabled={disabled || !statusEnum}
            onChange={(e) => set('status', e.target.value)}
            className="w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
          >
            <option value="">All Statuses</option>
            {(statusEnum || []).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={apply}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
        >
          <Filter size={16} strokeWidth={1.5} aria-hidden="true" />
          Apply Filters
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-base px-4 py-2 text-sm text-ink hover:bg-base-elev focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
        >
          <RotateCcw size={16} strokeWidth={1.5} aria-hidden="true" />
          Reset
        </button>
      </div>
    </div>
  );
}
