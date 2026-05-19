// ============================================================================
// pages/jobRequests/components/DetailComplaintCard.jsx
// ----------------------------------------------------------------------------
// Complaint / symptoms (free text) + remarks + accessories table. The
// complaint is the single most important field for the LIC to read before
// converting, so it gets full width.
// ============================================================================

import { AlertCircle } from 'lucide-react';
import { DetailRow, SectionCard } from './detailPrimitives.jsx';

export function DetailComplaintCard({ complaint_description, remarks, accessories }) {
  return (
    <SectionCard
      icon={<AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" />}
      title="Complaint & Accessories"
    >
      <div className="space-y-3 text-sm">
        <DetailRow
          label="Complaint / Symptoms"
          value={complaint_description}
          multiline
        />
        <DetailRow
          label="Remarks"
          value={remarks}
          multiline
        />

        {/* Accessories — table only if 1+ row, else hide whole row */}
        {accessories && accessories.length > 0 ? (
          <div>
            <div className="text-xs text-ink-soft mb-1.5">
              Accessories <span className="text-ink/60">({accessories.length})</span>
            </div>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-base">
                  <tr className="text-left text-ink-soft">
                    <th className="px-3 py-1.5 font-medium">Type</th>
                    <th className="px-3 py-1.5 font-medium">Name</th>
                    <th className="px-3 py-1.5 font-medium">Serial No</th>
                  </tr>
                </thead>
                <tbody>
                  {accessories.map((a, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5 text-ink">{a.type}</td>
                      <td className="px-3 py-1.5 text-ink">{a.name}</td>
                      <td className="px-3 py-1.5 text-ink-soft">{a.serial_no || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-xs text-ink-soft italic">No accessories.</div>
        )}
      </div>
    </SectionCard>
  );
}
