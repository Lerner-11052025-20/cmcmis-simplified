// ============================================================================
// pages/jobCards/components/DetailHeader.jsx
// ----------------------------------------------------------------------------
// Top strip of the JC detail page: back-link, JC code + Section JobNo,
// equipment summary, status pill, Download buttons.
//
// PHASE 11 UPDATE
//   The "Download Report" button (Certificate, PDF #1) is now WIRED.
//   It's enabled when:
//     - the user holds `job_card:download-certificate`, AND
//     - the JC's status ∈ { COMPLETED, VERIFIED_CLOSED }.
//   Otherwise we keep it disabled with a tooltip explaining why — the BE
//   independently re-validates (returns 409 on ineligible status, 403
//   on missing permission), so the FE gate is UX only.
//
//   The JR form button downloads the parent Job Request PDF, which routes
//   to the respective JRF template for that JR category/type.
// ============================================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileDown } from 'lucide-react';
import { toast } from 'sonner';

import { StatusPill } from '../../../components/StatusPill.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { useAuth } from '../../../lib/auth-context.jsx';
import {
  downloadJobCardCertificate,
  downloadJobRequestDetails,
  downloadTmeCalibrationCombinedCertificate,
  downloadTmeCalibrationNablCertificate,
  downloadTmeCalibrationNonNablCertificate,
  isCertificateEligible,
} from '../../../lib/api/pdf.js';

export function DetailHeader({ jc }) {
  const { user } = useAuth();
  const perms = user?.permissions || [];
  const canDownloadCert    = perms.includes('job_card:download-certificate');
  const canDownloadDetails = perms.includes('job_card:download-details');
  const parentJrNo = jc.parent_jr_no || jc.jr_no;
  const category = String(jc.job_category || jc.category || jc.jr_job_category || '').replace('&', '');
  const type = jc.work_type || jc.job_type || jc.jr_job_type;
  const isTmeCalibration = category === 'TME' && type === 'CALIBRATION';

  // Tooltip + disabled-reason logic — keep the UX explicit about WHY a
  // download is unavailable. The BE is the real gate; this is just a
  // helpful UX hint.
  const certEligible = isCertificateEligible(jc.status);
  const certDisabled = !canDownloadCert || !certEligible;
  const certTooltip = !canDownloadCert
    ? 'You do not have permission to download the certificate.'
    : !certEligible
      ? 'Certificate is available once the job card is COMPLETED or VERIFIED_CLOSED.'
      : `Download Job Card Certificate (${jc.section_job_no})`;

  // Local "busy" flag so the button shows feedback while the BE streams.
  const [busy, setBusy] = useState(null);  // cert/details/nabl/nonNabl/calCert/null

  async function onDownloadCert() {
    setBusy('cert');
    const id = toast.loading('Preparing Certificate PDF…');
    try {
      const { filename } = await downloadJobCardCertificate(jc.section_job_no);
      toast.success(`Downloaded ${filename}`, { id });
    } catch (e) {
      // pdf.js attaches the parsed JSON envelope on err.response.data.
      const msg = e.response?.data?.error?.message
              || e.message
              || 'Failed to download certificate';
      toast.error(msg, { id });
    } finally {
      setBusy(null);
    }
  }

  async function onDownloadDetails() {
    setBusy('details');
    const id = toast.loading('Preparing JR Form PDF…');
    try {
      const { filename } = await downloadJobRequestDetails(parentJrNo);
      toast.success(`Downloaded ${filename}`, { id });
    } catch (e) {
      const msg = e.response?.data?.error?.message
              || e.message
              || 'Failed to download JR form';
      toast.error(msg, { id });
    } finally {
      setBusy(null);
    }
  }

  async function onDownloadTmeCalCertificate(kind, label, downloader) {
    setBusy(kind);
    const id = toast.loading(`Preparing ${label} PDF...`);
    try {
      const { filename } = await downloader(jc.section_job_no);
      toast.success(`Downloaded ${filename}`, { id });
    } catch (e) {
      const msg = e.response?.data?.error?.message
              || e.message
              || `Failed to download ${label}`;
      toast.error(msg, { id });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <Link
        to="/job-cards"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to Job Cards
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-ink">
            Job Card: <span className="text-accent">{jc.card_code}</span>
          </h1>
          <p className="text-sm text-ink-soft">
            Section Job No: <span className="font-medium text-ink">{jc.section_job_no}</span>
            {jc.parent_jr_code ? (
              <>
                {' · '}From: <Link to={`/job-requests/${encodeURIComponent(jc.parent_jr_no)}`} className="text-accent hover:underline">
                  {jc.parent_jr_code}
                </Link>
              </>
            ) : null}
            {jc.equipment?.make ? (<> · Make: <span className="text-ink">{jc.equipment.make}</span></>) : null}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <StatusPill status={jc.status} />

          {/* ── PDF download buttons ─────────────────────────── */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isTmeCalibration ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={certDisabled || busy === 'nabl'}
                  title={certTooltip}
                  onClick={() => onDownloadTmeCalCertificate('nabl', 'NABL Certificate', downloadTmeCalibrationNablCertificate)}
                >
                  <FileDown size={14} strokeWidth={1.75} aria-hidden="true" />
                  {busy === 'nabl' ? 'Preparing...' : 'NABL Certificate'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={certDisabled || busy === 'nonNabl'}
                  title={certTooltip}
                  onClick={() => onDownloadTmeCalCertificate('nonNabl', 'Non-NABL Certificate', downloadTmeCalibrationNonNablCertificate)}
                >
                  <FileDown size={14} strokeWidth={1.75} aria-hidden="true" />
                  {busy === 'nonNabl' ? 'Preparing...' : 'Non-NABL Certificate'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={certDisabled || busy === 'calCert'}
                  title={certTooltip}
                  onClick={() => onDownloadTmeCalCertificate('calCert', 'Certificate', downloadTmeCalibrationCombinedCertificate)}
                >
                  <FileDown size={14} strokeWidth={1.75} aria-hidden="true" />
                  {busy === 'calCert' ? 'Preparing...' : 'Certificate'}
                </Button>
              </>
            ) : null}
            {canDownloadDetails ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy === 'details' || !parentJrNo}
                title={parentJrNo ? `Download JR form (${parentJrNo})` : 'No linked Job Request found for this Job Card'}
                onClick={onDownloadDetails}
              >
                <FileDown size={14} strokeWidth={1.75} aria-hidden="true" />
                {busy === 'details' ? 'Preparing…' : 'JR form'}
              </Button>
            ) : null}
            {/* Certificate/report endpoint is the canonical JobClosingForm CTA. */}
            <Button
              variant={certDisabled ? 'secondary' : 'primary'}
              size="sm"
              disabled={certDisabled || busy === 'cert'}
              title={certTooltip}
              onClick={onDownloadCert}
            >
              <FileDown size={14} strokeWidth={1.75} aria-hidden="true" />
              {busy === 'cert' ? 'Preparing…' : 'JobClosingForm'}
            </Button>
          </div>
        </div>
      </div>

      {/* Equipment summary strip */}
      <div className="bg-white border border-border rounded-lg p-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-xs text-ink-soft">Equipment Name</div>
          <div className="text-ink font-medium truncate">{jc.equipment?.name || '—'}</div>
        </div>
        <div>
          <div className="text-xs text-ink-soft">Model No.</div>
          <div className="text-ink">{jc.equipment?.model_no || '—'}</div>
        </div>
        <div>
          <div className="text-xs text-ink-soft">Serial No.</div>
          <div className="text-ink">{jc.equipment?.serial_no || '—'}</div>
        </div>
        <div>
          <div className="text-xs text-ink-soft">Assigned Engineer</div>
          <div className="text-ink">
            {jc.assigned_engineer
              ? `${jc.assigned_engineer.name} (${jc.assigned_engineer.employee_id})`
              : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
