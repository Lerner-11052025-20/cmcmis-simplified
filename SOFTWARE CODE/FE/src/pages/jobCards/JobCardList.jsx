// ============================================================================
// src/pages/jobCards/JobCardList.jsx  —  /job-cards route
// ----------------------------------------------------------------------------
// Page chrome matches the reference screen:
//
//   Job Cards
//   Track and manage job execution and progress
//
//   ┌────────────────────────────────────────────────────────────────────┐
//   │ [🔍 Search by Job Card ID, Equipment, or Engineer…]  [All Statuses ▼]│
//   │ [⚙ Advanced Filters]  [⬇ Export]      Showing N of M job cards     │
//   └────────────────────────────────────────────────────────────────────┘
//
//   ┌────────────────────────────────────────────────────────────────────┐
//   │ Job Card ID  Job Request ID  Equipment  Assigned Engineer  Status  │
//   │              Start Date  Due Date                                 │
//   │ ...                                                                │
//   └────────────────────────────────────────────────────────────────────┘
//
//   Page X of Y                       [Prev] [1] [2] [3] … [99] [100] [Next]
//
// Slice 1 = read-only list. No "+ New" CTA (cards are spawned by an
// approval transition on the JR side in slice 2).
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Download, Filter, Search as SearchIcon, X } from 'lucide-react';

import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { ModalPortal } from '../../components/ui/ModalPortal.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { StatusPill } from '../../components/StatusPill.jsx';
import { useJobCardList } from '../../lib/hooks/useJobCardList.js';
import { formatJobCategoryType } from '../../lib/jobLaneLabels.js';
import { downloadJobCardsPdf } from '../../lib/api/jobCards.js';
import { fetchEngineers } from '../../lib/api/lookups.js';
import { formatIstDate } from '../../lib/time.js';

const STATUS_OPTIONS = [
  { value: 'ASSIGNED',        label: 'Assigned' },
  { value: 'IN_PROGRESS',     label: 'In Progress' },
  { value: 'COMPLETED',       label: 'Completed' },
  { value: 'VERIFIED_CLOSED', label: 'Verified' },
  { value: 'REOPENED',        label: 'Reopened' },
];
const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
  { value: '-due_date', label: 'Due date latest first' },
  { value: 'due_date', label: 'Due date earliest first' },
  { value: 'card_code', label: 'Job card code A-Z' },
  { value: '-card_code', label: 'Job card code Z-A' },
];

const DEFAULT_PAGE_SIZE = 25;

export function JobCardList() {
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [assignedEngineerId, setAssignedEngineerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('-created_at');
  const [engineers, setEngineers] = useState([]);
  const [engineersLoading, setEngineersLoading] = useState(false);
  const [engineersError, setEngineersError] = useState('');

  // ── PDF Export state ──────────────────────────────────────────────
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartId, setExportStartId] = useState('0');
  const [exportEndId, setExportEndId] = useState('500');
  const [exporting, setExporting] = useState(false);

  // Debounce search input
  const debTimer = useRef(null);
  useEffect(() => {
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 300);
    return () => debTimer.current && clearTimeout(debTimer.current);
  }, [qInput]);

  useEffect(() => {
    if (!isAdvancedOpen || engineers.length > 0) return undefined;

    const ctrl = new AbortController();
    let cancelled = false;

    setEngineersLoading(true);
    setEngineersError('');

    fetchEngineers(ctrl.signal)
      .then((items) => {
        if (cancelled) return;
        setEngineers(Array.isArray(items) ? items : []);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
        setEngineersError(err?.response?.data?.error?.message || err?.message || 'Could not load engineers.');
      })
      .finally(() => {
        if (!cancelled) setEngineersLoading(false);
      });

    return () => { cancelled = true; ctrl.abort(); };
  }, [engineers.length, isAdvancedOpen]);

  function handleResetAdvancedFilters() {
    setAssignedEngineerId('');
    setDateFrom('');
    setDateTo('');
    setSort('-created_at');
    setPage(1);
  }

  async function handleExportPdf() {
    const start = parseInt(exportStartId, 10);
    const end = parseInt(exportEndId, 10);
    if (isNaN(start) || isNaN(end) || start < 0 || end < 0) {
      alert('Please enter valid, non-negative range IDs.');
      return;
    }
    if (start > end) {
      alert('Start ID cannot be greater than End ID.');
      return;
    }

    setExporting(true);
    try {
      const data = await downloadJobCardsPdf(start, end);
      
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `job_cards_${start}_to_${end}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setIsExportModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(
        'Failed to export PDF: ' +
        (err?.response?.data?.error?.message || err?.message || 'Unknown error.')
      );
    } finally {
      setExporting(false);
    }
  }

  const params = useMemo(
    () => ({
      page,
      page_size: DEFAULT_PAGE_SIZE,
      ...(q ? { q } : {}),
      ...(status ? { status } : {}),
      ...(assignedEngineerId ? { assigned_engineer_id: assignedEngineerId } : {}),
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
      sort,
    }),
    [assignedEngineerId, dateFrom, dateTo, page, q, sort, status],
  );

  const { data, error, loading } = useJobCardList(params);

  const columns = useMemo(
    () => [
      {
        header: 'Job Card ID',
        accessor: 'card_code',
        // Phase 9 — the Job Card Detail page lives at /job-cards/:id where
        // :id is the section_job_no (PK, varchar 9 — e.g. "J00024215").
        // Clicking the JC code navigates to the full 13-tab detail page.
        format: (val, row) => (
          <Link
            to={`/job-cards/${encodeURIComponent(row.section_job_no || row.id)}`}
            className="text-accent hover:underline font-medium"
          >
            {val}
          </Link>
        ),
      },
      {
        header: 'Job Request ID',
        accessor: 'job_request_code',
        format: (v) => v || <span className="text-ink-soft">—</span>,
      },
      {
        header: 'Category / Type',
        accessor: formatJobCategoryType,
        format: (v) => v || <span className="text-ink-soft">—</span>,
      },
      { header: 'Equipment', accessor: 'equipment_name', className: 'text-ink' },
      {
        header: 'Assigned Engineer',
        accessor: 'assigned_engineer_name',
        format: (v) => v || <span className="text-ink-soft">Unassigned</span>,
      },
      {
        header: 'Status',
        accessor: 'status',
        format: (v) => <StatusPill status={v} />,
      },
      {
        header: 'Start Date',
        accessor: 'start_date',
        format: (v) => formatIstDate(v, <span className="text-ink-soft">—</span>),
      },
      {
        header: 'Due Date',
        accessor: 'due_date',
        format: (v) => formatIstDate(v, <span className="text-ink-soft">—</span>),
      },
    ],
    [],
  );

  const totalItems = data?.pagination?.total_items ?? 0;
  const shownItems = data?.items?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Page header (NO + CTA — cards are created by approval flow) ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Job Cards</h1>
          <p className="text-sm text-ink-soft mt-1">
            Track and manage job execution and progress
          </p>
        </div>
        <Button
          variant="secondary"
          className="text-accent border-accent hover:bg-accent/10"
          onClick={() => setIsExportModalOpen(true)}
        >
          <Download size={16} strokeWidth={1.75} aria-hidden="true" />
          Export PDF
        </Button>
      </div>

      {/* ── Filter strip ────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-border shadow-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-9">
            <label htmlFor="jc-q" className="sr-only">Search job cards</label>
            <div className="relative">
              <SearchIcon
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
              />
              <Input
                id="jc-q"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Search by Job Card ID, Equipment, or Engineer…"
                className="pl-9"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className={clsx(
                isAdvancedOpen && 'border-accent bg-accent/10 text-accent hover:bg-accent/15',
              )}
              onClick={() => setIsAdvancedOpen((open) => !open)}
              aria-expanded={isAdvancedOpen}
            >
              <Filter size={14} strokeWidth={1.5} aria-hidden="true" />
              Advanced Filters
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsExportModalOpen(true)}
            >
              <Download size={14} strokeWidth={1.5} aria-hidden="true" />
              Export PDF
            </Button>
          </div>
          <div className="text-xs text-ink-soft">
            {loading ? (
              <span>Loading…</span>
            ) : (
              <span>
                Showing <span className="font-medium text-ink">{shownItems}</span>{' '}
                of <span className="font-medium text-ink">{totalItems}</span> job cards
              </span>
            )}
          </div>
        </div>

        {isAdvancedOpen ? (
          <div className="border-t border-border pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <label className="space-y-1 lg:col-span-2">
                <span className="block text-[11px] font-semibold uppercase text-ink-soft">Assigned Engineer</span>
                <Select
                  value={assignedEngineerId}
                  onChange={(e) => { setAssignedEngineerId(e.target.value); setPage(1); }}
                  disabled={engineersLoading}
                  aria-label="Filter by assigned engineer"
                >
                  <option value="">{engineersLoading ? 'Loading engineers...' : 'All Engineers'}</option>
                  {engineers.map((engineer) => (
                    <option key={engineer.id || engineer.employee_id} value={engineer.employee_id}>
                      {engineer.full_name || engineer.employee_id}
                      {engineer.employee_id ? ` (${engineer.employee_id})` : ''}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-1">
                <span className="block text-[11px] font-semibold uppercase text-ink-soft">Scheduled From</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  aria-label="Filter by scheduled from date"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-[11px] font-semibold uppercase text-ink-soft">Scheduled To</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  aria-label="Filter by scheduled to date"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-[11px] font-semibold uppercase text-ink-soft">Sort By</span>
                <Select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(1); }}
                  aria-label="Sort job cards"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-danger">
                {engineersError || null}
              </div>
              <Button variant="ghost" size="sm" onClick={handleResetAdvancedFilters}>
                Reset
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Error banner ───────────────────────────────────── */}
      {error ? (
        <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
          Could not load job cards: {error?.response?.data?.error?.message || error?.message || 'Unknown error.'}
        </div>
      ) : null}

      {/* ── Table ────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyField="id"
        loading={loading}
        emptyMessage={
          q || status
          || assignedEngineerId || dateFrom || dateTo || sort !== '-created_at'
            ? 'No job cards match your filters.'
            : 'No job cards yet.'
        }
      />

      {/* ── Pagination ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-soft">
          Page {data?.pagination?.page ?? 1} of {data?.pagination?.total_pages ?? 1}
        </div>
        <Pagination
          currentPage={data?.pagination?.page ?? 1}
          totalPages={data?.pagination?.total_pages ?? 1}
          onPageChange={setPage}
        />
      </div>

      {/* ── Range Selector Modal ── */}
      {isExportModalOpen ? (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_150ms_ease-out]">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => !exporting && setIsExportModalOpen(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden transform transition-all animate-[scaleUp_150ms_ease-out] z-10">
            {/* Header */}
            <div className="bg-slate-50 border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <Download size={18} className="text-accent" />
                  Export Job Cards PDF
                </h3>
                <p className="text-xs text-ink-soft mt-0.5">
                  Download a high-quality landscape PDF of job card records.
                </p>
              </div>
              <button 
                type="button" 
                className="text-ink-soft hover:text-ink hover:bg-slate-200/60 rounded-full p-1.5 transition"
                onClick={() => !exporting && setIsExportModalOpen(false)}
                disabled={exporting}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block">
                  Select Predefined Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '0 to 500', start: '0', end: '500' },
                    { label: '501 to 1000', start: '501', end: '1000' },
                    { label: '1001 to 1500', start: '1001', end: '1500' },
                    { label: '1501 to 2000', start: '1501', end: '2000' },
                    { label: '2001 to 3000', start: '2001', end: '3000' },
                    { label: '3001 to 5000', start: '3001', end: '5000' },
                  ].map((preset) => {
                    const active = exportStartId === preset.start && exportEndId === preset.end;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        className={clsx(
                          'px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-all',
                          active
                            ? 'bg-accent/10 border-accent text-accent shadow-sm'
                            : 'bg-white border-border text-ink hover:bg-slate-50 hover:border-slate-300'
                        )}
                        onClick={() => {
                          setExportStartId(preset.start);
                          setExportEndId(preset.end);
                        }}
                        disabled={exporting}
                      >
                        ID: {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-4 text-xs font-semibold text-ink-soft uppercase tracking-wider">or</span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              {/* Custom Range Inputs */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block">
                  Custom Job Card ID Range
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] font-semibold text-ink-soft">From ID</span>
                    <Input
                      type="number"
                      min="0"
                      value={exportStartId}
                      onChange={(e) => setExportStartId(e.target.value)}
                      placeholder="e.g. 0"
                      className="h-9 text-sm"
                      disabled={exporting}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] font-semibold text-ink-soft">To ID</span>
                    <Input
                      type="number"
                      min="0"
                      value={exportEndId}
                      onChange={(e) => setExportEndId(e.target.value)}
                      placeholder="e.g. 500"
                      className="h-9 text-sm"
                      disabled={exporting}
                    />
                  </div>
                </div>
              </div>

              {/* Warning or note */}
              <div className="rounded-lg bg-amber-50 border border-amber-200/60 p-3 text-[11px] text-amber-800 leading-relaxed">
                <span className="font-bold">Note:</span> Exporting large ranges may take a few moments as the PDF is generated dynamically with rich styling and layout optimization.
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-border px-6 py-4 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsExportModalOpen(false)}
                disabled={exporting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-accent hover:bg-accent-hover text-white shadow-sm flex items-center gap-2"
                onClick={handleExportPdf}
                disabled={exporting}
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    Download PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
