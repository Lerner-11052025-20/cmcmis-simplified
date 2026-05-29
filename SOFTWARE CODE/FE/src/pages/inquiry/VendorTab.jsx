// ============================================================================
// src/pages/inquiry/VendorTab.jsx  —  Inquiry · Vendor
// ----------------------------------------------------------------------------
// Search by name / contact-person / email + optional Type filter. The
// hook handles debounce + cancel; this file is mostly presentation.
// ============================================================================

import { useMemo, useEffect } from 'react';
import { useInquirySearch } from '../../lib/hooks/useInquirySearch.js';
import { fetchInquiryVendors } from '../../lib/api/inquiry.js';
import { DataTable } from '../../components/DataTable.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { InquirySearchBox } from './InquirySearchBox.jsx';

// Vendor ID font bumped to text-sm so the V-001 codes are readable at a glance.
// Contact / Email / Address removed — the DB only stores them sparsely (mostly null).
// Contact Person is the name of the human contact at the vendor — more useful.
const COLUMNS = [
  { header: 'Vendor ID',      accessor: 'vendor_code',
    className: 'font-mono text-sm font-semibold text-accent' },
  { header: 'Name',           accessor: 'name',
    className: 'font-medium text-ink' },
  { header: 'Type',           accessor: 'type' },
  { header: 'Contact Person', accessor: 'contact_person',
    format: (val) => val || <span className="text-ink-soft">—</span>,
    className: 'text-ink' },
];

/**
 * @param {Object} props
 * @param {string}                     props.q
 * @param {(q: string) => void}        props.onQChange
 * @param {string | undefined}         props.type
 * @param {(t: string|undefined)=>void}props.onTypeChange
 * @param {number}                     props.page
 * @param {(p: number)=>void}          props.onPageChange
 * @param {number}                     props.pageSize
 * @param {(meta: { total: number, loading: boolean }) => void} props.onDataLoaded
 */
export function VendorTab({ q, onQChange, type, onTypeChange, page, onPageChange, pageSize, onDataLoaded }) {
  // The params object is what `useInquirySearch` keys its effect on —
  // a `useMemo` on the JSON-stringified form would re-key unnecessarily.
  // The hook does its own JSON.stringify dedupe.
  const params = { q, type, page, page_size: pageSize };
  const { data, error, loading } = useInquirySearch(fetchInquiryVendors, params);

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
    if (q) return `No vendors match "${q}".`;
    return 'No vendors to show.';
  }, [loading, q]);

  return (
    <div className="space-y-4">
      <InquirySearchBox
        q={q}
        onQChange={onQChange}
        placeholder="Search by vendor name, contact, or email..."
        showTypeFilter
        type={type}
        onTypeChange={onTypeChange}
      />

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load vendors: {error.response?.data?.error?.message || error.message}
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
            ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} vendors`
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
