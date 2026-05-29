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
    <div className="space-y-5">
      {/* Back-link */}
      <div>
        <Link
          to="/job-requests"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-all duration-200 group"
        >
          <ArrowLeft size={13} strokeWidth={2.5} aria-hidden="true" className="transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back to Job Requests
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/50 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_2px_8px_rgba(15,23,42,0.015)] border-l-[6px] border-l-indigo-500 hover:border-slate-200/80 transition-all duration-300">
        {/* Left: code + meta */}
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 font-sans">
            {jr.request_code}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/50 font-extrabold">
              {JOB_TYPE_LABEL[jr.job_type] || jr.job_type || '—'}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
            <span>Category: <span className="text-slate-600 font-bold">{jr.job_category || '—'}</span></span>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
            <span>Submitted: <span className="text-slate-600 font-bold">{fmt(jr.submitted_at || jr.created_at)}</span></span>
            {jr.updated_at && jr.updated_at !== jr.created_at ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                <span>Updated: <span className="text-slate-600 font-bold">{fmt(jr.updated_at)}</span></span>
              </>
            ) : null}
          </div>
        </div>

        {/* Right: status pill + Download button (Phase 11) */}
        <div className="flex flex-row md:flex-col items-center md:items-end gap-3 shrink-0">
          <StatusPill status={jr.status} />
          {canDownload ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              className="text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm"
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
