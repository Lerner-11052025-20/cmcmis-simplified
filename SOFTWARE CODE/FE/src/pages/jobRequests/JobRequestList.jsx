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
//   │ Job ID  Equipment  Type  Division  Submitted By  Date  Priority  Status │
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
//   7. Priority     → coloured PriorityLabel
//   8. Status       → StatusPill
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Download, Filter, Plus, Search as SearchIcon } from 'lucide-react';

import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { StatusPill } from '../../components/StatusPill.jsx';
import { PriorityLabel } from '../../components/PriorityLabel.jsx';
import { useJobRequestList } from '../../lib/hooks/useJobRequestList.js';
import { useAuth } from '../../lib/auth-context.jsx';
import { bulkVerifyAllJobRequests } from '../../lib/api/jobRequests.js';

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

const JOB_TYPE_DISPLAY = {
  CALIBRATION: 'Calibration',
  REPAIR: 'Repair',
  REGISTRATION: 'Registration',
};

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
        header: 'Type',
        accessor: 'job_type',
        format: (v) => JOB_TYPE_DISPLAY[v] || (v ? v.toLowerCase() : '—'),
      },
      { header: 'Division', accessor: 'division_code', className: 'text-ink uppercase text-xs' },
      { header: 'Submitted By', accessor: 'submitted_by_name' },
      {
        header: 'Date',
        accessor: (row) => row.submitted_at || row.created_at,
        format: (v) => v || <span className="text-ink-soft">—</span>,
      },
      {
        header: 'Priority',
        accessor: 'priority',
        format: (v) => <PriorityLabel priority={v} />,
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
      <div className="bg-white rounded-lg border border-border shadow-card p-4 space-y-3">
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
              onClick={() => alert('Export will be available in Phase 7.')}
            >
              <Download size={14} strokeWidth={1.5} aria-hidden="true" />
              Export
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
    </div>
  );
}
