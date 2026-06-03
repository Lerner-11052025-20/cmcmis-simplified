// ============================================================================
// pages/conversion/components/ConvertToJobCardModal.jsx
// ----------------------------------------------------------------------------
// THE 3-section "Convert to Job Card" modal:
//
//   ┌─ Header: "Convert to Job Card: JR-2026-1240"                  ✕  ─┐
//   │ Smart Job Card Creation banner — explains pre-fill is automatic    │
//   │                                                                    │
//   │ ① Assignment & Workflow                                            │
//   │     Engineer dropdown (engineer · N active cards)                  │
//   │     Workflow Type dropdown (scoped to JR.job_type bucket)          │
//   │                                                                    │
//   │ ② Timeline (Pre-filled for Job Card)                               │
//   │     Equipment Received Date *                                      │
//   │     Planned Start Date *                                           │
//   │     Target End Date *                                              │
//   │     (Actual start is set by the engineer in Phase 9.)              │
//   │                                                                    │
//   │ ③ Instructions for Engineer (Optional)                             │
//   │     Required Resources / Tools                                     │
//   │     Special Instructions / Notes                                   │
//   │                                                                    │
//   │ [Cancel]    Creating for JR-…    [Save as Draft ▒]   [Create →]   │
//   └─────────────────────────────────────────────────────────────────────┘
//
// VALIDATION
//   • jobRequestConvertSchema (zod) — mirrors the BE schema. Surfaces
//     field-level errors inline.
//   • Workflow Type dropdown is pre-filtered to the JR's job_type bucket
//     (per D-7.2.10) so the user can never pick a mismatched combo.
//   • Dates are HTML <input type="date"> — wide browser support, native
//     pickers. Min/max attributes enforce the cascade
//     (received ≤ planned ≤ target) at the input layer.
//
// SUBMIT FLOW
//   On success → invalidate caches + call onSuccess(payload). The parent
//   (Conversion or JobRequestDetail page) handles the toast + navigation.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, CheckCircle2, Users, Calendar, FileText, Wrench, AlertTriangle } from 'lucide-react';

import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { ModalPortal } from '../../../components/ui/ModalPortal.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import {
  jobRequestConvertSchema,
  WORKFLOW_BUCKET,
  WORKFLOW_LABELS,
} from '../../../lib/schemas/jobRequestSchemas.js';
import { useEngineersLookup } from '../../../lib/hooks/useEngineersLookup.js';
import { convertJobRequest } from '../../../lib/api/jobRequests.js';
import { todayIstIsoDate } from '../../../lib/time.js';

function todayIso() {
  return todayIstIsoDate();
}

/**
 * @param {Object} props
 * @param {Object} props.jr        Either the full Detail payload OR the
 *                                 lighter list-row shape. Must have at
 *                                 minimum: id, request_code, job_type.
 * @param {() => void} props.onClose
 * @param {(payload: Object) => void} props.onSuccess
 */
export function ConvertToJobCardModal({ jr, onClose, onSuccess }) {
  const allowedWorkflows = WORKFLOW_BUCKET[jr.job_type] || [];

  // The legacy JC schema requires JM_EQM_ID NOT NULL. If this JR was
  // created without picking an equipment from the typeahead (only the
  // free-text equipment_name was filled), the BE will reject the convert
  // with EQUIPMENT_REQUIRED. Detect this upfront from whichever shape
  // the parent passed in:
  //   • From /conversion table row  → jr.equipment_id  (top-level)
  //   • From /:id Detail payload    → jr.equipment.id  (nested)
  const equipmentRefMissing = jr.equipment_id == null
    && (jr.equipment == null || jr.equipment.id == null);

  // ── React Hook Form ─────────────────────────────────────────────
  const today = todayIso();
  const {
    register, handleSubmit, watch, setError, formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(jobRequestConvertSchema),
    defaultValues: {
      engineer_employee_id:    '',
      workflow_type:           allowedWorkflows[0] || '',
      equipment_received_date: today,
      planned_start_date:      today,
      target_end_date:         today,
      required_resources:      '',
      special_instructions:    '',
    },
  });

  // ── Engineers lookup (workload-sorted dropdown) ─────────────────
  const { items: engineers, loading: engLoading, error: engError } = useEngineersLookup(true);

  // ── Submit handler ─────────────────────────────────────────────
  const [serverError, setServerError] = useState(null);
  async function onSubmit(values) {
    setServerError(null);
    try {
      const payload = await convertJobRequest(jr.id, values);
      onSuccess(payload);
    } catch (e) {
      const code = e?.response?.data?.error?.code;
      const msg  = e?.response?.data?.error?.message;
      const details = e?.response?.data?.error?.details;
      // 422 VALIDATION_ERROR — try to map onto field-level errors first.
      if (code === 'VALIDATION_ERROR' && Array.isArray(details)) {
        for (const d of details) {
          if (d.path) setError(d.path, { type: 'server', message: d.message });
        }
      }
      setServerError(
        msg || 'Convert failed. Please check the form and try again.',
      );
    }
  }

  // ── Close-confirm if dirty (D-7.2 / Q-8 — overlay click is no-op) ─
  function attemptClose() {
    if (!isDirty) return onClose();
    // eslint-disable-next-line no-alert
    if (window.confirm('Discard unsaved changes?')) onClose();
  }
  useEffect(() => {
    function onEsc(e) { if (e.key === 'Escape') attemptClose(); }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  // ── Date-cascade helpers ────────────────────────────────────────
  // We bind min= on planned_start_date to whatever the user picked for
  // equipment_received_date, and target_end_date to planned_start_date.
  // This is purely a UX nudge; the zod superRefine is the hard gate.
  const eqReceived = watch('equipment_received_date');
  const plannedStart = watch('planned_start_date');

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2"
      role="dialog"
      aria-modal="true"
      aria-labelledby="convert-modal-title"
      // Overlay click is intentionally a NO-OP (D-7.2 / Q-8). To close,
      // the user clicks Cancel or the X icon — both go through
      // attemptClose() which prompts if the form is dirty.
    >
      <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-lg shadow-card overflow-hidden flex flex-col">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <h2 id="convert-modal-title" className="text-lg font-semibold text-ink">
            Convert to Job Card: <span className="text-accent">{jr.request_code}</span>
          </h2>
          <button
            type="button"
            onClick={attemptClose}
            aria-label="Close"
            className="text-ink-soft hover:text-ink p-1 rounded-md hover:bg-base-elev"
          >
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {/* ── Scrollable body ────────────────────────────────────────── */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {/* Missing-equipment banner — clearer than the BE 500 the user
              would otherwise see if we let the request through. */}
          {equipmentRefMissing ? (
            <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-start gap-2">
              <AlertTriangle size={16} strokeWidth={1.75} className="text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs text-ink">
                <span className="font-semibold text-amber-700">Cannot create job card from this request.</span>{' '}
                The Job Request has no equipment selected (only a free-text name was entered).
                Job Cards require a registered equipment record. Ask the submitter to update the JR
                using the Equipment ID typeahead, then retry.
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 flex items-start gap-2">
              <CheckCircle2 size={16} strokeWidth={1.75} className="text-accent shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs text-ink">
                <span className="font-semibold">Smart Job Card Creation.</span>{' '}
                All information entered here will be{' '}
                <span className="font-semibold">automatically available</span> in the new Job Card.
                The engineer won't need to re-enter this data — they can start working immediately.
              </div>
            </div>
          )}

          {/* ① Assignment & Workflow ───────────────────────────────── */}
          <section className="rounded-lg border border-violet-200 bg-violet-50/40 p-3.5 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-500 text-white text-xs">1</span>
              <Users size={14} strokeWidth={1.75} aria-hidden="true" />
              Assignment & Workflow
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="engineer" className="block text-xs font-medium text-ink mb-1">
                  Assign to Engineer <span className="text-danger">*</span>
                </label>
                <Select
                  id="engineer"
                  invalid={!!errors.engineer_employee_id}
                  {...register('engineer_employee_id')}
                  disabled={engLoading}
                >
                  <option value="">{engLoading ? 'Loading engineers…' : 'Select engineer…'}</option>
                  {(engineers || []).map((e) => (
                    <option key={e.employee_id} value={e.employee_id}>
                      {e.full_name} ({e.employee_id})
                      {' · '}{e.active_card_count} active card{e.active_card_count === 1 ? '' : 's'}
                    </option>
                  ))}
                </Select>
                {errors.engineer_employee_id ? (
                  <p className="mt-1 text-xs text-danger">{errors.engineer_employee_id.message}</p>
                ) : engError ? (
                  <p className="mt-1 text-xs text-danger">Could not load engineer list.</p>
                ) : (
                  <p className="mt-1 text-xs text-ink-soft">Auto-populated in job card.</p>
                )}
              </div>

              <div>
                <label htmlFor="workflow" className="block text-xs font-medium text-ink mb-1">
                  Workflow Type <span className="text-danger">*</span>
                </label>
                <Select
                  id="workflow"
                  invalid={!!errors.workflow_type}
                  {...register('workflow_type')}
                >
                  <option value="">Select workflow…</option>
                  {allowedWorkflows.map((w) => (
                    <option key={w} value={w}>{WORKFLOW_LABELS[w]}</option>
                  ))}
                </Select>
                {errors.workflow_type ? (
                  <p className="mt-1 text-xs text-danger">{errors.workflow_type.message}</p>
                ) : (
                  <p className="mt-1 text-xs text-ink-soft">Scoped to {jr.job_type} requests.</p>
                )}
              </div>
            </div>
          </section>

          {/* ② Timeline ────────────────────────────────────────────── */}
          <section className="rounded-lg border border-amber-200 bg-amber-50/40 p-3.5 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs">2</span>
              <Calendar size={14} strokeWidth={1.75} aria-hidden="true" />
              Timeline (Pre-filled for Job Card)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="recd" className="block text-xs font-medium text-ink mb-1">
                  Equipment Received Date <span className="text-danger">*</span>
                </label>
                <Input
                  id="recd"
                  type="date"
                  invalid={!!errors.equipment_received_date}
                  {...register('equipment_received_date')}
                />
                {errors.equipment_received_date ? (
                  <p className="mt-1 text-xs text-danger">{errors.equipment_received_date.message}</p>
                ) : (
                  <p className="mt-1 text-xs text-ink-soft">Locked into the job card.</p>
                )}
              </div>
              <div>
                <label htmlFor="planned" className="block text-xs font-medium text-ink mb-1">
                  Planned Start Date <span className="text-danger">*</span>
                </label>
                <Input
                  id="planned"
                  type="date"
                  min={eqReceived || undefined}
                  invalid={!!errors.planned_start_date}
                  {...register('planned_start_date')}
                />
                {errors.planned_start_date ? (
                  <p className="mt-1 text-xs text-danger">{errors.planned_start_date.message}</p>
                ) : (
                  <p className="mt-1 text-xs text-ink-soft">When the engineer plans to start.</p>
                )}
              </div>
              <div>
                <label htmlFor="target" className="block text-xs font-medium text-ink mb-1">
                  Target End Date <span className="text-danger">*</span>
                </label>
                <Input
                  id="target"
                  type="date"
                  min={plannedStart || eqReceived || undefined}
                  invalid={!!errors.target_end_date}
                  {...register('target_end_date')}
                />
                {errors.target_end_date ? (
                  <p className="mt-1 text-xs text-danger">{errors.target_end_date.message}</p>
                ) : (
                  <p className="mt-1 text-xs text-ink-soft">Sets the deadline in the job card.</p>
                )}
              </div>
              <div className="text-xs text-ink-soft self-center mt-2 md:mt-4">
                <Wrench size={12} strokeWidth={1.75} aria-hidden="true" className="inline mr-1" />
                Actual start date will be captured when the engineer begins work.
              </div>
            </div>
          </section>

          {/* ③ Instructions ───────────────────────────────────────── */}
          <section className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs">3</span>
              <FileText size={14} strokeWidth={1.75} aria-hidden="true" />
              Instructions for Engineer (Optional)
            </h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="req-res" className="block text-xs font-medium text-ink mb-1">
                  Required Resources / Tools
                </label>
                <Input
                  id="req-res"
                  placeholder="e.g., High-precision multimeter, Temperature chamber, Special fixtures…"
                  invalid={!!errors.required_resources}
                  {...register('required_resources')}
                />
                {errors.required_resources ? (
                  <p className="mt-1 text-xs text-danger">{errors.required_resources.message}</p>
                ) : (
                  <p className="mt-1 text-xs text-ink-soft">Helps the engineer prepare in advance.</p>
                )}
              </div>
              <div>
                <label htmlFor="spec-inst" className="block text-xs font-medium text-ink mb-1">
                  Special Instructions / Notes
                </label>
                <textarea
                  id="spec-inst"
                  rows={3}
                  className={
                    'block w-full rounded-md border bg-white text-ink placeholder:text-ink-soft/60 '
                    + 'shadow-card transition-colors disabled:opacity-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 '
                    + (errors.special_instructions
                      ? 'border-danger focus:border-danger focus:ring-danger'
                      : 'border-border focus:border-accent focus:ring-accent')
                  }
                  placeholder="e.g., Handle with care — sensitive to static electricity. Test at 25°C ambient temperature. Follow procedure doc-123…"
                  {...register('special_instructions')}
                />
                {errors.special_instructions ? (
                  <p className="mt-1 text-xs text-danger">{errors.special_instructions.message}</p>
                ) : (
                  <p className="mt-1 text-xs text-emerald-700">
                    <CheckCircle2 size={11} strokeWidth={1.75} aria-hidden="true" className="inline mr-1" />
                    Pre-filled in the job card for engineer reference.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Server error banner */}
          {serverError ? (
            <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
              {serverError}
            </div>
          ) : null}
        </form>

        {/* ── Footer (sticky) ─────────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-border bg-base-elev flex items-center justify-between gap-3">
          <Button variant="secondary" onClick={attemptClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <div className="text-xs text-ink-soft hidden md:block">
            Creating job card for{' '}
            <span className="font-semibold text-ink">{jr.request_code}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* "Save as Draft" — VISIBLE but DISABLED in Slice 2 (D-7.2.12).
                Tells users the feature is on the roadmap without shipping
                a half-baked implementation. */}
            <Button
              variant="secondary"
              disabled
              title="Saving a partial conversion ships in Slice 3"
            >
              Save as Draft
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || equipmentRefMissing}
              title={equipmentRefMissing
                ? 'Cannot convert — JR has no equipment selected'
                : undefined}
            >
              <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />
              {isSubmitting ? 'Creating…' : 'Create Job Card'}
            </Button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
