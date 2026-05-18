// ============================================================================
// src/pages/inquiry/ProductTab.jsx  —  Inquiry · Product
// ----------------------------------------------------------------------------
// Columns shown:
//   Product ID, Product Name, Description, Equipment Count, Top Manufacturer
//
// The original mock-up had "Manufacturer / Category / Supplier" but those
// columns DO NOT EXIST in cmms_product_mst (P8-D8). We derive
// `top_manufacturer` from the join on cmms_eqip_mst.EQM_MFRID and surface
// `equipment_count` as the most useful adjacent fact.
// ============================================================================

import { useMemo } from 'react';
import { useInquirySearch } from '../../lib/hooks/useInquirySearch.js';
import { fetchInquiryProducts } from '../../lib/api/inquiry.js';
import { DataTable } from '../../components/DataTable.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { InquirySearchBox } from './InquirySearchBox.jsx';

const COLUMNS = [
  { header: 'Product ID',       accessor: 'product_code',
    className: 'font-mono text-xs text-accent' },
  { header: 'Product Name',     accessor: 'name',
    className: 'font-medium text-ink' },
  { header: 'Description',      accessor: 'description',
    className: 'text-ink-soft' },
  { header: 'Equipment Count',  accessor: 'equipment_count',
    className: 'tabular-nums text-ink' },
  { header: 'Top Manufacturer', accessor: 'top_manufacturer',
    className: 'text-ink-soft' },
];

export function ProductTab({ q, onQChange, page, onPageChange, pageSize }) {
  const params = { q, page, page_size: pageSize };
  const { data, error, loading } = useInquirySearch(fetchInquiryProducts, params);

  const items = data?.items ?? [];
  const total = data?.pagination?.total_items ?? 0;
  const totalPages = data?.pagination?.total_pages ?? 1;

  const emptyMessage = useMemo(() => {
    if (loading) return 'Searching…';
    if (q) return `No products match "${q}".`;
    return 'No products to show.';
  }, [loading, q]);

  return (
    <div className="space-y-4">
      <InquirySearchBox
        q={q}
        onQChange={onQChange}
        placeholder="Search by product name or manufacturer..."
      />

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load products: {error.response?.data?.error?.message || error.message}
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
            ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} products`
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
