// ============================================================================
// pages/jobCards/tabs/MarkCompleteTab.jsx
// ----------------------------------------------------------------------------
// Tab 12 — Mark as Complete (image 18). Engineer transition
// IN_PROGRESS → COMPLETED. Gates:
//   1. All tasks completed (or no tasks)
//   2. Observations recorded (≥1 row OR text ≥20 chars)
//   3. Calibration certificate uploaded (only for CALIBRATION_*)
//   4. At least 1 required document
//
// BE re-checks all 4 inside the transaction; FE displays the gate state
// as best-effort pre-validation.
//
// HOTFIX 2026-05-19:
//   • Each gate row now shows a "current vs required" hint so the user
//     knows EXACTLY how close they are (e.g. "12/20 chars — need 8 more").
//   • When a gate fails, an inline "Open <tab>" link jumps to the tab
//     where the user can fix it.
//   • The parent JobCardDetail now refetches the JC payload immediately
//     after every tab save (via the `refetch` prop), so the gate panel
//     can't read stale data when the user switches tabs right after a
//     save in Observations / Tasks / Documents.
// ============================================================================

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Square, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { jobCardMarkCompleteSchema } from '../../../lib/schemas/jobCardSchemas.js';
import { markCompleteJobCard } from '../../../lib/api/jobCards.js';
import { useJobCardTasks } from '../../../lib/hooks/useJobCardTasks.js';
import { useJobCardDocuments } from '../../../lib/hooks/useJobCardDocuments.js';

/**
 * Gate row component.
 *   • Green check (ok) or empty square (not met).
 *   • Label (the rule).
 *   • Hint (current vs required state — always shown).
 *   • Action link (only when !ok) — jumps to the tab that needs work.
 */
function GateRow({ label, ok, hint, actionLabel, onAction }) {
  return (
    <div className="flex items-center gap-2 text-sm flex-wrap">
      {ok ? (
        <CheckCircle2 size={16} strokeWidth={1.75} className="text-emerald-600 shrink-0" aria-hidden="true" />
      ) : (
        <Square size={16} strokeWidth={1.75} className="text-ink-soft shrink-0" aria-hidden="true" />
      )}
      <span className={ok ? 'text-ink' : 'text-ink-soft'}>{label}</span>
      {hint ? (
        <span className={'text-xs ' + (ok ? 'text-emerald-700' : 'text-amber-700')}>
          · {hint}
        </span>
      ) : null}
      {!ok && actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="ml-auto text-xs text-accent hover:underline inline-flex items-center gap-1"
        >
          {actionLabel}
          <ArrowRight size={11} strokeWidth={1.75} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function todayIso() { return new Date().toISOString().slice(0, 10); }

export function MarkCompleteTab({ jc, canWrite, invalidateAll, refetch }) {
  // Live gate computation. The `tasks` and `docs` hooks each manage
  // their own cache; the orchestrator's invalidateAll() clears them
  // alongside the parent JC detail, so all three reflect the same
  // snapshot when the user lands on this tab.
  const { items: tasks } = useJobCardTasks(jc.section_job_no);
  const { items: docs }  = useJobCardDocuments(jc.section_job_no);

  // Navigation helper — gate rows let the user jump to the offending tab
  // (saves the LIC/engineer from having to find the right tab manually).
  const [_, setSearchParams] = useSearchParams();
  function goToTab(key) {
    setSearchParams({ tab: key }, { replace: true });
  }

  // ── Gate 1: tasks ────────────────────────────────────────────────
  const totalTasks = (tasks || []).length;
  const completedTasks = (tasks || []).filter((t) => t.is_completed).length;
  const tasksOk = totalTasks === 0 || completedTasks === totalTasks;
  const tasksHint = totalTasks === 0
    ? 'no tasks added — gate auto-passes'
    : `${completedTasks}/${totalTasks} complete`;

  // ── Gate 2: observations ─────────────────────────────────────────
  // BE rule: ≥1 row in jc_observations_readings OR observations_text ≥ 20 chars.
  // FE shortcut: we don't currently render a readings table (Slice 2),
  // so the user must hit the 20-char threshold via the Observations tab
  // textarea. The hint tells them exactly how many more chars they need.
  const obsLen = (jc.observations_text || '').length;
  const obsOk = obsLen >= 20;
  const obsHint = obsOk
    ? `${obsLen} chars`
    : (obsLen === 0
        ? 'empty — write ≥20 chars in the Observations tab'
        : `${obsLen}/20 chars — need ${20 - obsLen} more`);

  // ── Gate 3: calibration certificate (only for calibration workflows) ──
  const isCalibration = (jc.workflow_type === 'CALIBRATION_STANDARD'
                      || jc.workflow_type === 'CALIBRATION_PRECISION');
  const hasCalCert = (docs || []).some((d) => d.doc_type === 'CALIBRATION_CERT');
  const calCertOk = !isCalibration || hasCalCert;
  const calCertHint = !isCalibration
    ? 'not required (non-calibration workflow)'
    : (hasCalCert ? 'present' : 'upload a doc with type = CALIBRATION_CERT');

  // ── Gate 4: at least one required-tier document ──────────────────
  const requiredDocs = (docs || []).filter((d) =>
    d.doc_type === 'REQUIRED' || d.doc_type === 'INSPECTION_REPORT' || d.doc_type === 'CALIBRATION_CERT');
  const requiredDocOk = requiredDocs.length > 0;
  const requiredDocHint = requiredDocOk
    ? `${requiredDocs.length} required doc${requiredDocs.length === 1 ? '' : 's'} uploaded`
    : 'upload a doc with type = REQUIRED, INSPECTION_REPORT, or CALIBRATION_CERT';

  const allGatesOk = tasksOk && obsOk && calCertOk && requiredDocOk;

  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(jobCardMarkCompleteSchema),
    defaultValues: {
      completion_summary:     '',
      actual_completion_date: todayIso(),
      total_hours_spent:      '',
    },
  });
  const [serverError, setServerError] = useState(null);
  const [serverGates, setServerGates] = useState(null);

  async function onSubmit(values) {
    setServerError(null);
    setServerGates(null);
    try {
      await markCompleteJobCard(jc.section_job_no, values);
      invalidateAll();
      if (refetch) refetch();   // hotfix — keep parent fresh after the transition
      // Parent's status banner kicks in on the next refetch tick.
    } catch (e) {
      const code  = e?.response?.data?.error?.code;
      const msg   = e?.response?.data?.error?.message;
      const details = e?.response?.data?.error?.details;
      if (code === 'PRECOMPLETION_GATES_FAILED' && details?.gates) {
        setServerGates(details.gates);
      }
      setServerError(msg || 'Could not mark complete.');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-ink">Mark Job Card as Complete</h2>
        <p className="text-xs text-ink-soft mt-0.5">
          When the four pre-completion gates pass and the completion summary is filled, the LIC can then verify-close this card.
        </p>
      </div>

      {/* Pre-completion verification panel.
          Each row shows: status + label + current/required hint +
          (if not met) a "Go to <tab>" link so the user can fix it quickly. */}
      <div className="rounded-lg border border-border bg-base p-4 space-y-2">
        <div className="text-sm font-semibold text-ink mb-2">Pre-Completion Verification</div>
        <GateRow
          label="All tasks completed"
          ok={tasksOk}
          hint={tasksHint}
          actionLabel="Open Task Checklist"
          onAction={() => goToTab('tasks')}
        />
        <GateRow
          label="Observations recorded (≥20 chars)"
          ok={obsOk}
          hint={obsHint}
          actionLabel="Open Observations"
          onAction={() => goToTab('observations')}
        />
        {isCalibration ? (
          <GateRow
            label="Calibration certificate generated"
            ok={calCertOk}
            hint={calCertHint}
            actionLabel="Open Documents"
            onAction={() => goToTab('documents')}
          />
        ) : null}
        <GateRow
          label="At least one required document uploaded"
          ok={requiredDocOk}
          hint={requiredDocHint}
          actionLabel="Open Documents"
          onAction={() => goToTab('documents')}
        />
      </div>

      {!allGatesOk ? (
        <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 flex items-start gap-2 text-xs">
          <AlertTriangle size={14} strokeWidth={1.75} className="text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-ink">
            One or more gates are not green. Use the <span className="font-medium">Open …</span> links above to jump to the right tab and fix what&apos;s missing. The page refetches automatically after every save.
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="cs" className="block text-xs font-medium text-ink mb-1">Completion Summary <span className="text-danger">*</span></label>
          <textarea
            id="cs"
            rows={5}
            disabled={!canWrite || isSubmitting}
            className={'block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-card focus:outline-none focus:ring-1 '
              + (errors.completion_summary
                  ? 'border-danger focus:border-danger focus:ring-danger'
                  : 'border-border focus:border-accent focus:ring-accent')}
            placeholder="Brief summary of the work completed, findings, and any recommendations…"
            {...register('completion_summary')}
          />
          {errors.completion_summary ? (
            <p className="mt-1 text-xs text-danger">{errors.completion_summary.message}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="acd" className="block text-xs font-medium text-ink mb-1">Actual Completion Date <span className="text-danger">*</span></label>
            <Input
              id="acd"
              type="date"
              disabled={!canWrite || isSubmitting}
              invalid={!!errors.actual_completion_date}
              {...register('actual_completion_date')}
            />
            {errors.actual_completion_date ? (
              <p className="mt-1 text-xs text-danger">{errors.actual_completion_date.message}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="ths" className="block text-xs font-medium text-ink mb-1">Total Hours Spent <span className="text-danger">*</span></label>
            <Input
              id="ths"
              type="number"
              step="0.25"
              min="0"
              disabled={!canWrite || isSubmitting}
              invalid={!!errors.total_hours_spent}
              {...register('total_hours_spent')}
            />
            {errors.total_hours_spent ? (
              <p className="mt-1 text-xs text-danger">{errors.total_hours_spent.message}</p>
            ) : null}
          </div>
        </div>

        {/* Server-side error / gate failure surface */}
        {serverGates ? (
          <div role="alert" className="rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-ink">
            <div className="font-semibold text-danger mb-1">Server-side gates failed:</div>
            <ul className="list-disc list-inside space-y-0.5">
              {serverGates.map((g, i) => <li key={i}><span className="font-medium">{g.gate}:</span> {g.message}</li>)}
            </ul>
          </div>
        ) : serverError ? (
          <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">{serverError}</div>
        ) : null}

        <div className="flex items-center justify-between gap-2 sticky bottom-2 bg-base-elev border border-border rounded-lg p-3">
          <div className="text-xs text-ink-soft">
            On submit, status moves <span className="font-medium text-ink">IN_PROGRESS → COMPLETED</span>.
            The LIC then verifies and closes the card.
          </div>
          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={!canWrite || isSubmitting || !allGatesOk}
            className="!bg-emerald-600 hover:!bg-emerald-700"
          >
            <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />
            {isSubmitting ? 'Marking…' : 'Mark as Complete'}
          </Button>
        </div>
      </form>
    </div>
  );
}
