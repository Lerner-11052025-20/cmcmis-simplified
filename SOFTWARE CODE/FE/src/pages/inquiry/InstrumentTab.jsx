// ============================================================================
// src/pages/inquiry/InstrumentTab.jsx  —  Inquiry · Instrument Lookup
// ----------------------------------------------------------------------------
// Columns: Equipment ID, Name, Division, Location, Status (pill), Last Cal.
// BE-supplied `status_label` + `status_accent` drive the pill colour.
// ============================================================================

import { useMemo, useEffect } from 'react';
import clsx from 'clsx';
import { useInquirySearch } from '../../lib/hooks/useInquirySearch.js';
import { fetchInquiryInstruments } from '../../lib/api/inquiry.js';
import { DataTable } from '../../components/DataTable.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { InquirySearchBox } from './InquirySearchBox.jsx';
import { STATUS_ACCENT_CLASSES } from '../../lib/schemas/inquirySchemas.js';

function StatusBadge({ label, accent }) {
  const cls = STATUS_ACCENT_CLASSES[accent] || STATUS_ACCENT_CLASSES.slate;
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
      cls,
    )}>
      {label}
    </span>
  );
}

// Equipment ID bumped to text-sm for readability.
// Last Calibration removed — most legacy rows have null verified dates.
// Model No + Serial No added — directly useful for instrument identification.
const COLUMNS = [
  { header: 'Equipment ID', accessor: 'equipment_code',
    className: 'font-mono text-sm font-semibold text-accent' },
  { header: 'Name',         accessor: 'name',
    className: 'font-medium text-ink' },
  { header: 'Model No',     accessor: 'model_no',
    format: (val) => val
      ? <span className="text-sm font-medium text-ink whitespace-nowrap">{val}</span>
      : <span className="text-ink-soft">—</span>,
    className: 'min-w-[130px] text-ink' },
  { header: 'Serial No',    accessor: 'serial_no',
    format: (val) => val
      ? <span className="text-sm font-medium text-ink whitespace-nowrap">{val}</span>
      : <span className="text-ink-soft">—</span>,
    className: 'min-w-[130px] text-ink' },
  { header: 'Location',     accessor: 'location_name',
    className: 'text-ink-soft' },
  { header: 'Status',       accessor: 'status_label',
    format: (_, r) => <StatusBadge label={r.status_label} accent={r.status_accent} /> },
];

export function InstrumentTab({ q, onQChange, page, onPageChange, pageSize, onDataLoaded }) {
  const params = { q, page, page_size: pageSize };
  const { data, error, loading } = useInquirySearch(fetchInquiryInstruments, params);

  const items = data?.items ?? [];
  const total = data?.pagination?.total_items ?? 0;
  const totalPages = data?.pagination?.total_pages ?? 1;

  useEffect(() => {
    if (onDataLoaded) {
      onDataLoaded({ total, loading });
    }
  }, [total, loading, onDataLoaded]);

  const emptyMessage = useMemo(() => {
    if (loading) return 'Searching…';
    if (q) return `No instruments match "${q}".`;
    return 'No instruments to show.';
  }, [loading, q]);

  return (
    <div className="space-y-4">
      <InquirySearchBox
        q={q}
        onQChange={onQChange}
        placeholder="Search by equipment ID or name..."
      />

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load instruments: {error.response?.data?.error?.message || error.message}
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
            ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} instruments`
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
