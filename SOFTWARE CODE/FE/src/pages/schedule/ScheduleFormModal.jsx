// ============================================================================
// src/pages/schedule/ScheduleFormModal.jsx  —  Create / Edit schedule modal
// ----------------------------------------------------------------------------
// PHASE 13 — Schedule sub-module
//
// Modes:
//   • Create (schedule prop is null) — full form, calls POST /schedules
//   • Edit   (schedule prop is set)  — fields pre-filled, calls PATCH /:id
//
// The Equipment selector reuses the Phase-6 typeahead (`/lookups/equipment/
// search`). The Engineer selector uses `/lookups/engineers` if the caller
// is LIC/SA; otherwise falls back to a free-text employee_id input.
//
// On success → invalidate the schedule queries via the mutation hook,
// fire a token capsule via the universal axios interceptor (no extra
// glue needed), and close.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

import { Button }   from '../../components/ui/Button.jsx';
import { Input }    from '../../components/ui/Input.jsx';
import { ModalPortal } from '../../components/ui/ModalPortal.jsx';
import { Select }   from '../../components/ui/Select.jsx';
import { useAuth }  from '../../lib/auth-context.jsx';
import { useScheduleMutations } from '../../lib/hooks/useSchedule.js';
import { api } from '../../lib/api-client.js';


// ── Constants ────────────────────────────────────────────────────────────
const TYPES        = ['PREVENTIVE_MAINTENANCE', 'CALIBRATION'];
const RECURRENCES  = ['NONE', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'];
const TRANSITIONS  = ['PLANNED', 'SCHEDULED', 'DUE', 'COMPLETED', 'CANCELLED'];

function todayIso() { return new Date().toISOString().slice(0, 10); }


export function ScheduleFormModal({ defaultType, schedule, onClose }) {
  const isEdit = Boolean(schedule);
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('schedule:delete');

  // ── Form state (controlled inputs) ───────────────────────────────────
  const [form, setForm] = useState(() => ({
    schedule_type:   schedule?.schedule_type   || defaultType || 'PREVENTIVE_MAINTENANCE',
    equipment_id:    schedule?.equipment_id    || '',
    equipment_label: schedule?.equipment_label || '',
    scheduled_date:  schedule?.scheduled_date  || todayIso(),
    assigned_engineer_employee_id: schedule?.assigned_engineer_employee_id || '',
    recurrence:      schedule?.recurrence      || 'NONE',
    status:          schedule?.status          || 'PLANNED',
    notes:           schedule?.notes           || '',
    transition_to:   '',                       // edit-only — extra status flip
    cancel_reason:   '',
  }));

  const [errMsg, setErrMsg] = useState(null);

  const { create, edit, transition, cancel, busy } = useScheduleMutations();

  // ── Equipment typeahead ──────────────────────────────────────────────
  const [eqQuery, setEqQuery] = useState('');
  const [eqOpts,  setEqOpts]  = useState([]);
  const [eqOpen,  setEqOpen]  = useState(false);
  useEffect(() => {
    if (!eqQuery || eqQuery.length < 2) { setEqOpts([]); return; }
    const ctrl = new AbortController();
    api.get('/lookups/equipment/search', { params: { q: eqQuery, limit: 10 }, signal: ctrl.signal })
      .then((r) => setEqOpts(r.data?.data?.items || []))
      .catch(() => {/* swallow — typeahead is best-effort */});
    return () => ctrl.abort();
  }, [eqQuery]);

  // ── Engineers list (best-effort; LIC/SA only by API gate) ────────────
  const [engineers, setEngineers] = useState([]);
  useEffect(() => {
    const ctrl = new AbortController();
    api.get('/lookups/engineers', { signal: ctrl.signal })
      .then((r) => setEngineers(r.data?.data?.items || []))
      .catch(() => setEngineers([]));    // non-LIC users get 403, that's fine
    return () => ctrl.abort();
  }, []);

  const onField = (k) => (e) => {
    const v = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [k]: v }));
  };

  // ── Submit (create or edit) ──────────────────────────────────────────
  const onSubmit = async (ev) => {
    ev.preventDefault();
    setErrMsg(null);
    try {
      if (isEdit) {
        // Only send changed-ish fields. Strict zod on the BE rejects unknown keys.
        const patch = {
          equipment_id:    form.equipment_id,
          equipment_label: form.equipment_label || undefined,
          scheduled_date:  form.scheduled_date,
          assigned_engineer_employee_id: form.assigned_engineer_employee_id || null,
          recurrence:      form.recurrence,
          notes:           form.notes || undefined,
        };
        await edit.mutateAsync({ id: schedule.id, body: patch });

        // Optional status transition on save.
        if (form.transition_to && form.transition_to !== schedule.status) {
          await transition.mutateAsync({
            id: schedule.id,
            body: form.transition_to === 'CANCELLED'
              ? { to: 'CANCELLED', reason: form.cancel_reason || 'Cancelled via edit' }
              : { to: form.transition_to },
          });
        }
      } else {
        await create.mutateAsync({
          schedule_type:   form.schedule_type,
          equipment_id:    form.equipment_id,
          equipment_label: form.equipment_label || undefined,
          scheduled_date:  form.scheduled_date,
          assigned_engineer_employee_id: form.assigned_engineer_employee_id || null,
          recurrence:      form.recurrence,
          notes:           form.notes || undefined,
        });
      }
      onClose();
    } catch (e) {
      setErrMsg(e?.response?.data?.error?.message || e?.message || 'Save failed');
    }
  };

  const onCancel = async () => {
    if (!isEdit || !canDelete) return;
    const reason = window.prompt('Reason for cancelling this schedule?');
    if (!reason) return;
    try {
      await cancel.mutateAsync({ id: schedule.id, body: { reason } });
      onClose();
    } catch (e) {
      setErrMsg(e?.response?.data?.error?.message || e?.message || 'Cancel failed');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-lg shadow-xl w-[640px] max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-ink">
            {isEdit ? `Edit Schedule · ${schedule.schedule_code}` : 'Create Schedule'}
          </h2>
          <button type="button" onClick={onClose} className="text-ink-soft hover:text-ink">
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {errMsg ? (
          <div className="mx-5 mt-4 flex gap-2 items-start rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
            <AlertTriangle size={14} className="mt-0.5" />
            <span>{errMsg}</span>
          </div>
        ) : null}

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <Field label="Schedule Type">
            <Select value={form.schedule_type} onChange={onField('schedule_type')} disabled={isEdit}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t === 'CALIBRATION' ? 'Calibration' : 'Preventive Maintenance'}</option>
              ))}
            </Select>
          </Field>

          <Field label="Equipment ID" hint="Type to search; or enter a composite id like EQM-12345.">
            <div className="relative">
              <Input
                value={form.equipment_id}
                onChange={(e) => { setForm((f) => ({ ...f, equipment_id: e.target.value })); setEqQuery(e.target.value); setEqOpen(true); }}
                onFocus={() => setEqOpen(true)}
                placeholder="Search by name / model / serial …"
              />
              {eqOpen && eqOpts.length > 0 ? (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-border rounded-md shadow max-h-56 overflow-y-auto text-sm">
                  {eqOpts.map((o) => (
                    <li
                      key={o.id}
                      className="px-3 py-2 hover:bg-base-elev cursor-pointer"
                      onClick={() => {
                        setForm((f) => ({ ...f, equipment_id: o.id, equipment_label: o.name }));
                        setEqOpen(false);
                      }}
                    >
                      <div className="font-medium text-ink">{o.name}</div>
                      <div className="text-xs text-ink-soft">{o.id} {o.serial_no ? `· S/N ${o.serial_no}` : ''}</div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Field>

          <Field label="Equipment label (shown on chip)">
            <Input value={form.equipment_label} onChange={onField('equipment_label')} placeholder="Auto-filled from selection" />
          </Field>

          <Field label="Scheduled Date">
            <Input type="date" value={form.scheduled_date} onChange={onField('scheduled_date')} />
          </Field>

          <Field label="Assigned Engineer (employee_id)">
            {engineers.length > 0 ? (
              <Select
                value={form.assigned_engineer_employee_id}
                onChange={onField('assigned_engineer_employee_id')}
              >
                <option value="">Unassigned</option>
                {engineers.map((e) => (
                  <option key={e.employee_id} value={e.employee_id}>
                    {e.full_name} ({e.employee_id}) · {e.active_card_count} active
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={form.assigned_engineer_employee_id}
                onChange={onField('assigned_engineer_employee_id')}
                placeholder="e.g. 1009101 (leave blank = Unassigned)"
                maxLength={7}
              />
            )}
          </Field>

          <Field label="Recurrence">
            <Select value={form.recurrence} onChange={onField('recurrence')}>
              {RECURRENCES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>

          {isEdit ? (
            <Field label="Status">
              <Select value={form.transition_to} onChange={onField('transition_to')}>
                <option value="">Keep current ({schedule.status})</option>
                {TRANSITIONS.filter((s) => s !== schedule.status).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              {form.transition_to === 'CANCELLED' ? (
                <div className="mt-2">
                  <Input
                    value={form.cancel_reason}
                    onChange={onField('cancel_reason')}
                    placeholder="Cancellation reason (required)"
                  />
                </div>
              ) : null}
            </Field>
          ) : null}

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

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-base/50">
          {isEdit && canDelete ? (
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy} type="button">
              <Trash2 size={14} strokeWidth={1.75} />
              Cancel Schedule
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>
              Close
            </Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : (isEdit ? 'Save changes' : 'Create')}
            </Button>
          </div>
        </div>
      </form>
    </div>
    </ModalPortal>
  );
}


function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-soft mb-1">{label}</label>
      {children}
      {hint ? <div className="text-[11px] text-ink-soft mt-1">{hint}</div> : null}
    </div>
  );
}
