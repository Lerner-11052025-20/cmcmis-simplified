// ============================================================================
// pages/jobRequests/components/DetailComplaintCard.jsx
// ----------------------------------------------------------------------------
// Compact accessories-only table card. Sits side-by-side with the Linked
// Job Card in the detail layout.
// ============================================================================

import { AlertCircle } from 'lucide-react';
import { SectionCard } from './detailPrimitives.jsx';

export function DetailComplaintCard({ accessories }) {
  return (
    <SectionCard
      icon={<AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" />}
      title="Accessories"
      accent="rose"
    >
      {accessories && accessories.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr className="font-medium text-slate-500">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Serial No</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accessories.map((a, i) => (
                <tr key={i} className="font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50/60">
                  <td className="px-4 py-3">{a.type}</td>
                  <td className="px-4 py-3">{a.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{a.serial_no || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-medium text-slate-500">No accessories.</div>
      )}
    </SectionCard>
  );
}
