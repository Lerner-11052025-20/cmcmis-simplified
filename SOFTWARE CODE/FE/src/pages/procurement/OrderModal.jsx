// ============================================================================
// src/pages/procurement/OrderModal.jsx  —  "Order" action on a spare
// ----------------------------------------------------------------------------
// PHASE 13 — Procurement sub-module
//
// Triggers POST /spare-parts/:id/order. The BE either:
//   • Appends a line item to an ACTIVE PO from the same vendor today, OR
//   • Creates a new PO and adds the line item.
// Either way, the spare's last_ordered_date stamps to today and the PO
// total_cost is server-recomputed.
// ============================================================================

import { useState } from 'react';
import { X, AlertTriangle, ShoppingCart, CheckCircle2 } from 'lucide-react';

import { Button } from '../../components/ui/Button.jsx';
import { Input }  from '../../components/ui/Input.jsx';
import { MadeWithLove } from '../../components/MadeWithLove.jsx';
import { useProcurementMutations } from '../../lib/hooks/useProcurement.js';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });


export function OrderModal({ spare, onClose }) {
  const { orderSpare, busy } = useProcurementMutations();
  const [form, setForm] = useState({
    quantity:        1,
    unit_cost:       spare.unit_cost ?? '',
    warranty_months: '',
    notes:           '',
  });
  const [errMsg, setErrMsg] = useState(null);
  const [result, setResult] = useState(null);

  const onField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setErrMsg(null);
    try {
      const r = await orderSpare.mutateAsync({
        id:   spare.id,
        body: {
          quantity:        Number(form.quantity),
          unit_cost:       form.unit_cost === '' ? null : Number(form.unit_cost),
          warranty_months: form.warranty_months === '' ? null : Number(form.warranty_months),
          notes:           form.notes || undefined,
        },
      });
      setResult(r);
    } catch (e) {
      setErrMsg(e?.response?.data?.error?.message || e?.message || 'Order failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-xl w-[500px]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-ink inline-flex items-center gap-2">
            <ShoppingCart size={18} strokeWidth={1.75} />
            Order Spare
          </h2>
          <button type="button" onClick={onClose} className="text-ink-soft hover:text-ink">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {errMsg ? (
          <div className="mx-5 mt-4 flex gap-2 items-start rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
            <AlertTriangle size={14} className="mt-0.5" />
            <span>{errMsg}</span>
          </div>
        ) : null}

        {result ? (
          <div className="m-5 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-3 text-sm flex gap-2 items-start">
            <CheckCircle2 size={18} className="text-emerald-600 mt-0.5" />
            <div>
              <div className="font-semibold text-emerald-900">
                {result.created_new ? 'Created PO' : 'Appended to PO'} {result.po_number}
              </div>
              <div className="text-emerald-800">
                New PO total: {inr.format(Number(result.total_cost) || 0)}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            <div className="text-sm">
              <div><span className="text-ink-soft">Part:</span> <span className="font-medium">{spare.part_code} · {spare.part_name}</span></div>
              <div><span className="text-ink-soft">Vendor:</span> <span className="font-medium">{spare.vendor_label || `#${spare.vendor_id}`}</span></div>
              <div><span className="text-ink-soft">Current stock:</span> <span className="font-medium">{spare.stock_qty}</span> (min {spare.min_stock})</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity">
                <Input type="number" min={1} value={form.quantity} onChange={onField('quantity')} required />
              </Field>
              <Field label="Unit Cost (override)">
                <Input
                  type="number" min={0} step="0.01"
                  value={form.unit_cost}
                  onChange={onField('unit_cost')}
                  placeholder="Default = part's unit cost"
                />
              </Field>
            </div>

            <Field label="Warranty (months, optional)">
              <Input type="number" min={0} value={form.warranty_months} onChange={onField('warranty_months')} />
            </Field>

            <Field label="Notes">
              <Input value={form.notes} onChange={onField('notes')} placeholder="Internal note for this order" />
            </Field>

            <div className="text-[11px] text-ink-soft">
              We will either append this to an existing ACTIVE PO from the same vendor today,
              or create a new PO. Either way, the spare's "Last Ordered" date will be updated.
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-base/50">
          <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result ? (
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? 'Ordering…' : 'Place Order'}
            </Button>
          ) : null}
        </div>

        {/* Authorship credit — bottom of every modal. */}
        <MadeWithLove size="sm" />
      </form>
    </div>
  );
}


function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-soft mb-1">{label}</label>
      {children}
    </div>
  );
}
