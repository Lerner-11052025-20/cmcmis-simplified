// ============================================================================
// pages/jobRequests/components/DetailLinkedJobCardCard.jsx
// ----------------------------------------------------------------------------
// Compact linked Job Card summary. Reduced to ~50% of previous size.
// Sits side-by-side with the Accessories card in the detail layout.
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
      accent="indigo"
      action={
        <Link
          to="/job-cards"
          className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-bold transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-accent/20 rounded px-1"
        >
          Open <ArrowUpRight size={13} strokeWidth={2.2} aria-hidden="true" />
        </Link>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {/* Row: Card ID + Status */}
        <div className="flex items-center justify-between gap-3 col-span-1 sm:col-span-2 border-b border-slate-100/50 pb-2">
          <div className="flex-1">
            <DetailRow label="Card ID" value={linkedJobCard.section_job_no} />
          </div>
          <div className="pt-2 shrink-0">
            <StatusPill status={linkedJobCard.status} />
          </div>
        </div>

        {/* Row: Workflow */}
        <div className="col-span-1 sm:col-span-2">
          <DetailRow label="Workflow" value={WORKFLOW_LABEL[linkedJobCard.workflow_type] || linkedJobCard.workflow_type} />
        </div>

        {/* Row: Target Date + Engineer */}
        <DetailRow label="Target End" value={linkedJobCard.target_end_date} />
        <DetailRow 
          label="Engineer" 
          value={assignedEngineer
            ? `${assignedEngineer.name || '—'} (${assignedEngineer.employee_id})`
            : null} 
        />
      </div>
    </SectionCard>
  );
}
