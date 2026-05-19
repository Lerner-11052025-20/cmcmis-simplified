// ============================================================================
// pages/jobCards/components/DetailHeader.jsx
// ----------------------------------------------------------------------------
// Top strip of the JC detail page: back-link, JC code + Section JobNo,
// equipment summary, status pill + priority pill, Update-Status / PDF
// buttons (PDF is Phase 11 — disabled here).
//
// Matches image-19 / 20.
// ============================================================================

import { Link } from 'react-router-dom';
import { ArrowLeft, FileDown } from 'lucide-react';
import { StatusPill } from '../../../components/StatusPill.jsx';
import { PriorityLabel } from '../../../components/PriorityLabel.jsx';
import { Button } from '../../../components/ui/Button.jsx';

export function DetailHeader({ jc }) {
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
          <div className="text-xs text-ink-soft">
            Priority: <PriorityLabel priority={jc.priority} />
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled
            title="PDF generation ships in Phase 11"
          >
            <FileDown size={14} strokeWidth={1.75} aria-hidden="true" />
            Download Report
          </Button>
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
