// ============================================================================
// pages/jobRequests/components/DetailHeader.jsx
// ----------------------------------------------------------------------------
// Top strip of the Detail page: back-link, JR code, status pill, priority
// pill, type label, created/submitted timestamps.
//
// Pure presentation — no fetching, no state. Receives the JR detail
// payload from the orchestrator.
// ============================================================================

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { StatusPill } from '../../../components/StatusPill.jsx';
import { PriorityLabel } from '../../../components/PriorityLabel.jsx';

const JOB_TYPE_LABEL = {
  CALIBRATION:  'Calibration',
  REPAIR:       'Repair (Inspection)',
  REGISTRATION: 'Registration (Master Data)',
};

function fmt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * @param {Object} props
 * @param {Object} props.jr  Full JR detail payload from /:id endpoint
 */
export function DetailHeader({ jr }) {
  return (
    <div className="space-y-4">
      {/* Back-link */}
      <Link
        to="/job-requests"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to Job Requests
      </Link>

      <div className="flex items-start justify-between gap-4">
        {/* Left: code + meta */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold text-ink">
            {jr.request_code}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
            <span className="font-medium text-ink">
              {JOB_TYPE_LABEL[jr.job_type] || jr.job_type || '—'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Category: <span className="font-medium text-ink">{jr.job_category || '—'}</span></span>
            <span aria-hidden="true">·</span>
            <span>Submitted: <span className="font-medium text-ink">{fmt(jr.submitted_at || jr.created_at)}</span></span>
            {jr.updated_at && jr.updated_at !== jr.created_at ? (
              <>
                <span aria-hidden="true">·</span>
                <span>Updated: <span className="font-medium text-ink">{fmt(jr.updated_at)}</span></span>
              </>
            ) : null}
          </div>
        </div>

        {/* Right: status + priority pills */}
        <div className="flex flex-col items-end gap-1.5">
          <StatusPill status={jr.status} />
          <div className="text-xs text-ink-soft">
            Priority: <PriorityLabel priority={jr.priority} />
          </div>
        </div>
      </div>
    </div>
  );
}
