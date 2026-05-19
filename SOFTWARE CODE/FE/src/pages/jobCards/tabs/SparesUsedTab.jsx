// ============================================================================
// pages/jobCards/tabs/SparesUsedTab.jsx
// ----------------------------------------------------------------------------
// Tab 7 — Spares Used. Multi-row CRUD against jc_spares_used.
//
// Layout (image 4): Sr · Spare Type · Source [dropdown] · Part No · Part Desc ·
// Quantity · Cost (Rs.) · Action. Inline edit-on-blur. Hard-delete.
// ============================================================================

import { useEffect, useState } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { useSparesRows, invalidateSparesRows } from '../../../lib/hooks/useSparesRows.js';
import { SPARE_SOURCE_OPTIONS } from '../../../lib/schemas/jobCardSchemas.js';
import {
  addSpareRow, patchSpareRow, deleteSpareRow,
} from '../../../lib/api/jobCards.js';

const SOURCE_LABELS = {
  CASH_PURCHASE: 'Cash Purchase',
  VENDOR:        'Vendor',
  STOCK:         'Stock',
  WARRANTY:      'Warranty',
  OTHER:         'Other',
};

function emptyDraft(server) {
  return {
    spare_type:       server?.spare_type || '',
    source:           server?.source || 'CASH_PURCHASE',
    part_no:          server?.part_no || '',
    part_description: server?.part_description || '',
    quantity:         server?.quantity == null ? '' : String(server.quantity),
    cost:             server?.cost == null ? '' : String(server.cost),
    _dirty: false,
  };
}

export function SparesUsedTab({ jc, canWrite }) {
  const { items: rows, loading, refetch } = useSparesRows(jc.section_job_no);
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    if (!rows) return;
    setDrafts((prev) => {
      const next = {};
      for (const r of rows) {
        const existing = prev[r.id];
        if (existing && existing._dirty) next[r.id] = existing;
        else next[r.id] = emptyDraft(r);
      }
      return next;
    });
  }, [rows]);

  const [busyRow, setBusyRow] = useState(null);
  const [error, setError] = useState(null);

  async function handleAddRow() {
    setError(null);
    try {
      // Spares row has no required field — BE defaults `source` to
      // CASH_PURCHASE on its own.
      await addSpareRow(jc.section_job_no, {});
      invalidateSparesRows(jc.section_job_no);
      refetch();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      setError('Could not add spare: ' + (msg || 'Unknown error'));
    }
  }

  async function commitField(rowId, field, value) {
    setBusyRow(rowId);
    setError(null);
    try {
      const server = (rows || []).find((r) => r.id === rowId);
      // Normalise comparison — numbers come back as Number; inputs send strings.
      const sv = server ? server[field] : null;
      const cur = value === '' ? null : value;
      if (sv == null && cur == null) { setBusyRow(null); return; }
      if (String(sv) === String(cur)) { setBusyRow(null); return; }
      await patchSpareRow(jc.section_job_no, rowId, { [field]: value });
      setDrafts((p) => ({ ...p, [rowId]: { ...p[rowId], _dirty: false } }));
      invalidateSparesRows(jc.section_job_no);
      refetch();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      setError('Could not save: ' + (msg || 'Unknown error'));
    } finally {
      setBusyRow(null);
    }
  }

  async function handleDelete(rowId) {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this spare row? This cannot be undone.')) return;
    setError(null);
    try {
      await deleteSpareRow(jc.section_job_no, rowId);
      invalidateSparesRows(jc.section_job_no);
      refetch();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      setError('Could not delete: ' + (msg || 'Unknown error'));
    }
  }

  // ── Input prop helpers ─────────────────────────────────────────
  function textProps(rowId, field) {
    const d = drafts[rowId] || {};
    return {
      value: d[field] != null ? d[field] : '',
      disabled: !canWrite || busyRow === rowId,
      onChange: (e) => {
        const v = e.target.value;
        setDrafts((p) => ({ ...p, [rowId]: { ...(p[rowId] || {}), [field]: v, _dirty: true } }));
      },
      onBlur: (e) => { if (canWrite) commitField(rowId, field, e.target.value); },
    };
  }
  function selectProps(rowId, field) {
    const d = drafts[rowId] || {};
    return {
      value: d[field] != null ? d[field] : '',
      disabled: !canWrite || busyRow === rowId,
      onChange: (e) => {
        const v = e.target.value;
        setDrafts((p) => ({ ...p, [rowId]: { ...(p[rowId] || {}), [field]: v, _dirty: true } }));
        // Selects commit on change (no separate blur needed).
        if (canWrite) commitField(rowId, field, v);
      },
    };
  }
  function numberProps(rowId, field) {
    const t = textProps(rowId, field);
    return { ...t, type: 'number', step: '0.01', min: '0' };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Spares Used</h2>
        <Button variant="primary" size="md" onClick={handleAddRow} disabled={!canWrite}>
          <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
          Add Spare
        </Button>
      </div>
      <p className="text-xs text-ink-soft">
        One row per spare part used. Tab out of any field to save (auto-PATCH on blur). Source defaults to <span className="font-medium">Cash Purchase</span>.
      </p>

      {error ? (
        <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2 flex items-start gap-2">
          <AlertCircle size={12} strokeWidth={1.75} aria-hidden="true" className="shrink-0 mt-0.5" />
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-border rounded-md">
          <thead className="bg-base">
            <tr className="text-left text-ink-soft">
              <th className="px-3 py-2 font-semibold w-12">Sr. No</th>
              <th className="px-3 py-2 font-semibold">Spare Type</th>
              <th className="px-3 py-2 font-semibold">Source</th>
              <th className="px-3 py-2 font-semibold">Part No</th>
              <th className="px-3 py-2 font-semibold">Part Description</th>
              <th className="px-3 py-2 font-semibold w-24">Quantity</th>
              <th className="px-3 py-2 font-semibold w-28">Cost (Rs.)</th>
              <th className="px-3 py-2 font-semibold w-14 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && !rows ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-ink-soft">Loading…</td></tr>
            ) : !rows || rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-ink-soft">
                No spares used yet. Click <span className="font-medium text-ink">+ Add Spare</span> to start.
              </td></tr>
            ) : rows.map((row, idx) => (
              <tr key={row.id} className="border-t border-border align-top">
                <td className="px-3 py-2 text-center text-ink">{row.sr_no || idx + 1}</td>
                <td className="px-2 py-1.5"><Input size="sm" {...textProps(row.id, 'spare_type')} /></td>
                <td className="px-2 py-1.5">
                  <Select size="sm" {...selectProps(row.id, 'source')}>
                    {SPARE_SOURCE_OPTIONS.map((v) => <option key={v} value={v}>{SOURCE_LABELS[v]}</option>)}
                  </Select>
                </td>
                <td className="px-2 py-1.5"><Input size="sm" {...textProps(row.id, 'part_no')} /></td>
                <td className="px-2 py-1.5"><Input size="sm" {...textProps(row.id, 'part_description')} /></td>
                <td className="px-2 py-1.5"><Input size="sm" {...numberProps(row.id, 'quantity')} /></td>
                <td className="px-2 py-1.5"><Input size="sm" {...numberProps(row.id, 'cost')} /></td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(row.id)}
                    disabled={!canWrite || busyRow === row.id}
                    className="p-1.5 text-danger hover:bg-danger/10 rounded disabled:opacity-30"
                    aria-label="Delete row"
                    title="Delete row"
                  >
                    <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
