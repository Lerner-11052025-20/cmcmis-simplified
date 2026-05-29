// ============================================================================
// pages/jobRequests/components/DetailEquipmentCard.jsx
// ----------------------------------------------------------------------------
// Equipment block — name, make, model, serial, type, options description.
// Two-column grid; rows that have no value render an em-dash so the layout
// doesn't shift between JRs that have and don't have a given field.
// ============================================================================

import { Wrench } from 'lucide-react';
import { DetailRow, SectionCard } from './detailPrimitives.jsx';

export function DetailEquipmentCard({ equipment }) {
  return (
    <SectionCard
      icon={<Wrench size={16} strokeWidth={1.75} aria-hidden="true" />}
      title="Equipment"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <DetailRow label="Name"     value={equipment.name} />
        <DetailRow label="Make"     value={equipment.make} />
        <DetailRow label="Model No" value={equipment.model_no} />
        <DetailRow label="Serial No" value={equipment.serial_no} />
        <DetailRow label="Type"     value={equipment.type} />
        <DetailRow label="Sent after repair?"
                   value={equipment.sent_after_repair ? 'Yes' : 'No'} />
      </div>
      {equipment.options_description ? (
        <div className="mt-3">
          <DetailRow label="Options / Description" value={equipment.options_description} multiline />
        </div>
      ) : null}
    </SectionCard>
  );
}
