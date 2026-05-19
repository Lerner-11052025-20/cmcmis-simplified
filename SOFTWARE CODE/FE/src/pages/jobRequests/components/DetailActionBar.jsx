// ============================================================================
// pages/jobRequests/components/DetailActionBar.jsx
// ----------------------------------------------------------------------------
// Sticky bottom action bar — renders the buttons available to the current
// user for the JR's current status. Permission AND state gates here are
// MIRROR of the BE state machine (defence in depth — the BE will reject
// any forbidden action anyway, but hiding the button keeps the UI honest).
//
// Slice 2 buttons:
//   • SUBMITTED + has approve+assign perms → "Convert" button (opens modal)
//   • SUBMITTED + has reject perm           → "Reject" button (opens modal)
//   • Any other status                       → "View only" hint
//
// Slice 3+ will add re-open, edit, etc.
// ============================================================================

import { CheckCircle2, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { useAuth } from '../../../lib/auth-context.jsx';

export function DetailActionBar({ jr, onConvertClick, onRejectClick }) {
  const { hasPermission } = useAuth();
  const canApprove  = hasPermission('job_request:approve');
  const canAssign   = hasPermission('job_request:assign-engineer');
  const canReject   = hasPermission('job_request:reject');
  const canConvert  = canApprove && canAssign;

  // Only SUBMITTED can be converted / rejected in Slice 2.
  const isSubmitted = jr.status === 'SUBMITTED';

  // Convert pre-check: the JR must have a concrete equipment_id, otherwise
  // the BE will reject with EQUIPMENT_REQUIRED (the legacy JC schema's
  // JM_EQM_ID is NOT NULL). Surface this BEFORE the user opens the modal.
  const hasEquipmentRef = !!jr.equipment?.id;
  const blockingReason = !hasEquipmentRef
    ? 'This Job Request has no equipment selected. The submitter must pick one from the typeahead before it can be converted.'
    : null;

  if (!isSubmitted || (!canConvert && !canReject)) {
    return (
      <div className="bg-base-elev border border-border rounded-lg p-3 text-center text-xs text-ink-soft">
        {jr.status === 'REJECTED' ? (
          <>This request was <span className="font-medium text-ink">rejected</span>{jr.rejection_reason ? ` — "${jr.rejection_reason}"` : ''}. Submit a new request to retry.</>
        ) : jr.status === 'ASSIGNED' ? (
          <>This request has been converted to a Job Card. The engineer can now start work.</>
        ) : jr.status === 'DRAFT' ? (
          <>This request is still a draft. The submitter must submit it before any action can be taken.</>
        ) : (
          <>No actions available at this status.</>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 sticky bottom-2">
      {blockingReason ? (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-start gap-2">
          <AlertTriangle size={14} strokeWidth={1.75} aria-hidden="true" className="text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-ink">
            <span className="font-semibold text-amber-700">Cannot convert yet.</span>{' '}
            {blockingReason}
          </div>
        </div>
      ) : null}
      <div className="bg-base-elev border border-border rounded-lg p-3 flex items-center justify-between gap-3">
        <div className="text-xs text-ink-soft">
          <RefreshCw size={12} strokeWidth={1.75} aria-hidden="true" className="inline mr-1" />
          Pending review — choose an action below.
        </div>
        <div className="flex items-center gap-2">
          {canReject ? (
            <Button variant="secondary" size="md" onClick={onRejectClick}>
              <XCircle size={16} strokeWidth={1.75} aria-hidden="true" className="text-danger" />
              Reject
            </Button>
          ) : null}
          {canConvert ? (
            <Button
              variant="primary"
              size="md"
              onClick={onConvertClick}
              disabled={!hasEquipmentRef}
              title={blockingReason || undefined}
            >
              <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />
              Convert to Job Card
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
