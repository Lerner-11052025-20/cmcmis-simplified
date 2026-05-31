// ============================================================================
// pages/jobCards/modals/ReopenModal.jsx
// ----------------------------------------------------------------------------
// LIC/SA-only modal for transitioning COMPLETED or VERIFIED_CLOSED back
// to IN_PROGRESS. Mandatory reason (20..1000 chars).
//
// On commit:
//   • completion fields cleared (D-9.6)
//   • if from VERIFIED_CLOSED, closure fields cleared too
//   • data tabs preserved
//   • reopen_count incremented
//   • status_history + audit_log rows written
//   • engineer sees a banner on next visit (handled by parent page)
// ============================================================================

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { ModalPortal } from '../../../components/ui/ModalPortal.jsx';
import { jobCardReopenSchema } from '../../../lib/schemas/jobCardSchemas.js';
import { reopenJobCard } from '../../../lib/api/jobCards.js';

export function ReopenModal({ jc, onClose, onSuccess }) {
  const {
    register, handleSubmit, watch, formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(jobCardReopenSchema),
    defaultValues: { reason: '' },
  });
  const reasonValue = watch('reason') || '';
  const [serverError, setServerError] = useState(null);

  async function onSubmit(values) {
    setServerError(null);
    try {
      await reopenJobCard(jc.section_job_no, values);
      onSuccess();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      setServerError(msg || 'Could not reopen job card.');
    }
  }

  useEffect(() => {
    function onEsc(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const willClearClosure = jc.status === 'VERIFIED_CLOSED';

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reopen-modal-title"
    >
      <div className="bg-white w-full max-w-lg rounded-lg shadow-card overflow-hidden flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <h2 id="reopen-modal-title" className="text-lg font-semibold text-ink">
            Reopen Job Card: <span className="text-orange-700">{jc.card_code}</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink p-1 rounded-md hover:bg-base-elev">
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-3">
          <div className="rounded-md border border-orange-300 bg-orange-50 p-3 flex items-start gap-2">
            <AlertTriangle size={16} strokeWidth={1.75} className="text-orange-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs text-ink">
              <span className="font-semibold text-orange-700">This will reset completion state.</span>{' '}
              Status moves back to <strong>IN_PROGRESS</strong>. Engineer&apos;s completion summary, actual date, and hours-spent will be cleared.
              {willClearClosure ? (
                <> The closure form (reviewer, customer ack, etc.) will <strong>also</strong> be cleared because this card was already verified-closed.</>
              ) : null}
              <> Data tabs (maintenance, spares, observations, tasks, documents) are preserved.</>
            </div>
          </div>

          <div>
            <label htmlFor="reopen-reason" className="block text-xs font-medium text-ink mb-1">Reopen Reason <span className="text-danger">*</span></label>
            <textarea
              id="reopen-reason"
              rows={5}
              autoFocus
              className={'block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-card focus:outline-none focus:ring-1 '
                + (errors.reason
                    ? 'border-danger focus:border-danger focus:ring-danger'
                    : 'border-border focus:border-accent focus:ring-accent')}
              placeholder="Why is this job card being reopened? The engineer will see this reason as a banner on the detail page."
              {...register('reason')}
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              {errors.reason ? (
                <span className="text-danger">{errors.reason.message}</span>
              ) : (
                <span className="text-ink-soft">Minimum 20 characters. Maximum 1000.</span>
              )}
              <span className={reasonValue.length > 1000 ? 'text-danger' : 'text-ink-soft'}>
                {reasonValue.length}/1000
              </span>
            </div>
          </div>

          {serverError ? (
            <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">{serverError}</div>
          ) : null}
        </form>

        <div className="px-5 py-3 border-t border-border bg-base-elev flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || reasonValue.trim().length < 20}
            className="!bg-orange-600 hover:!bg-orange-700"
          >
            <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
            {isSubmitting ? 'Reopening…' : 'Reopen Job Card'}
          </Button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
