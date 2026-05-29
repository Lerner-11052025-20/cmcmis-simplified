// ============================================================================
// src/pages/reports/ReportFilters.jsx  —  Premium filter panel
// ============================================================================

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, RotateCcw } from 'lucide-react';

import { fetchDivisions } from '../../lib/api/lookups.js';

export function ReportFilters({ value, onChange, statusEnum, disabled }) {
  const [local, setLocal] = useState(value);

  useEffect(() => { setLocal(value); }, [value]);

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

  const inputCls = 'w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 text-[13px] text-slate-700 font-sans focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all duration-200 placeholder:text-slate-300';

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <h3 className="text-[13px] font-semibold text-slate-700 font-sans">Report Filters</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Date From */}
        <label className="space-y-1.5">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">Date From</span>
          <input
            type="date"
            value={local.dateFrom || ''}
            disabled={disabled}
            onChange={(e) => set('dateFrom', e.target.value)}
            className={inputCls}
          />
        </label>
        {/* Date To */}
        <label className="space-y-1.5">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">Date To</span>
          <input
            type="date"
            value={local.dateTo || ''}
            disabled={disabled}
            onChange={(e) => set('dateTo', e.target.value)}
            className={inputCls}
          />
        </label>
        {/* Division */}
        <label className="space-y-1.5">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">Division</span>
          <select
            value={local.divisionId || ''}
            disabled={disabled || divQ.isLoading}
            onChange={(e) => set('divisionId', e.target.value ? Number(e.target.value) : '')}
            className={inputCls}
          >
            <option value="">All Divisions</option>
            {(divQ.data || []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}{d.name ? ` — ${d.name}` : ''}
              </option>
            ))}
          </select>
        </label>
        {/* Status */}
        <label className="space-y-1.5">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">Status</span>
          <select
            value={local.status || ''}
            disabled={disabled || !statusEnum}
            onChange={(e) => set('status', e.target.value)}
            className={inputCls + ' disabled:opacity-50'}
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
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-white font-sans hover:bg-accent-hover shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 transition-all duration-200"
        >
          <Filter size={15} strokeWidth={1.75} aria-hidden="true" />
          Apply Filters
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-600 font-sans hover:bg-slate-50 hover:border-slate-300/80 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 transition-all duration-200"
        >
          <RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" />
          Reset
        </button>
      </div>
    </div>
  );
}
