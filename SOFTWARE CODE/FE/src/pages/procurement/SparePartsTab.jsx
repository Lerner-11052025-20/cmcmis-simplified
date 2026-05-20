// ============================================================================
// src/pages/procurement/SparePartsTab.jsx
// ----------------------------------------------------------------------------
// PHASE 13 — Procurement sub-module
//
// Image ref: spare parts tab shows
//   Part ID · Part Name · Equipment · Vendor · Stock · Min Stock · Unit Cost
//   · Last Ordered · Actions (Order)
// Low stock (stock_qty <= min_stock) renders the Stock cell in danger color.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Filter, Search as SearchIcon, ShoppingCart } from 'lucide-react';

import { Button }    from '../../components/ui/Button.jsx';
import { Input }     from '../../components/ui/Input.jsx';
import { Checkbox }  from '../../components/ui/Checkbox.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { useSpareParts } from '../../lib/hooks/useProcurement.js';
import { useAuth }   from '../../lib/auth-context.jsx';
import { downloadSparePartsCsv } from '../../lib/api/procurement.js';
import { OrderModal } from './OrderModal.jsx';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
});


export function SparePartsTab({ onEdit }) {
  const { hasPermission } = useAuth();
  const canExport = hasPermission('procurement:export');
  const canOrder  = hasPermission('procurement:order');

  const [qInput, setQInput] = useState('');
  const [q, setQ]           = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [lowStock, setLowStock]     = useState(false);
  const [vendor, setVendor]         = useState('');
  const [orderingSpare, setOrderingSpare] = useState(null);

  const t = useRef(null);
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setQ(qInput.trim()), 300);
    return () => t.current && clearTimeout(t.current);
  }, [qInput]);

  const params = useMemo(() => ({
    ...(q ? { q } : {}),
    ...(lowStock ? { low_stock: 1 } : {}),
    ...(vendor   ? { vendor } : {}),
    page: 1, page_size: 100,
  }), [q, lowStock, vendor]);

  const { items, loading, error } = useSpareParts(params);

  const columns = useMemo(() => [
    {
      header: 'Part ID',
      accessor: 'part_code',
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
    { header: 'Part Name',  accessor: 'part_name', className: 'text-ink' },
    {
      header: 'Equipment',
      accessor: 'equipment_ref',
      format: (val) => val || <span className="text-ink-soft">—</span>,
    },
    {
      header: 'Vendor',
      accessor: 'vendor_label',
      format: (val) => val || <span className="text-ink-soft">—</span>,
    },
    {
      header: 'Stock',
      accessor: 'stock_qty',
      format: (val, row) => (
        <span className={row.low_stock ? 'text-danger font-semibold' : 'font-semibold text-ink'}>
          {val}
        </span>
      ),
    },
    { header: 'Min Stock', accessor: 'min_stock' },
    {
      header: 'Unit Cost',
      accessor: 'unit_cost',
      format: (val) => val != null ? inr.format(Number(val)) : <span className="text-ink-soft">—</span>,
    },
    {
      header: 'Last Ordered',
      accessor: 'last_ordered_date',
      format: (val) => val || <span className="text-ink-soft">—</span>,
    },
    {
      header: 'Actions',
      accessor: 'id',
      format: (_v, row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit && onEdit(row)}
            className="text-accent hover:underline text-sm"
          >
            Edit
          </button>
          {canOrder ? (
            <button
              type="button"
              onClick={() => setOrderingSpare(row)}
              disabled={!row.vendor_id}
              title={row.vendor_id ? 'Order from vendor' : 'Set a vendor before ordering'}
              className="inline-flex items-center gap-1 text-accent hover:underline text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={14} strokeWidth={1.75} />
              Order
            </button>
          ) : null}
        </div>
      ),
    },
  ], [onEdit, canOrder]);

  return (
    <div className="space-y-4">
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
              placeholder="Search by ID, Name, or Equipment…"
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
                onClick={() => downloadSparePartsCsv(params)}
              >
                <Download size={14} strokeWidth={1.5} aria-hidden="true" />
                Export
              </Button>
            ) : null}
          </div>
        </div>
        {showFilter ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-border">
            <div className="md:col-span-3 flex items-center gap-2">
              <Checkbox checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} />
              <span className="text-sm">Low stock only</span>
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
          Could not load spare parts.
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={items}
        keyField="id"
        loading={loading}
        emptyMessage="No spare parts yet."
      />

      {orderingSpare ? (
        <OrderModal spare={orderingSpare} onClose={() => setOrderingSpare(null)} />
      ) : null}
    </div>
  );
}
