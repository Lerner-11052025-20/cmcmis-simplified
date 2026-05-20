// ============================================================================
// src/pages/procurement/SparePartFormModal.jsx  —  Add / Edit Spare Part
// ----------------------------------------------------------------------------
// PHASE 13 — Procurement sub-module
//
// Modes:
//   • create (spare == null)
//   • edit   (spare present)
// ============================================================================

import { useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

import { Button } from '../../components/ui/Button.jsx';
import { Input }  from '../../components/ui/Input.jsx';
import { MadeWithLove } from '../../components/MadeWithLove.jsx';
import { useProcurementMutations } from '../../lib/hooks/useProcurement.js';
import { searchVendors } from '../../lib/api/procurement.js';


export function SparePartFormModal({ spare, onClose }) {
  const isEdit = Boolean(spare);
  const { createSpare, editSpare, busy } = useProcurementMutations();

  const [form, setForm] = useState(() => ({
    part_name:        spare?.part_name        || '',
    equipment_ref:    spare?.equipment_ref    || '',
    vendor_id:        spare?.vendor_id        || '',
    vendor_label:     spare?.vendor_label     || '',
    stock_qty:        spare?.stock_qty ?? 0,
    min_stock:        spare?.min_stock ?? 0,
    unit_cost:        spare?.unit_cost ?? '',
    last_ordered_date:spare?.last_ordered_date || '',
    notes:            spare?.notes || '',
  }));
  const [vQuery, setVQuery] = useState('');
  const [vOpts,  setVOpts]  = useState([]);
  const [vOpen,  setVOpen]  = useState(false);
  const [errMsg, setErrMsg] = useState(null);

  useEffect(() => {
    if (!vQuery || vQuery.length < 2) { setVOpts([]); return; }
    const ctrl = new AbortController();
    searchVendors(vQuery, ctrl.signal).then(setVOpts).catch(() => {});
    return () => ctrl.abort();
  }, [vQuery]);

  const onField = (k) => (e) => {
    const v = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setErrMsg(null);
    try {
      const payload = {
        part_name:        form.part_name,
        equipment_ref:    form.equipment_ref || undefined,
        vendor_id:        form.vendor_id || undefined,
        vendor_label:     form.vendor_label || undefined,
        stock_qty:        Number(form.stock_qty) || 0,
        min_stock:        Number(form.min_stock) || 0,
        unit_cost:        form.unit_cost === '' ? undefined : Number(form.unit_cost),
        last_ordered_date:form.last_ordered_date || undefined,
        notes:            form.notes || undefined,
      };
      if (isEdit) {
        await editSpare.mutateAsync({ id: spare.id, body: payload });
      } else {
        await createSpare.mutateAsync(payload);
      }
      onClose();
    } catch (e) {
      setErrMsg(e?.response?.data?.error?.message || e?.message || 'Save failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-lg shadow-xl w-[560px] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-ink">
            {isEdit ? `Edit Spare Part · ${spare.part_code}` : 'Add Spare Part'}
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

        <div className="px-5 py-4 space-y-4">
          <Field label="Part Name">
            <Input value={form.part_name} onChange={onField('part_name')} required maxLength={160} />
          </Field>

          <Field label="Equipment (model / serial / composite id)">
            <Input value={form.equipment_ref} onChange={onField('equipment_ref')} maxLength={80}
                   placeholder="e.g. SA-9000 / EQM-12345" />
          </Field>

          <Field label="Vendor">
            <div className="relative">
              <Input
                value={form.vendor_label || form.vendor_id}
                onChange={(e) => {
                  setForm((f) => ({ ...f, vendor_label: e.target.value }));
                  setVQuery(e.target.value);
                  setVOpen(true);
                }}
                placeholder="Search vendor by name…"
              />
              {vOpen && vOpts.length > 0 ? (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-border rounded-md shadow max-h-56 overflow-y-auto text-sm">
                  {vOpts.map((o) => (
                    <li
                      key={o.id}
                      className="px-3 py-2 hover:bg-base-elev cursor-pointer"
                      onClick={() => {
                        setForm((f) => ({ ...f, vendor_id: String(o.id), vendor_label: o.name }));
                        setVOpen(false);
                      }}
                    >
                      <div className="font-medium text-ink">{o.name}</div>
                      <div className="text-xs text-ink-soft">ID {o.id} · {o.type || ''}</div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Stock Qty">
              <Input type="number" min={0} value={form.stock_qty} onChange={onField('stock_qty')} />
            </Field>
            <Field label="Min Stock">
              <Input type="number" min={0} value={form.min_stock} onChange={onField('min_stock')} />
            </Field>
            <Field label="Unit Cost (₹)">
              <Input type="number" min={0} step="0.01" value={form.unit_cost} onChange={onField('unit_cost')} />
            </Field>
          </div>

          <Field label="Last Ordered Date">
            <Input type="date" value={form.last_ordered_date} onChange={onField('last_ordered_date')} />
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={onField('notes')}
              rows={3}
              maxLength={1000}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-base/50">
          <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>Close</Button>
          <Button variant="primary"   type="submit" disabled={busy}>
            {busy ? 'Saving…' : (isEdit ? 'Save changes' : 'Add Spare Part')}
          </Button>
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
