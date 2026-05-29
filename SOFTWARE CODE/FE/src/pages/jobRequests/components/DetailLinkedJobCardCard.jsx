// ============================================================================
// pages/jobRequests/components/DetailLinkedJobCardCard.jsx
// ----------------------------------------------------------------------------
// Only renders when the JR has a linked Job Card (JR.linked_job_card !==
// null). Shows the JC's section_job_no, status, workflow type, target end
// date, assigned engineer. Caller (the orchestrator) decides whether to
// render based on jr.linked_job_card.
//
// The /job-cards/:section_job_no detail route ships in Phase 9 — until
// then, clicking the link navigates to /job-cards (the list, which will
// show the new card at the top after a refetch).
// ============================================================================

import { Link } from 'react-router-dom';
import { ClipboardList, ArrowUpRight } from 'lucide-react';
import { SectionCard, DetailRow } from './detailPrimitives.jsx';
import { StatusPill } from '../../../components/StatusPill.jsx';

const WORKFLOW_LABEL = {
  CALIBRATION_STANDARD:     'Calibration · Standard',
  CALIBRATION_PRECISION:    'Calibration · Precision',
  INSPECTION_ROUTINE:       'Inspection · Routine',
  INSPECTION_DETAILED:      'Inspection · Detailed',
  MASTER_DATA_FIELD_UPDATE: 'Master Data · Field Update',
  MASTER_DATA_REVISION:     'Master Data · Revision',
};

export function DetailLinkedJobCardCard({ linkedJobCard, assignedEngineer }) {
  if (!linkedJobCard) return null;
  return (
    <SectionCard
      icon={<ClipboardList size={16} strokeWidth={1.75} aria-hidden="true" />}
      title="Linked Job Card"
      action={
        <Link
          to="/job-cards"
          className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
        >
          Open in Job Cards <ArrowUpRight size={12} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <DetailRow label="Card ID" value={linkedJobCard.section_job_no} />
        <div>
          <div className="text-xs text-ink-soft">Status</div>
          <div className="mt-0.5"><StatusPill status={linkedJobCard.status} /></div>
        </div>
        <DetailRow label="Workflow Type"
                   value={WORKFLOW_LABEL[linkedJobCard.workflow_type] || linkedJobCard.workflow_type} />
        <DetailRow label="Target End Date" value={linkedJobCard.target_end_date} />
        <DetailRow
          label="Assigned Engineer"
          value={assignedEngineer
            ? `${assignedEngineer.name || '—'} (${assignedEngineer.employee_id})`
            : null}
        />
      </div>
    </SectionCard>
  );
}
