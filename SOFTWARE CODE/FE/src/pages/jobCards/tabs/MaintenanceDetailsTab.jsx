// ============================================================================
// pages/jobCards/tabs/MaintenanceDetailsTab.jsx
// ----------------------------------------------------------------------------
// Tab 4 — Maintenance Details. Multi-row CRUD against jc_maintenance_details.
//
// Layout (matches image 12):
//   ┌──────────────────────────────────────────────────────────────────┐
//   │ Maintenance Details                                  [+ Add Row] │
//   ├────┬───────────────┬─────────────┬──────────────┬─────────┬──────┤
//   │ Sr │ Defect Descr  │ Observation │ Action Taken │ Remarks │ Act  │
//   ├────┼───────────────┼─────────────┼──────────────┼─────────┼──────┤
//   │  1 │ [textarea]    │ [textarea]  │ [textarea]   │ [text]  │ 🗑   │
//   └────┴───────────────┴─────────────┴──────────────┴─────────┴──────┘
//
// Each row is "edit-in-place": user types in the textarea, blur triggers
// a PATCH for that single field. New rows are added with a placeholder
// defect_description (BE requires min 3 chars); user immediately fills in.
//
// HARD-DELETE on row removal per Q-5.
// ============================================================================

import { useEffect, useState } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { useMaintenanceRows, invalidateMaintenanceRows } from '../../../lib/hooks/useMaintenanceRows.js';
import {
  addMaintenanceRow, patchMaintenanceRow, deleteMaintenanceRow,
} from '../../../lib/api/jobCards.js';

export function MaintenanceDetailsTab({ jc, canWrite }) {
  const { items: rows, loading, refetch } = useMaintenanceRows(jc.section_job_no);

  // Local "draft" cache — what the textarea is currently showing per row.
  // Keyed by row.id. Lets us PATCH on blur without losing the user's
  // in-progress edits during the 15-s refetch cycle.
  const [drafts, setDrafts] = useState({});

  // When the server-side rows update, sync the local drafts with whatever
  // changed. Preserve any row the user is actively editing (_dirty flag).
  useEffect(() => {
    if (!rows) return;
    setDrafts((prev) => {
      const next = {};
      for (const r of rows) {
        const existing = prev[r.id];
        if (existing && existing._dirty) {
          next[r.id] = existing;
        } else {
          next[r.id] = {
            defect_description: r.defect_description || '',
            observation:        r.observation || '',
            action_taken:       r.action_taken || '',
            remarks:            r.remarks || '',
            _dirty: false,
          };
        }
      }
      return next;
    });
  }, [rows]);

  const [busyRow, setBusyRow] = useState(null);
  const [error, setError] = useState(null);

  async function handleAddRow() {
    setError(null);
    try {
      // BE requires defect_description min(3). Placeholder lets the
      // row materialise; user overwrites inline.
      await addMaintenanceRow(jc.section_job_no, {
        defect_description: '— (please describe)',
      });
      invalidateMaintenanceRows(jc.section_job_no);
      refetch();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      setError('Could not add row: ' + (msg || 'Unknown error'));
    }
  }

  async function commitField(rowId, field, value) {
    setBusyRow(rowId);
    setError(null);
    try {
      // Skip the PATCH if the value hasn't changed (avoid noise).
      const server = (rows || []).find((r) => r.id === rowId);
      if (server && (server[field] || '') === (value || '')) {
        setDrafts((p) => ({ ...p, [rowId]: { ...p[rowId], _dirty: false } }));
        setBusyRow(null);
        return;
      }
      await patchMaintenanceRow(jc.section_job_no, rowId, { [field]: value });
      setDrafts((p) => ({ ...p, [rowId]: { ...p[rowId], _dirty: false } }));
      invalidateMaintenanceRows(jc.section_job_no);
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
    if (!window.confirm('Delete this maintenance row? This cannot be undone.')) return;
    setError(null);
    try {
      await deleteMaintenanceRow(jc.section_job_no, rowId);
      invalidateMaintenanceRows(jc.section_job_no);
      refetch();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      setError('Could not delete: ' + (msg || 'Unknown error'));
    }
  }

  function fieldProps(rowId, field) {
    const d = drafts[rowId] || {};
    return {
      value: d[field] != null ? d[field] : '',
      disabled: !canWrite || busyRow === rowId,
      onChange: (e) => {
        const v = e.target.value;
        setDrafts((p) => ({ ...p, [rowId]: { ...(p[rowId] || {}), [field]: v, _dirty: true } }));
      },
      onBlur: (e) => {
        if (!canWrite) return;
        commitField(rowId, field, e.target.value);
      },
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Maintenance Details</h2>
        <Button variant="primary" size="md" onClick={handleAddRow} disabled={!canWrite}>
          <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
          Add Row
        </Button>
      </div>
      <p className="text-xs text-ink-soft">
        One row per defect. Tab out of any field to save (auto-PATCH on blur). Hard-delete with the trash icon.
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
              <th className="px-3 py-2 font-semibold w-14">Sr. No</th>
              <th className="px-3 py-2 font-semibold">Defect Description</th>
              <th className="px-3 py-2 font-semibold">Observation</th>
              <th className="px-3 py-2 font-semibold">Action Taken</th>
              <th className="px-3 py-2 font-semibold">Remarks</th>
              <th className="px-3 py-2 font-semibold w-16 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && !rows ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-ink-soft">Loading…</td></tr>
            ) : !rows || rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-ink-soft">
                No maintenance rows yet. Click <span className="font-medium text-ink">+ Add Row</span> to start.
              </td></tr>
            ) : rows.map((row, idx) => (
              <tr key={row.id} className="border-t border-border align-top">
                <td className="px-3 py-2 text-center text-ink">{row.sr_no || idx + 1}</td>
                <td className="px-2 py-1.5">
                  <textarea
                    rows={2}
                    className="block w-full rounded border border-border bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:bg-base"
                    {...fieldProps(row.id, 'defect_description')}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <textarea
                    rows={2}
                    className="block w-full rounded border border-border bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:bg-base"
                    {...fieldProps(row.id, 'observation')}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <textarea
                    rows={2}
                    className="block w-full rounded border border-border bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:bg-base"
                    {...fieldProps(row.id, 'action_taken')}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <textarea
                    rows={2}
                    className="block w-full rounded border border-border bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:bg-base"
                    {...fieldProps(row.id, 'remarks')}
                  />
                </td>
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
