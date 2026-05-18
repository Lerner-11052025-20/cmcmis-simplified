// ============================================================================
// src/pages/inquiry/VendorTab.jsx  —  Inquiry · Vendor
// ----------------------------------------------------------------------------
// Search by name / contact-person / email + optional Type filter. The
// hook handles debounce + cancel; this file is mostly presentation.
// ============================================================================

import { useMemo } from 'react';
import { useInquirySearch } from '../../lib/hooks/useInquirySearch.js';
import { fetchInquiryVendors } from '../../lib/api/inquiry.js';
import { DataTable } from '../../components/DataTable.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { InquirySearchBox } from './InquirySearchBox.jsx';

const COLUMNS = [
  { header: 'Vendor ID', accessor: 'vendor_code',
    className: 'font-mono text-xs text-accent' },
  { header: 'Name',           accessor: 'name',
    className: 'font-medium text-ink' },
  { header: 'Type',           accessor: 'type' },
  { header: 'Contact',        accessor: 'contact' },
  { header: 'Email',          accessor: 'email',
    className: 'text-accent' },
  { header: 'Address',        accessor: 'address',
    className: 'text-ink-soft' },
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
 */
export function VendorTab({ q, onQChange, type, onTypeChange, page, onPageChange, pageSize }) {
  // The params object is what `useInquirySearch` keys its effect on —
  // a `useMemo` on the JSON-stringified form would re-key unnecessarily.
  // The hook does its own JSON.stringify dedupe.
  const params = { q, type, page, page_size: pageSize };
  const { data, error, loading } = useInquirySearch(fetchInquiryVendors, params);

  const items = data?.items ?? [];
  const total = data?.pagination?.total_items ?? 0;
  const totalPages = data?.pagination?.total_pages ?? 1;

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
