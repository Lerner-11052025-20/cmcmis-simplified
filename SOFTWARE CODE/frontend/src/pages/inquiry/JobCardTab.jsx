// ============================================================================
// src/pages/inquiry/JobCardTab.jsx  —  Inquiry · Job Card Status
// ----------------------------------------------------------------------------
// Columns: Job ID, Equipment, Status (pill), Assigned Engineer, Received,
//          Progress (bar with %).
//
// NORMAL_USER doesn't see this tab — InquiryTabs hides it client-side
// and the BE returns 403. View-Only / Lab Engineer / LIC / Super Admin
// can use it.
// ============================================================================

import { useMemo } from 'react';
import clsx from 'clsx';
import { useInquirySearch } from '../../lib/hooks/useInquirySearch.js';
import { fetchInquiryJobCards } from '../../lib/api/inquiry.js';
import { DataTable } from '../../components/DataTable.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { InquirySearchBox } from './InquirySearchBox.jsx';
import { STATUS_ACCENT_CLASSES } from '../../lib/schemas/inquirySchemas.js';

// ── Status pill (BE supplies the label + accent token) ────────────────
function StatusBadge({ label, accent }) {
  const cls = STATUS_ACCENT_CLASSES[accent] || STATUS_ACCENT_CLASSES.slate;
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      cls,
    )}>
      {label}
    </span>
  );
}

// ── Progress bar cell (0–100%) ────────────────────────────────────────
function ProgressBar({ pct }) {
  const p = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-base-elev overflow-hidden">
        <div
          className="h-full bg-accent transition-[width] duration-300"
          style={{ width: `${p}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-ink-soft w-9 text-right">
        {p}%
      </span>
    </div>
  );
}

// Job ID bumped to text-sm for readability.
// Assigned Engineer removed — in the legacy DB this field is sparse / often null.
const COLUMNS = [
  { header: 'Job ID',         accessor: 'job_code',
    className: 'font-mono text-sm font-semibold text-accent' },
  { header: 'Equipment',      accessor: 'equipment_name',
    className: 'text-ink' },
  { header: 'Status',         accessor: 'status_label',
    format: (_, r) => <StatusBadge label={r.status_label} accent={r.status_accent} /> },
  { header: 'Received',       accessor: 'received_at',
    className: 'text-ink-soft tabular-nums' },
  { header: 'Progress',       accessor: 'progress_pct',
    format: (_, r) => <ProgressBar pct={r.progress_pct} /> },
];

export function JobCardTab({ q, onQChange, page, onPageChange, pageSize }) {
  const params = { q, page, page_size: pageSize };
  const { data, error, loading } = useInquirySearch(fetchInquiryJobCards, params);

  const items = data?.items ?? [];
  const total = data?.pagination?.total_items ?? 0;
  const totalPages = data?.pagination?.total_pages ?? 1;

  const emptyMessage = useMemo(() => {
    if (loading) return 'Searching…';
    if (q) return `No job cards match "${q}".`;
    return 'No job cards to show.';
  }, [loading, q]);

  return (
    <div className="space-y-4">
      <InquirySearchBox
        q={q}
        onQChange={onQChange}
        placeholder="Search by job ID or equipment..."
      />

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load job cards: {error.response?.data?.error?.message || error.message}
        </div>
      ) : null}

      <DataTable
        columns={COLUMNS}
        rows={items}
        keyField="id"
        loading={loading}
        emptyMessage={emptyMessage}
      />

      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-soft">
          {total > 0
            ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} job cards`
            : null}
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
