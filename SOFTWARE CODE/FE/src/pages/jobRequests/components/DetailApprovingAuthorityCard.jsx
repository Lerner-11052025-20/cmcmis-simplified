// ============================================================================
// pages/jobRequests/components/DetailApprovingAuthorityCard.jsx
// ----------------------------------------------------------------------------
// Approving authority details retrieved from employee_sso_directory.
// ============================================================================

import { ShieldCheck } from 'lucide-react';
import { DetailRow, SectionCard } from './detailPrimitives.jsx';

export function DetailApprovingAuthorityCard({ approvingAuthority }) {
  if (!approvingAuthority) return null;

  return (
    <SectionCard
      icon={<ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" />}
      title="Approving Authority"
      accent="indigo"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <DetailRow label="Approving Authority"
                   value={approvingAuthority.name
                            ? `${approvingAuthority.name} (${approvingAuthority.employee_id})`
                            : approvingAuthority.employee_id} />
        <DetailRow label="Designation" value={approvingAuthority.designation} />
        <DetailRow label="Email"       value={approvingAuthority.email} />
        <DetailRow label="EGD Name"    value={approvingAuthority.egd_name} />
        <DetailRow label="Telephone"   value={approvingAuthority.telephone} />
        <DetailRow label="Lab Phone"   value={approvingAuthority.lab_telephone} />
      </div>
    </SectionCard>
  );
}
