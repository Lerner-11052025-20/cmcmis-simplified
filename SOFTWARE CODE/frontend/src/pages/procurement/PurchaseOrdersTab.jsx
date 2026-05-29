// ============================================================================
// src/pages/procurement/PurchaseOrdersTab.jsx
// ----------------------------------------------------------------------------
// PHASE 13 — Procurement sub-module
//
// Image ref: PO tab shows
//   PO Number · Vendor · PO Date · Total Cost · Warranty · Items · Status · Actions
// Search box (by PO No / Vendor), Filter button, Export button.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Filter, Search as SearchIcon } from 'lucide-react';

import { Button }    from '../../components/ui/Button.jsx';
import { Input }     from '../../components/ui/Input.jsx';
import { Select }    from '../../components/ui/Select.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { usePurchaseOrders } from '../../lib/hooks/useProcurement.js';
import { useAuth }   from '../../lib/auth-context.jsx';
import { downloadPurchaseOrdersCsv } from '../../lib/api/procurement.js';

// Indian-grouping currency formatter — 1234567 → ₹12,34,567.
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
});

const STATUS_STYLES = {
  ACTIVE:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  COMPLETED: 'bg-blue-50 text-blue-700 border border-blue-200',
  EXPIRED:   'bg-base-elev text-ink-soft border border-border',
};


export function PurchaseOrdersTab({ onEdit }) {
  const { hasPermission } = useAuth();
  const canExport = hasPermission('procurement:export');

  const [qInput, setQInput] = useState('');
  const [q, setQ]           = useState('');
  const [status, setStatus] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [vendor, setVendor] = useState('');

  // Debounce search input.
  const t = useRef(null);
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setQ(qInput.trim()), 300);
    return () => t.current && clearTimeout(t.current);
  }, [qInput]);

  const params = useMemo(() => ({
    ...(q       ? { q }       : {}),
    ...(status  ? { status }  : {}),
    ...(vendor  ? { vendor }  : {}),
    page: 1, page_size: 100,
  }), [q, status, vendor]);

  const { items, loading, error } = usePurchaseOrders(params);

  const columns = useMemo(() => [
    {
      header: 'PO Number',
      accessor: 'po_number',
      format: (val, row) => (
        <button
          type="button"
          onClick={() => onEdit && onEdit(row)}
          className="text-accent hover:underline font-medium"
        >
          {val}
        </button>
      ),
    },
    { header: 'Vendor',          accessor: 'vendor_label', className: 'text-ink' },
    { header: 'PO Date',         accessor: 'po_date' },
    {
      header: 'Total Cost',
      accessor: 'total_cost',
      format: (val) => <span className="font-semibold">{inr.format(Number(val) || 0)}</span>,
    },
    {
      header: 'Warranty',
      accessor: 'warranty_months',
      format: (val) => val != null ? `${val} months` : <span className="text-ink-soft">—</span>,
    },
    { header: 'Items', accessor: 'items' },
    {
      header: 'Status',
      accessor: 'status',
      format: (val) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[val] || ''}`}>
          {val.charAt(0) + val.slice(1).toLowerCase()}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      format: (_v, row) => (
        <button type="button" onClick={() => onEdit && onEdit(row)} className="text-accent hover:underline text-sm">
          View
        </button>
      ),
    },
  ], [onEdit]);

  return (
    <div className="space-y-4">
      {/* Filter strip */}
      <div className="bg-white rounded-lg border border-border shadow-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-9 relative">
            <SearchIcon
              size={16} strokeWidth={1.5} aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
            />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search by PO No. or Vendor…"
              className="pl-9"
            />
          </div>
          <div className="md:col-span-3 flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowFilter((s) => !s)}>
              <Filter size={14} strokeWidth={1.5} aria-hidden="true" />
              Filter
            </Button>
            {canExport ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => downloadPurchaseOrdersCsv(params)}
              >
                <Download size={14} strokeWidth={1.5} aria-hidden="true" />
                Export
              </Button>
            ) : null}
          </div>
        </div>
        {showFilter ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-border">
            <div className="md:col-span-3">
              <label className="text-xs text-ink-soft">Status</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="EXPIRED">Expired</option>
              </Select>
            </div>
            <div className="md:col-span-4">
              <label className="text-xs text-ink-soft">Vendor ID</label>
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. 123" />
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
          Could not load purchase orders.
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={items}
        keyField="id"
        loading={loading}
        emptyMessage="No purchase orders yet."
      />
    </div>
  );
}
