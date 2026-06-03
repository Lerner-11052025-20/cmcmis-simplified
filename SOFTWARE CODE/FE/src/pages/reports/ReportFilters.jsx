import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, RotateCcw, SlidersHorizontal } from 'lucide-react';

import { fetchDivisions } from '../../lib/api/lookups.js';

function getDivisionId(division) {
  return division.division_id ?? division.id ?? division.SM_ID ?? division.sm_id;
}

function getDivisionLabel(division) {
  const code = division.code ?? division.division_code ?? division.SM_SHORTNAME ?? division.short_name;
  const name = division.name ?? division.division_name ?? division.SM_NAME ?? division.long_name;
  if (code && name) return `${code} - ${name}`;
  return code || name || `Division ${getDivisionId(division)}`;
}

export function ReportFilters({ value, onChange, reportKey, statusEnum, disabled }) {
  const [local, setLocal] = useState(value);

  useEffect(() => { setLocal(value); }, [value]);

  const divQ = useQuery({
    queryKey: ['lookups', 'divisions'],
    queryFn: ({ signal }) => fetchDivisions(signal),
    staleTime: 60 * 60 * 1000,
  });

  const divisions = useMemo(
    () => (divQ.data || []).map((division) => ({
      id: getDivisionId(division),
      label: getDivisionLabel(division),
    })).filter((division) => division.id !== undefined && division.id !== null && division.id !== ''),
    [divQ.data],
  );

  function set(key, val) {
    setLocal((prev) => ({ ...prev, [key]: val }));
  }

  function apply() {
    onChange?.(local);
  }

  function reset() {
    const empty = {
      dateFrom: '',
      dateTo: '',
      divisionId: '',
      status: '',
      dueSoonDays: '',
      unassigned: false,
    };
    setLocal(empty);
    onChange?.(empty);
  }

  const showDueSoon = reportKey === 'calibrationDue';
  const showUnassigned = reportKey === 'pendingJobs';
  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-slate-400';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.035)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <SlidersHorizontal size={18} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Report Filters</h3>
            <p className="text-xs text-slate-500">Use date-only filters and exact database-backed report fields.</p>
          </div>
        </div>
        {divQ.isError ? (
          <span className="text-xs font-medium text-rose-600">Division list could not be loaded.</span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1.5">
          <span className={labelCls}>Date From</span>
          <input
            type="date"
            value={local.dateFrom || ''}
            disabled={disabled}
            onChange={(e) => set('dateFrom', e.target.value)}
            className={inputCls}
          />
        </label>

        <label className="space-y-1.5">
          <span className={labelCls}>Date To</span>
          <input
            type="date"
            value={local.dateTo || ''}
            disabled={disabled}
            onChange={(e) => set('dateTo', e.target.value)}
            className={inputCls}
          />
        </label>

        <label className="space-y-1.5">
          <span className={labelCls}>Division</span>
          <select
            value={local.divisionId || ''}
            disabled={disabled || divQ.isLoading}
            onChange={(e) => set('divisionId', e.target.value ? Number(e.target.value) : '')}
            className={inputCls}
          >
            <option value="">All Divisions</option>
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className={labelCls}>Status</span>
          <select
            value={local.status || ''}
            disabled={disabled || !statusEnum}
            onChange={(e) => set('status', e.target.value)}
            className={inputCls}
          >
            <option value="">All Statuses</option>
            {(statusEnum || []).map((status) => (
              <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
            ))}
          </select>
        </label>

        {showDueSoon ? (
          <label className="space-y-1.5">
            <span className={labelCls}>Due Soon Days</span>
            <input
              type="number"
              min="1"
              max="365"
              value={local.dueSoonDays || ''}
              disabled={disabled}
              onChange={(e) => set('dueSoonDays', e.target.value)}
              placeholder="Default 30"
              className={inputCls}
            />
          </label>
        ) : null}

        {showUnassigned ? (
          <label className="flex min-h-[68px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <input
              type="checkbox"
              checked={Boolean(local.unassigned)}
              disabled={disabled}
              onChange={(e) => set('unassigned', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">Unassigned only</span>
              <span className="block text-xs text-slate-500">Show requests without an engineer.</span>
            </span>
          </label>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={apply}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Filter size={16} strokeWidth={1.8} aria-hidden="true" />
          Apply Filters
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" />
          Reset
        </button>
      </div>
    </section>
  );
}
