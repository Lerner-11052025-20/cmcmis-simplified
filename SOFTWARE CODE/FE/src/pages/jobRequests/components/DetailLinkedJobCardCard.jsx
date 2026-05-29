// ============================================================================
// pages/jobRequests/components/DetailLinkedJobCardCard.jsx
// ----------------------------------------------------------------------------
// Compact linked Job Card summary. Reduced to ~50% of previous size.
// Sits side-by-side with the Accessories card in the detail layout.
// ============================================================================

import { Link } from 'react-router-dom';
import { ClipboardList, ArrowUpRight } from 'lucide-react';
import { SectionCard } from './detailPrimitives.jsx';
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
          className="inline-flex items-center gap-1 text-[10px] text-accent hover:underline font-semibold"
        >
          Open <ArrowUpRight size={11} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      }
    >
      <div className="space-y-2 text-xs">
        {/* Row: Card ID + Status */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-sans leading-none mb-1">Card ID</div>
            <div className="text-[12px] font-semibold text-slate-700 font-sans">{linkedJobCard.section_job_no}</div>
          </div>
          <StatusPill status={linkedJobCard.status} />
        </div>

        {/* Row: Workflow */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-sans leading-none mb-1">Workflow</div>
          <div className="text-[12px] font-medium text-slate-600 font-sans">{WORKFLOW_LABEL[linkedJobCard.workflow_type] || linkedJobCard.workflow_type || '—'}</div>
        </div>

        {/* Row: Target Date + Engineer */}
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-sans leading-none mb-1">Target End</div>
            <div className="text-[12px] font-medium text-slate-600 font-sans truncate">{linkedJobCard.target_end_date || '—'}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-sans leading-none mb-1">Engineer</div>
            <div className="text-[12px] font-medium text-slate-600 font-sans truncate">
              {assignedEngineer
                ? `${assignedEngineer.name || '—'} (${assignedEngineer.employee_id})`
                : '—'}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
