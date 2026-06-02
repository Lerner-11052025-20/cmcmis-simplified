import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileDown, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { StatusPill } from '../../../components/StatusPill.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { useAuth } from '../../../lib/auth-context.jsx';
import { downloadJobRequestDetails } from '../../../lib/api/pdf.js';
import { formatIstTimestamp } from '../../../lib/time.js';

const JOB_TYPE_LABEL = {
  CALIBRATION: 'Calibration',
  REPAIR: 'Repair / Inspection',
  REGISTRATION: 'Registration',
};

function fmt(iso) {
  return formatIstTimestamp(iso);
}

export function DetailHeader({ jr }) {
  const { user } = useAuth();
  const canDownload = (user?.permissions || []).includes('job_request:download-details');
  const [busy, setBusy] = useState(false);

  async function onDownload() {
    setBusy(true);
    const id = toast.loading('Preparing Job Request PDF...');
    try {
      const { filename } = await downloadJobRequestDetails(jr.id || jr.jr_no);
      toast.success(`Downloaded ${filename}`, { id });
    } catch (e) {
      const msg = e.response?.data?.error?.message || e.message || 'Failed to download request PDF';
      toast.error(msg, { id });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link
        to="/job-requests"
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-card transition hover:border-indigo-200 hover:text-indigo-700 group"
      >
        <ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" className="transition-transform group-hover:-translate-x-0.5" />
        Back to Job Requests
      </Link>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
        <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
          <div className="p-6 md:p-8">
            <div className="flex items-start gap-5">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <FileText size={31} strokeWidth={2.1} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-indigo-600">Job request dossier</p>
                <h1 className="mt-1 truncate text-3xl font-semibold text-slate-950 md:text-4xl">
                  {jr.request_code}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 font-medium text-indigo-700">
                    {JOB_TYPE_LABEL[jr.job_type] || jr.job_type || '-'}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-700">
                    Category: {jr.job_category || '-'}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-700">
                    Submitted: {fmt(jr.submitted_at || jr.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <aside className="flex flex-col justify-center gap-4 border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0">
            <div>
              <p className="text-sm font-medium text-slate-500">Current status</p>
              <div className="mt-2">
                <StatusPill status={jr.status} />
              </div>
            </div>
            {jr.updated_at && jr.updated_at !== jr.created_at ? (
              <div>
                <p className="text-sm font-medium text-slate-500">Last updated date</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{fmt(jr.updated_at)}</p>
              </div>
            ) : null}
            {canDownload ? (
              <Button
                variant="secondary"
                size="md"
                disabled={busy}
                className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                title={`Download Job Request PDF (${jr.request_code})`}
                onClick={onDownload}
              >
                <FileDown size={16} strokeWidth={1.75} aria-hidden="true" />
                {busy ? 'Preparing...' : 'Download PDF'}
              </Button>
            ) : null}
          </aside>
        </div>
      </section>
    </div>
  );
}
