// ============================================================================
// src/pages/jobRequests/JobRequestList.jsx  —  /job-requests route
// ----------------------------------------------------------------------------
// Page chrome matches the reference screen:
//
//   Job Requests                                       [ + New Job Request ]
//   Manage equipment calibration and maintenance requests
//
//   ┌────────────────────────────────────────────────────────────────────┐
//   │ [🔍 Search…]  [All Types ▼]  [All Statuses ▼]                       │
//   │ [⚙ Advanced Filters]  [⬇ Export]      Showing N of M requests       │
//   └────────────────────────────────────────────────────────────────────┘
//
//   ┌────────────────────────────────────────────────────────────────────┐
//   │ Job ID  Equipment  Type  Division  Submitted By  Date  Status │
//   │ ...                                                                │
//   └────────────────────────────────────────────────────────────────────┘
//
//   Page X of Y                       [Prev] [1] [2] [3] … [99] [100] [Next]
//
// COLUMNS (locked — see spec §LIST PAGE UI SPEC):
//   1. Job ID       → request_code, blue link to /job-requests/:id (Phase 6 Slice 2)
//   2. Equipment    → equipment_name
//   3. Type         → job_type, title-cased
//   4. Division     → division_code
//   5. Submitted By → submitted_by_name
//   6. Date         → submitted_at || created_at, YYYY-MM-DD (BE already formats)
//   7. Status       → StatusPill
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { CheckCircle, Download, Filter, Plus, Search as SearchIcon, X } from 'lucide-react';

import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { ModalPortal } from '../../components/ui/ModalPortal.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { StatusPill } from '../../components/StatusPill.jsx';
import { useJobRequestList } from '../../lib/hooks/useJobRequestList.js';
import { useAuth } from '../../lib/auth-context.jsx';
import { bulkVerifyAllJobRequests, downloadJobRequestsPdf } from '../../lib/api/jobRequests.js';
import { formatJobCategoryType } from '../../lib/jobLaneLabels.js';
import { formatIstTimestamp } from '../../lib/time.js';

// ── Filter dropdown option sets (locked to backend enums) ──────────────
const TYPE_OPTIONS = [
  { value: 'CALIBRATION',  label: 'Calibration' },
  { value: 'REPAIR',       label: 'Repair' },
  { value: 'REGISTRATION', label: 'Registration' },
];
const STATUS_OPTIONS = [
  { value: 'DRAFT',           label: 'Draft' },
  { value: 'SUBMITTED',       label: 'Pending' },
  { value: 'ASSIGNED',        label: 'Approved' },
  { value: 'IN_PROGRESS',     label: 'In Progress' },
  { value: 'COMPLETED',       label: 'Completed' },
  { value: 'VERIFIED_CLOSED', label: 'Verified' },
  { value: 'REJECTED',        label: 'Rejected' },
  { value: 'REOPENED',        label: 'Reopened' },
];

const DEFAULT_PAGE_SIZE = 25;

export function JobRequestList() {
  const { hasPermission } = useAuth();
  const canCreate      = hasPermission('job_request:create');
  const canBulkVerify  = hasPermission('job_request:bulk-verify');

  // ── Filter state ──────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  // ── Bulk-verify state ─────────────────────────────────────────────
  // refreshSeed is bumped after bulk-verify to bust the hook's cache key
  // and force an immediate re-fetch without touching any API params.
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [bulkVerifying, setBulkVerifying] = useState(false);

  // ── PDF Export state ──────────────────────────────────────────────
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartId, setExportStartId] = useState('0');
  const [exportEndId, setExportEndId] = useState('500');
  const [exporting, setExporting] = useState(false);

  // ── Debounce search input by 300ms (R-spec: ONE request per change) ──
  const debTimer = useRef(null);
  useEffect(() => {
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 300);
    return () => debTimer.current && clearTimeout(debTimer.current);
  }, [qInput]);

  // ── Build the hook params (memoised so cache key is stable) ────────
  // _refresh is stripped by the hook before it reaches the API; it only
  // exists to make the JSON cache key unique after a bulk-verify.
  const params = useMemo(
    () => ({
      page,
      page_size: DEFAULT_PAGE_SIZE,
      ...(q ? { q } : {}),
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      sort: '-created_at',
      _refresh: refreshSeed,
    }),
    [page, q, type, status, refreshSeed],
  );

  const { data, error, loading, invalidateAll } = useJobRequestList(params);

  // ── Bulk-verify handler ───────────────────────────────────────────
  async function handleBulkVerify() {
    const ok = window.confirm(
      'This will mark ALL non-verified job requests in the database as VERIFIED.\n\n' +
      'Cancelled requests are left untouched. This action cannot be undone.\n\n' +
      'Proceed?',
    );
    if (!ok) return;

    setBulkVerifying(true);
    try {
      const result = await bulkVerifyAllJobRequests();
      // Clear the hook cache and bump the refresh seed so the table
      // re-fetches with the new statuses immediately.
      invalidateAll();
      setRefreshSeed((s) => s + 1);
      setPage(1);
      alert(`Done — ${result.verified_count} job request(s) marked as Verified.`);
    } catch (err) {
      alert(
        'Bulk verify failed: ' +
        (err?.response?.data?.error?.message || err?.message || 'Unknown error.'),
      );
    } finally {
      setBulkVerifying(false);
    }
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
      const data = await downloadJobRequestsPdf(start, end);
      
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `job_requests_${start}_to_${end}.pdf`;
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

  // ── Columns ──────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        header: 'Job ID',
        accessor: 'request_code',
        format: (val, row) => (
          <Link
            to={`/job-requests/${encodeURIComponent(row.id)}`}
            className="text-accent hover:underline font-medium"
          >
            {val}
          </Link>
        ),
      },
      { header: 'Equipment', accessor: 'equipment_name', className: 'text-ink' },
      {
        header: 'Category / Type',
        accessor: formatJobCategoryType,
        format: (v) => v || <span className="text-ink-soft">—</span>,
      },
      { header: 'Division', accessor: 'division_code', className: 'text-ink uppercase text-xs' },
      { header: 'Submitted By', accessor: 'submitted_by_name' },
      {
        header: 'Date',
        accessor: (row) => row.submitted_at || row.created_at,
        format: (v) => formatIstTimestamp(v, <span className="text-ink-soft">—</span>),
      },
      {
        header: 'Status',
        accessor: 'status',
        format: (v) => <StatusPill status={v} />,
      },
    ],
    [],
  );

  const totalItems = data?.pagination?.total_items ?? 0;
  const shownItems = data?.items?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Job Requests</h1>
          <p className="text-sm text-ink-soft mt-1">
            Manage equipment calibration and maintenance requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Visible only to SUPER_ADMIN — marks all legacy JRs as Verified */}
          {canBulkVerify ? (
            <Button
              variant="secondary"
              className="text-danger border-danger hover:bg-danger/10"
              onClick={handleBulkVerify}
              disabled={bulkVerifying}
            >
              <CheckCircle size={16} strokeWidth={1.75} aria-hidden="true" />
              {bulkVerifying ? 'Verifying…' : 'Verify All Legacy'}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            className="text-accent border-accent hover:bg-accent/10"
            onClick={() => setIsExportModalOpen(true)}
          >
            <Download size={16} strokeWidth={1.75} aria-hidden="true" />
            Export PDF
          </Button>
          {canCreate ? (
            <Link to="/job-requests/new">
              <Button variant="primary">
                <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
                New Job Request
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {/* ── Filter strip ────────────────────────────────────── */}
      <div className="bg-slate-50/60 rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <label htmlFor="jr-q" className="sr-only">Search job requests</label>
            <div className="relative">
              <SearchIcon
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
              />
              <Input
                id="jr-q"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Search by Job ID, Equipment, or Submitted By…"
                className="pl-9"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <Select
              aria-label="Filter by type"
              value={type}
              onChange={(e) => { setType(e.target.value); setPage(1); }}
            >
              <option value="">All Types</option>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
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
              onClick={() => alert('Advanced filters arrive in Phase 6 Slice 2.')}
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
                of <span className="font-medium text-ink">{totalItems}</span> requests
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────── */}
      {error ? (
        <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
          Could not load job requests: {error?.response?.data?.error?.message || error?.message || 'Unknown error.'}
        </div>
      ) : null}

      {/* ── Table ────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyField="id"
        loading={loading}
        emptyMessage={
          q || type || status
            ? 'No job requests match your filters.'
            : 'No job requests yet.'
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
                  Export Job Requests PDF
                </h3>
                <p className="text-xs text-ink-soft mt-0.5">
                  Download a high-quality landscape PDF of job request records.
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
                  Custom Job ID Range
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
