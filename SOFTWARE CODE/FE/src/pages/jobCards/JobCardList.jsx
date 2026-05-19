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
import { Download, Filter, Search as SearchIcon } from 'lucide-react';

import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { StatusPill } from '../../components/StatusPill.jsx';
import { useJobCardList } from '../../lib/hooks/useJobCardList.js';

const STATUS_OPTIONS = [
  { value: 'ASSIGNED',        label: 'Assigned' },
  { value: 'IN_PROGRESS',     label: 'In Progress' },
  { value: 'COMPLETED',       label: 'Completed' },
  { value: 'VERIFIED_CLOSED', label: 'Verified' },
  { value: 'REOPENED',        label: 'Reopened' },
];

const DEFAULT_PAGE_SIZE = 25;

export function JobCardList() {
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

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

  const params = useMemo(
    () => ({
      page,
      page_size: DEFAULT_PAGE_SIZE,
      ...(q ? { q } : {}),
      ...(status ? { status } : {}),
      sort: '-created_at',
    }),
    [page, q, status],
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
        format: (v) => v || <span className="text-ink-soft">—</span>,
      },
      {
        header: 'Due Date',
        accessor: 'due_date',
        format: (v) => v || <span className="text-ink-soft">—</span>,
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
                of <span className="font-medium text-ink">{totalItems}</span> job cards
              </span>
            )}
          </div>
        </div>
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
    </div>
  );
}
