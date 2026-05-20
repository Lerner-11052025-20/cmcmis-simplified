// ============================================================================
// pages/conversion/components/RejectModal.jsx
// ----------------------------------------------------------------------------
// Single-textarea modal for rejecting a Job Request with a mandatory
// reason (10..500 chars). REJECTED is TERMINAL for Slice 2 (D-7.2.2 /
// Q-3) — a tooltip in the description spells that out.
//
// Differences from ConvertToJobCardModal:
//   • One field. No "discard unsaved changes?" prompt — losing a
//     half-typed reason is cheap.
//   • The danger-coloured CTA reflects the destructive nature.
// ============================================================================

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, XCircle, AlertTriangle } from 'lucide-react';

import { Button } from '../../../components/ui/Button.jsx';
import { MadeWithLove } from '../../../components/MadeWithLove.jsx';
import { jobRequestRejectSchema } from '../../../lib/schemas/jobRequestSchemas.js';
import { rejectJobRequest } from '../../../lib/api/jobRequests.js';

/**
 * @param {Object} props
 * @param {Object} props.jr        Must include id + request_code.
 * @param {() => void} props.onClose
 * @param {() => void} props.onSuccess
 */
export function RejectModal({ jr, onClose, onSuccess }) {
  const {
    register, handleSubmit, watch, setError, formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(jobRequestRejectSchema),
    defaultValues: { reason: '' },
  });
  const reasonValue = watch('reason') || '';

  const [serverError, setServerError] = useState(null);

  async function onSubmit(values) {
    setServerError(null);
    try {
      await rejectJobRequest(jr.id, values);
      onSuccess();
    } catch (e) {
      const code = e?.response?.data?.error?.code;
      const msg  = e?.response?.data?.error?.message;
      const details = e?.response?.data?.error?.details;
      if (code === 'VALIDATION_ERROR' && Array.isArray(details)) {
        for (const d of details) {
          if (d.path) setError(d.path, { type: 'server', message: d.message });
        }
      }
      setServerError(msg || 'Reject failed. Please try again.');
    }
  }

  useEffect(() => {
    function onEsc(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
    >
      <div className="bg-white w-full max-w-lg rounded-lg shadow-card overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <h2 id="reject-modal-title" className="text-lg font-semibold text-ink">
            Reject Job Request: <span className="text-danger">{jr.request_code}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-soft hover:text-ink p-1 rounded-md hover:bg-base-elev"
          >
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-3">
          <div className="rounded-md border border-danger/30 bg-danger/5 p-3 flex items-start gap-2">
            <AlertTriangle size={16} strokeWidth={1.75} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs text-ink">
              <span className="font-semibold">This action is final.</span>{' '}
              The submitter will need to create a new request if they want to retry.
              Be clear about what they should change.
            </div>
          </div>

          <div>
            <label htmlFor="reason" className="block text-xs font-medium text-ink mb-1">
              Reason for rejection <span className="text-danger">*</span>
            </label>
            <textarea
              id="reason"
              rows={5}
              autoFocus
              className={
                'block w-full rounded-md border bg-white text-ink placeholder:text-ink-soft/60 '
                + 'shadow-card transition-colors disabled:opacity-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 '
                + (errors.reason
                  ? 'border-danger focus:border-danger focus:ring-danger'
                  : 'border-border focus:border-accent focus:ring-accent')
              }
              placeholder="e.g., Equipment is not eligible for calibration in this lab. Please route to T&ME division."
              {...register('reason')}
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              {errors.reason ? (
                <span className="text-danger">{errors.reason.message}</span>
              ) : (
                <span className="text-ink-soft">Minimum 10 characters. Maximum 500.</span>
              )}
              <span className={reasonValue.length > 500 ? 'text-danger' : 'text-ink-soft'}>
                {reasonValue.length}/500
              </span>
            </div>
          </div>

          {serverError ? (
            <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
              {serverError}
            </div>
          ) : null}
        </form>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-base-elev flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="!bg-danger hover:!bg-danger/90"
          >
            <XCircle size={16} strokeWidth={1.75} aria-hidden="true" />
            {isSubmitting ? 'Rejecting…' : 'Reject Request'}
          </Button>
        </div>

        {/* Authorship credit — bottom of every modal. */}
        <MadeWithLove size="sm" />
      </div>
    </div>
  );
}
