// ============================================================================
// src/pages/procurement/NewPurchaseOrderModal.jsx  —  Create / View PO
// ----------------------------------------------------------------------------
// PHASE 13 — Procurement sub-module
//
// Modes:
//   • create (po == null) — full form with line items
//   • view   (po != null) — read-only line items + header edit (status/notes)
//
// Phase-13 PO line items are IMMUTABLE post-create — keeps total_cost
// provably consistent. The edit path only flips header fields (status,
// notes, warranty, po_date, vendor_label).
//
// TOTAL DOCTRINE
//   Client previews the total via sum(quantity * unit_cost). The server
//   recomputes from the persisted rows on save — never trusts our preview.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, AlertTriangle } from 'lucide-react';

import { Button }  from '../../components/ui/Button.jsx';
import { Input }   from '../../components/ui/Input.jsx';
import { Select }  from '../../components/ui/Select.jsx';
import { MadeWithLove } from '../../components/MadeWithLove.jsx';
import { usePurchaseOrder, useProcurementMutations } from '../../lib/hooks/useProcurement.js';
import { searchVendors } from '../../lib/api/procurement.js';

const STATUSES = ['ACTIVE', 'COMPLETED', 'EXPIRED'];
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

function todayIso() { return new Date().toISOString().slice(0, 10); }


export function NewPurchaseOrderModal({ po, onClose }) {
  const isEdit = Boolean(po);
  const { createPo, editPo, busy } = useProcurementMutations();

  // For edit mode, fetch the full PO with line items so we can render them.
  const { po: full, loading } = usePurchaseOrder(isEdit ? po.id : null);

  // ── Form state ─────────────────────────────────────────────────────
  const [header, setHeader] = useState({
    vendor_id:       '',
    vendor_label:    '',
    po_date:         todayIso(),
    warranty_months: '',
    status:          'ACTIVE',
    notes:           '',
  });
  const [items, setItems] = useState([
    { item_name: '', quantity: 1, unit_cost: 0 },
  ]);
  const [vQuery, setVQuery] = useState('');
  const [vOpts,  setVOpts]  = useState([]);
  const [vOpen,  setVOpen]  = useState(false);
  const [errMsg, setErrMsg] = useState(null);

  // Hydrate when entering edit mode.
  useEffect(() => {
    if (!isEdit || !full) return;
    setHeader({
      vendor_id:       full.vendor_id || '',
      vendor_label:    full.vendor_label || '',
      po_date:         full.po_date || todayIso(),
      warranty_months: full.warranty_months ?? '',
      status:          full.status || 'ACTIVE',
      notes:           full.notes || '',
    });
    setItems((full.items_list || []).map((i) => ({
      item_name: i.item_name,
      quantity:  i.quantity,
      unit_cost: i.unit_cost,
      _readonly: true,         // line items are not editable in Phase 13
    })));
  }, [isEdit, full]);

  // Vendor typeahead.
  useEffect(() => {
    if (!vQuery || vQuery.length < 2) { setVOpts([]); return; }
    const ctrl = new AbortController();
    searchVendors(vQuery, ctrl.signal).then(setVOpts).catch(() => {});
    return () => ctrl.abort();
  }, [vQuery]);

  const total = useMemo(
    () => items.reduce((s, it) => s + (Number(it.quantity || 0) * Number(it.unit_cost || 0)), 0),
    [items],
  );

  // ── Handlers ───────────────────────────────────────────────────────
  const setItem = (idx, key, val) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it));
  };
  const addItem = () => setItems((prev) => [...prev, { item_name: '', quantity: 1, unit_cost: 0 }]);
  const delItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setErrMsg(null);
    try {
      if (isEdit) {
        // PATCH header only — Phase 13 line items are frozen.
        await editPo.mutateAsync({
          id: po.id,
          body: {
            vendor_label:    header.vendor_label || undefined,
            po_date:         header.po_date,
            warranty_months: header.warranty_months === '' ? null : Number(header.warranty_months),
            status:          header.status,
            notes:           header.notes || undefined,
          },
        });
      } else {
        if (!header.vendor_id) { setErrMsg('Pick a vendor before saving'); return; }
        const cleanItems = items
          .filter((it) => it.item_name && Number(it.quantity) > 0)
          .map((it) => ({
            item_name: it.item_name,
            quantity:  Number(it.quantity),
            unit_cost: Number(it.unit_cost),
          }));
        if (cleanItems.length === 0) { setErrMsg('Add at least one line item'); return; }
        await createPo.mutateAsync({
          vendor_id:       header.vendor_id,
          vendor_label:    header.vendor_label || undefined,
          po_date:         header.po_date,
          warranty_months: header.warranty_months === '' ? null : Number(header.warranty_months),
          status:          header.status,
          notes:           header.notes || undefined,
          items:           cleanItems,
        });
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
        className="bg-white rounded-lg shadow-xl w-[760px] max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-ink">
            {isEdit ? `Purchase Order · ${po.po_number || full?.po_number || ''}` : 'New Purchase Order'}
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
        {isEdit && loading ? (
          <div className="px-5 py-3 text-sm text-ink-soft">Loading…</div>
        ) : null}

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vendor">
              <div className="relative">
                <Input
                  value={header.vendor_label || header.vendor_id}
                  onChange={(e) => {
                    setHeader((h) => ({ ...h, vendor_label: e.target.value }));
                    setVQuery(e.target.value);
                    setVOpen(true);
                  }}
                  disabled={isEdit}      // vendor frozen post-create
                  placeholder="Search vendor by name…"
                />
                {vOpen && vOpts.length > 0 ? (
                  <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-border rounded-md shadow max-h-56 overflow-y-auto text-sm">
                    {vOpts.map((o) => (
                      <li
                        key={o.id}
                        className="px-3 py-2 hover:bg-base-elev cursor-pointer"
                        onClick={() => {
                          setHeader((h) => ({ ...h, vendor_id: String(o.id), vendor_label: o.name }));
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
            <Field label="PO Date">
              <Input
                type="date"
                value={header.po_date}
                onChange={(e) => setHeader((h) => ({ ...h, po_date: e.target.value }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Warranty (months)">
              <Input
                type="number"
                min={0} max={1200}
                value={header.warranty_months}
                onChange={(e) => setHeader((h) => ({ ...h, warranty_months: e.target.value }))}
              />
            </Field>
            <Field label="Status">
              <Select
                value={header.status}
                onChange={(e) => setHeader((h) => ({ ...h, status: e.target.value }))}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Total (preview)">
              <div className="px-3 py-2 rounded-md border border-border bg-base text-sm font-semibold">
                {inr.format(total)}
              </div>
            </Field>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-ink">Line Items</h3>
              {!isEdit ? (
                <Button variant="secondary" size="sm" type="button" onClick={addItem}>
                  <Plus size={14} strokeWidth={1.5} />
                  Add row
                </Button>
              ) : null}
            </div>
            <div className="border border-border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-base/50 text-ink-soft text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Item / Description</th>
                    <th className="px-3 py-2 text-right w-24">Qty</th>
                    <th className="px-3 py-2 text-right w-32">Unit Cost</th>
                    <th className="px-3 py-2 text-right w-36">Line Total</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const line = Number(it.quantity || 0) * Number(it.unit_cost || 0);
                    const ro = isEdit || it._readonly;
                    return (
                      <tr key={idx} className="border-t border-border">
                        <td className="px-3 py-2">
                          <Input
                            value={it.item_name}
                            onChange={(e) => setItem(idx, 'item_name', e.target.value)}
                            disabled={ro}
                            placeholder="e.g. Spectrum Probe Kit"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number" min={1}
                            value={it.quantity}
                            onChange={(e) => setItem(idx, 'quantity', e.target.value)}
                            disabled={ro}
                            className="text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number" min={0} step="0.01"
                            value={it.unit_cost}
                            onChange={(e) => setItem(idx, 'unit_cost', e.target.value)}
                            disabled={ro}
                            className="text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{inr.format(line)}</td>
                        <td className="px-3 py-2 text-right">
                          {!ro && items.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => delItem(idx)}
                              className="text-ink-soft hover:text-danger"
                              aria-label="Remove row"
                            >
                              <Trash2 size={14} strokeWidth={1.75} />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {isEdit ? (
              <div className="text-[11px] text-ink-soft mt-2">
                Line items are immutable once a PO is created (Phase 13). To change line items, create a new PO.
              </div>
            ) : null}
          </div>

          <Field label="Notes">
            <textarea
              value={header.notes}
              onChange={(e) => setHeader((h) => ({ ...h, notes: e.target.value }))}
              rows={3}
              maxLength={1000}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-base/50">
          <span className="text-xs text-ink-soft">
            Total (server-computed): <span className="font-semibold text-ink">{inr.format(total)}</span>
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>Close</Button>
            <Button variant="primary"   type="submit" disabled={busy}>
              {busy ? 'Saving…' : (isEdit ? 'Save changes' : 'Create PO')}
            </Button>
          </div>
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
