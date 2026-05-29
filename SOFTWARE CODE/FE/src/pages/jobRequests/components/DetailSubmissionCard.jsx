// ============================================================================
// pages/jobRequests/components/DetailSubmissionCard.jsx
// ----------------------------------------------------------------------------
// Submitter identity + division. Mirrors the layout of DetailEquipmentCard
// (two-column grid) so the page reads as a tabular brief at a glance.
// ============================================================================

import { User } from 'lucide-react';
import { DetailRow, SectionCard } from './detailPrimitives.jsx';

export function DetailSubmissionCard({ submitter, division, project_name, subsystem }) {
  return (
    <SectionCard
      icon={<User size={16} strokeWidth={1.75} aria-hidden="true" />}
      title="Submission & Division"
      accent="emerald"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <DetailRow label="Submitted by"
                   value={submitter.name
                            ? `${submitter.name} (${submitter.employee_id})`
                            : submitter.employee_id} />
        <DetailRow label="Designation" value={submitter.designation} />
        <DetailRow label="Email"       value={submitter.email} />
        <DetailRow label="Lab phone"   value={submitter.lab_phone} />
        <DetailRow label="Room phone"  value={submitter.room_phone} />
        <DetailRow label="Division"
                   value={division.code
                            ? `${division.code} — ${division.name || ''}`.trim().replace(/—\s*$/, '')
                            : division.name} />
        <DetailRow label="Project"     value={project_name} />
        <DetailRow label="Subsystem"   value={subsystem} />
      </div>
    </SectionCard>
  );
}
