// ============================================================================
// pages/jobCards/tabs/ClosureTab.jsx
// ----------------------------------------------------------------------------
// Tab 13 — Closure (images 16-17). LIC/SA transition
// COMPLETED → VERIFIED_CLOSED. Required fields:
//   Quality Review:  reviewed_by, review_date, review_comments
//   Customer Ack:    equipment_received_by_customer, customer_received_date,
//                    customer_acknowledged (REQUIRED=true, Q-9 hard rule)
//   Final Notes:     final_closure_notes (optional, ≤ 2000 chars)
//
// On submit success the page refetches, status flips to VERIFIED_CLOSED,
// and per Q-10 the user STAYS on the page (read-only) — they click "Back
// to Job Cards" when ready.
// ============================================================================

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { jobCardVerifyCloseSchema } from '../../../lib/schemas/jobCardSchemas.js';
import { verifyCloseJobCard } from '../../../lib/api/jobCards.js';
import { formatIstTimestamp, todayIstIsoDate } from '../../../lib/time.js';

function todayIso() { return todayIstIsoDate(); }

export function ClosureTab({ jc, canWrite, invalidateAll }) {
  const {
    register, handleSubmit, formState: { errors, isSubmitting }, watch,
  } = useForm({
    resolver: zodResolver(jobCardVerifyCloseSchema),
    defaultValues: {
      reviewed_by:                    '',
      review_date:                    todayIso(),
      review_comments:                '',
      equipment_received_by_customer: '',
      customer_received_date:         todayIso(),
      customer_acknowledged:          false,
      final_closure_notes:            '',
    },
  });
  const [serverError, setServerError] = useState(null);

  const isPendingCompletion = jc.status !== 'COMPLETED';

  async function onSubmit(values) {
    setServerError(null);
    try {
      await verifyCloseJobCard(jc.section_job_no, values);
      invalidateAll();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      setServerError(msg || 'Could not close job card.');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-ink">Job Card Closure</h2>
        <p className="text-xs text-ink-soft mt-0.5">
          Quality review + customer acknowledgment + final notes. Once closed, the JC becomes read-only.
        </p>
      </div>

      {isPendingCompletion ? (
        <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 flex items-start gap-2 text-xs">
          <AlertTriangle size={14} strokeWidth={1.75} className="text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-ink">
            <span className="font-semibold text-amber-700">Pending Completion.</span>{' '}
            This job card must be marked as <strong>Complete</strong> before final closure.
            Please complete all tasks and submit the completion form.
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Quality Review block */}
        <section className="rounded-lg border border-border bg-base p-4 space-y-3">
          <div className="text-sm font-semibold text-ink">Quality Review</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="rb" className="block text-xs font-medium text-ink mb-1">Reviewed By <span className="text-danger">*</span></label>
              <Input
                id="rb"
                disabled={!canWrite || isSubmitting}
                invalid={!!errors.reviewed_by}
                placeholder="QA Inspector name"
                {...register('reviewed_by')}
              />
              {errors.reviewed_by ? <p className="mt-1 text-xs text-danger">{errors.reviewed_by.message}</p> : null}
            </div>
            <div>
              <label htmlFor="rd" className="block text-xs font-medium text-ink mb-1">Review Date <span className="text-danger">*</span></label>
              <Input
                id="rd"
                type="date"
                disabled={!canWrite || isSubmitting}
                invalid={!!errors.review_date}
                {...register('review_date')}
              />
            </div>
          </div>
          <div>
            <label htmlFor="rc" className="block text-xs font-medium text-ink mb-1">Review Comments <span className="text-danger">*</span></label>
            <textarea
              id="rc"
              rows={4}
              disabled={!canWrite || isSubmitting}
              className={'block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-card focus:outline-none focus:ring-1 '
                + (errors.review_comments
                    ? 'border-danger focus:border-danger focus:ring-danger'
                    : 'border-border focus:border-accent focus:ring-accent')}
              placeholder="Quality review findings and approval notes…"
              {...register('review_comments')}
            />
            {errors.review_comments ? <p className="mt-1 text-xs text-danger">{errors.review_comments.message}</p> : null}
          </div>
        </section>

        {/* Customer Acknowledgment block */}
        <section className="rounded-lg border border-border bg-base p-4 space-y-3">
          <div className="text-sm font-semibold text-ink">Customer Acknowledgment</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="erc" className="block text-xs font-medium text-ink mb-1">Equipment Received By <span className="text-danger">*</span></label>
              <Input
                id="erc"
                disabled={!canWrite || isSubmitting}
                invalid={!!errors.equipment_received_by_customer}
                placeholder="Division user name"
                {...register('equipment_received_by_customer')}
              />
              {errors.equipment_received_by_customer ? (
                <p className="mt-1 text-xs text-danger">{errors.equipment_received_by_customer.message}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="crd" className="block text-xs font-medium text-ink mb-1">Received Date <span className="text-danger">*</span></label>
              <Input
                id="crd"
                type="date"
                disabled={!canWrite || isSubmitting}
                invalid={!!errors.customer_received_date}
                {...register('customer_received_date')}
              />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              disabled={!canWrite || isSubmitting}
              {...register('customer_acknowledged')}
              className="mt-0.5"
            />
            <span>
              Equipment received in satisfactory condition <span className="text-danger">*</span>
              <span className="block text-xs text-ink-soft">
                Hard rule (Q-9): unchecking this means reopen, not close. If the customer flagged issues, use the Reopen action instead.
              </span>
            </span>
          </label>
          {errors.customer_acknowledged ? (
            <p className="text-xs text-danger">{errors.customer_acknowledged.message}</p>
          ) : null}
        </section>

        {/* Final Closure Notes */}
        <section className="rounded-lg border border-border bg-base p-4 space-y-2">
          <div className="text-sm font-semibold text-ink">Final Closure Notes</div>
          <textarea
            rows={3}
            disabled={!canWrite || isSubmitting}
            className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm shadow-card focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            placeholder="Any additional notes for job card closure…"
            {...register('final_closure_notes')}
          />
        </section>

        {serverError ? (
          <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">{serverError}</div>
        ) : null}

        <div className="flex items-center justify-end gap-2 sticky bottom-2 bg-base-elev border border-border rounded-lg p-3">
          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={!canWrite || isSubmitting || isPendingCompletion}
            className="!bg-emerald-600 hover:!bg-emerald-700"
          >
            <ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" />
            {isSubmitting ? 'Closing…' : 'Close Job Card'}
          </Button>
        </div>
      </form>

      {/* Success banner (if closed) — shown when status now equals VERIFIED_CLOSED */}
      {jc.status === 'VERIFIED_CLOSED' ? (
        <div role="status" className="rounded-md border border-emerald-300 bg-emerald-50 p-3 flex items-start gap-2 text-xs text-ink">
          <CheckCircle2 size={14} strokeWidth={1.75} className="text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-semibold text-emerald-700">Closed on {formatIstTimestamp(jc.verified_closed_at, '')}</span>
            {jc.verified_closed_by?.name ? <> by <span className="font-medium">{jc.verified_closed_by.name}</span></> : null}.
            Reopen this card from the action bar above if the customer reports issues later.
          </div>
        </div>
      ) : null}
    </div>
  );
}
