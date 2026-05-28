// ============================================================================
// pages/jobRequests/components/DetailHeader.jsx
// ----------------------------------------------------------------------------
// Top strip of the JR Detail page: back-link, JR code, status pill, type label,
// created/submitted timestamps.
//
// PHASE 11 UPDATE — adds "Download Request PDF" button (PDF #3).
// Gated by `job_request:download-details`. BE re-validates row-level scope
// (Normal Users see only their own JRs) and returns 404 for foreign IDs.
// ============================================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileDown } from 'lucide-react';
import { toast } from 'sonner';

import { StatusPill } from '../../../components/StatusPill.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { useAuth } from '../../../lib/auth-context.jsx';
import { downloadJobRequestDetails } from '../../../lib/api/pdf.js';

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
  const { user } = useAuth();
  const canDownload = (user?.permissions || []).includes('job_request:download-details');
  const [busy, setBusy] = useState(false);

  async function onDownload() {
    setBusy(true);
    const id = toast.loading('Preparing Job Request PDF…');
    try {
      const { filename } = await downloadJobRequestDetails(jr.id || jr.jr_no);
      toast.success(`Downloaded ${filename}`, { id });
    } catch (e) {
      const msg = e.response?.data?.error?.message
              || e.message
              || 'Failed to download request PDF';
      toast.error(msg, { id });
    } finally {
      setBusy(false);
    }
  }

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

        {/* Right: status pill + Download button (Phase 11) */}
        <div className="flex flex-col items-end gap-1.5">
          <StatusPill status={jr.status} />
          {canDownload ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              title={`Download Job Request PDF (${jr.request_code})`}
              onClick={onDownload}
            >
              <FileDown size={14} strokeWidth={1.75} aria-hidden="true" />
              {busy ? 'Preparing…' : 'Download Request PDF'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
